import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/chat/sessions - 모든 채팅 세션 가져오기 또는 특정 세션 가져오기
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    let userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    // 현재 로그인한 사용자의 ID 자동 추출 (Google OAuth 토큰에서)
    if (!userId) {
      try {
        const { cookies } = await import('next/headers');
        const cookieStore = cookies();
        const accessToken = cookieStore.get('access_token')?.value;
        
        if (accessToken) {
          // Google OAuth userinfo API 호출
          const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          });
          
          if (userInfoResponse.ok) {
            const userInfo = await userInfoResponse.json();
            userId = userInfo.id; // Google user ID 사용
            console.log('Auto-detected Google user ID from token:', userId);
          }
        }
      } catch (error) {
        console.error('Failed to get user ID from Google token:', error);
      }
    }

    // 특정 세션 가져오기
    if (sessionId) {
      console.log('Fetching specific session:', sessionId, 'for user:', userId);
      
      let query = supabaseAdmin
        .from('chat_sessions')
        .select(`
          *,
          chat_messages (
            id,
            role,
            content,
            message_type,
            created_at,
            data,
            metadata
          )
        `)
        .eq('id', sessionId);
      
      // user_id가 있으면 해당 사용자의 세션인지 확인
      if (userId) {
        query = query.eq('user_id', userId);
      }
      
      const { data: session, error } = await query.single();

      if (error) {
        console.error('Error fetching session:', error);
        return NextResponse.json({
          success: false,
          error: error.message,
          code: error.code
        }, { status: error.code === 'PGRST116' ? 404 : 500 });
      }

      if (!session) {
        return NextResponse.json({
          success: false,
          error: 'Session not found'
        }, { status: 404 });
      }

      // Transform the session
      const transformedSession = {
        id: session.id,
        title: session.title,
        createdAt: new Date(session.created_at),
        updatedAt: new Date(session.updated_at),
        userId: session.user_id,
        isActive: session.is_active || false,
        metadata: session.metadata || {},
        messages: session.chat_messages?.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.created_at),
          type: msg.message_type,
          data: msg.data,
          metadata: msg.metadata
        })).sort((a: any, b: any) => a.timestamp.getTime() - b.timestamp.getTime()) || []
      };

      return NextResponse.json({
        success: true,
        data: transformedSession
      });
    }

    // 모든 세션 가져오기
    console.log('Fetching all chat sessions:', { userId, limit, offset });

    // 사용자별 필터링 필수 - 보안 및 프라이버시를 위해
    // userId가 없으면 빈 배열 반환
    if (!userId) {
      console.log('No user ID provided, returning empty sessions for privacy');
      return NextResponse.json({
        success: true,
        data: [],
        count: 0
      });
    }

    let query = supabaseAdmin
      .from('chat_sessions')
      .select(`
        *,
        chat_messages (
          id,
          role,
          content,
          message_type,
          created_at,
          data,
          metadata
        )
      `)
      .eq('user_id', userId) // 항상 user_id로 필터링
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: sessions, error } = await query;

    if (error) {
      console.error('Error fetching sessions:', error);
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }

    // TypeScript 타입 호환을 위한 변환
    const transformedSessions = sessions?.map((session: any) => ({
      id: session.id,
      title: session.title,
      createdAt: new Date(session.created_at),
      updatedAt: new Date(session.updated_at),
      userId: session.user_id,
      isActive: session.is_active || false,
      metadata: session.metadata || {},
      messages: session.chat_messages?.map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.created_at),
        type: msg.message_type,
        data: msg.data,
        metadata: msg.metadata
      })) || []
    })) || [];

    return NextResponse.json({
      success: true,
      data: transformedSessions,
      count: transformedSessions.length
    });

  } catch (error: any) {
    console.error('Sessions API error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// POST /api/chat/sessions - 새로운 채팅 세션 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { title = '새 채팅', userId, metadata = {} } = body;

    // 현재 로그인한 사용자의 ID 자동 추출 (Google OAuth 토큰에서)
    if (!userId) {
      try {
        const { cookies } = await import('next/headers');
        const cookieStore = cookies();
        const accessToken = cookieStore.get('access_token')?.value;
        
        if (accessToken) {
          // Google OAuth userinfo API 호출
          const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          });
          
          if (userInfoResponse.ok) {
            const userInfo = await userInfoResponse.json();
            userId = userInfo.id; // Google user ID 사용
            console.log('Auto-detected Google user ID for new session:', userId);
          }
        }
      } catch (error) {
        console.error('Failed to get user ID from Google token:', error);
      }
    }

    console.log('Creating new chat session:', { title, userId, metadata });

    // UUID는 데이터베이스에서 자동 생성되므로 id를 지정하지 않음
    const { data: session, error } = await supabaseAdmin
      .from('chat_sessions')
      .insert({
        user_id: userId || null,
        title,
        metadata
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating session:', error);
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }

    const transformedSession = {
      id: session.id,
      title: session.title,
      createdAt: new Date(session.created_at),
      updatedAt: new Date(session.updated_at),
      userId: session.user_id,
      isActive: session.is_active || false,
      metadata: session.metadata || {},
      messages: []
    };

    return NextResponse.json({
      success: true,
      data: transformedSession
    });

  } catch (error: any) {
    console.error('Create session error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// PUT /api/chat/sessions - 채팅 세션 업데이트
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, title, metadata, isActive } = body;

    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: 'sessionId is required'
      }, { status: 400 });
    }

    console.log('Updating chat session:', { sessionId, title, isActive });

    // 업데이트할 필드들만 포함
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (metadata !== undefined) updateData.metadata = metadata;
    if (isActive !== undefined) updateData.is_active = isActive;

    const { data: session, error } = await supabaseAdmin
      .from('chat_sessions')
      .update(updateData)
      .eq('id', sessionId)
      .select(`
        *,
        chat_messages (
          id,
          role,
          content,
          message_type,
          created_at,
          data,
          metadata
        )
      `)
      .single();

    if (error) {
      console.error('Error updating session:', error);
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: error.code === 'PGRST116' ? 404 : 500 });
    }

    const transformedSession = {
      id: session.id,
      title: session.title,
      createdAt: new Date(session.created_at),
      updatedAt: new Date(session.updated_at),
      userId: session.user_id,
      isActive: session.is_active || false,
      metadata: session.metadata || {},
      messages: session.chat_messages?.map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.created_at),
        type: msg.message_type,
        data: msg.data,
        metadata: msg.metadata
      })) || []
    };

    return NextResponse.json({
      success: true,
      data: transformedSession
    });

  } catch (error: any) {
    console.error('Update session error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// DELETE /api/chat/sessions - 채팅 세션 삭제
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: 'sessionId is required'
      }, { status: 400 });
    }

    console.log('Deleting chat session:', sessionId);

    // 세션이 존재하는지 확인
    const { data: existingSession, error: checkError } = await supabaseAdmin
      .from('chat_sessions')
      .select('id')
      .eq('id', sessionId)
      .single();

    if (checkError || !existingSession) {
      return NextResponse.json({
        success: false,
        error: 'Session not found'
      }, { status: 404 });
    }

    // 세션 삭제 (CASCADE로 인해 메시지들도 자동 삭제)
    const { error } = await supabaseAdmin
      .from('chat_sessions')
      .delete()
      .eq('id', sessionId);

    if (error) {
      console.error('Error deleting session:', error);
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Session deleted successfully'
    });

  } catch (error: any) {
    console.error('Delete session error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}