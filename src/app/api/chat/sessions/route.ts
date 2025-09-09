import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { successResponse, errorResponse, ApiError, ErrorCodes } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { checkRateLimit } from '@/middleware/rateLimiter';

// GET /api/chat/sessions - 모든 채팅 세션 가져오기 또는 특정 세션 가져오기
export async function GET(request: NextRequest) {
  try {
    // Rate limiting (일반 API)
    const rateLimitResponse = await checkRateLimit(request, 'general');
    if (rateLimitResponse) return rateLimitResponse;
    
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
            logger.debug('Auto-detected Google user ID from token', { userId });
          }
        }
      } catch (error) {
        logger.error('Failed to get user ID from Google token', error);
      }
    }

    // 특정 세션 가져오기
    if (sessionId) {
      logger.debug('Fetching specific session', { sessionId, userId });
      
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
        logger.error('Error fetching session', error, { sessionId });
        
        if (error.code === 'PGRST116') {
          throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Session not found');
        }
        
        throw new ApiError(500, ErrorCodes.INTERNAL_ERROR, 'Failed to fetch session');
      }

      if (!session) {
        throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Session not found');
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

      return successResponse(transformedSession);
    }

    // 모든 세션 가져오기
    logger.debug('Fetching all chat sessions', { userId, limit, offset });

    // 사용자별 필터링 필수 - 보안 및 프라이버시를 위해
    // userId가 없으면 빈 배열 반환
    if (!userId) {
      logger.info('No user ID provided, returning empty sessions for privacy');
      return successResponse({
        sessions: [],
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
      logger.error('Error fetching sessions', error);
      throw new ApiError(500, ErrorCodes.INTERNAL_ERROR, 'Failed to fetch sessions');
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

    return successResponse({
      sessions: transformedSessions,
      count: transformedSessions.length
    });

  } catch (error) {
    if (error instanceof ApiError) {
      return errorResponse(error);
    }
    
    logger.error('Sessions API error', error);
    return errorResponse(
      new ApiError(500, ErrorCodes.INTERNAL_ERROR, 'An unexpected error occurred')
    );
  }
}

// POST /api/chat/sessions - 새로운 채팅 세션 생성
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResponse = await checkRateLimit(request, 'general');
    if (rateLimitResponse) return rateLimitResponse;
    
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
            logger.debug('Auto-detected Google user ID for new session', { userId });
          }
        }
      } catch (error) {
        logger.error('Failed to get user ID from Google token', error);
      }
    }

    logger.info('Creating new chat session', { title, userId });

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
      logger.error('Error creating session', error);
      throw new ApiError(500, ErrorCodes.INTERNAL_ERROR, 'Failed to create session');
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

    return successResponse(transformedSession, 201);

  } catch (error) {
    if (error instanceof ApiError) {
      return errorResponse(error);
    }
    
    logger.error('Create session error', error);
    return errorResponse(
      new ApiError(500, ErrorCodes.INTERNAL_ERROR, 'An unexpected error occurred')
    );
  }
}

// PUT /api/chat/sessions - 채팅 세션 업데이트
export async function PUT(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResponse = await checkRateLimit(request, 'general');
    if (rateLimitResponse) return rateLimitResponse;
    
    const body = await request.json();
    const { sessionId, title, metadata, isActive } = body;

    if (!sessionId) {
      throw new ApiError(400, ErrorCodes.MISSING_FIELD, 'sessionId is required');
    }

    logger.info('Updating chat session', { sessionId, title, isActive });

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
      logger.error('Error updating session', error);
      
      if (error.code === 'PGRST116') {
        throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Session not found');
      }
      
      throw new ApiError(500, ErrorCodes.INTERNAL_ERROR, 'Failed to update session');
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

    return successResponse(transformedSession);

  } catch (error) {
    if (error instanceof ApiError) {
      return errorResponse(error);
    }
    
    logger.error('Update session error', error);
    return errorResponse(
      new ApiError(500, ErrorCodes.INTERNAL_ERROR, 'An unexpected error occurred')
    );
  }
}

// DELETE /api/chat/sessions - 채팅 세션 삭제
export async function DELETE(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResponse = await checkRateLimit(request, 'general');
    if (rateLimitResponse) return rateLimitResponse;
    
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      throw new ApiError(400, ErrorCodes.MISSING_FIELD, 'sessionId is required');
    }

    logger.info('Deleting chat session', { sessionId });

    // 세션이 존재하는지 확인
    const { data: existingSession, error: checkError } = await supabaseAdmin
      .from('chat_sessions')
      .select('id')
      .eq('id', sessionId)
      .single();

    if (checkError || !existingSession) {
      throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Session not found');
    }

    // 세션 삭제 (CASCADE로 인해 메시지들도 자동 삭제)
    const { error } = await supabaseAdmin
      .from('chat_sessions')
      .delete()
      .eq('id', sessionId);

    if (error) {
      logger.error('Error deleting session', error);
      throw new ApiError(500, ErrorCodes.INTERNAL_ERROR, 'Failed to delete session');
    }

    return successResponse({ message: 'Session deleted successfully' });

  } catch (error) {
    if (error instanceof ApiError) {
      return errorResponse(error);
    }
    
    logger.error('Delete session error', error);
    return errorResponse(
      new ApiError(500, ErrorCodes.INTERNAL_ERROR, 'An unexpected error occurred')
    );
  }
}