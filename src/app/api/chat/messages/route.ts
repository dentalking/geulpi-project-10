import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/chat/messages - 특정 세션의 메시지들 가져오기
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const order = searchParams.get('order') || 'asc'; // asc: 오래된 메시지부터, desc: 최신 메시지부터

    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: 'sessionId is required'
      }, { status: 400 });
    }

    console.log('Fetching messages for session:', { sessionId, limit, offset, order });

    const { data: messages, error } = await supabaseAdmin
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: order === 'asc' })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching messages:', error);
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }

    // TypeScript 타입 호환을 위한 변환
    const transformedMessages = messages?.map(msg => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      timestamp: new Date(msg.created_at),
      type: msg.message_type,
      data: msg.data,
      metadata: msg.metadata
    })) || [];

    return NextResponse.json({
      success: true,
      data: transformedMessages,
      count: transformedMessages.length,
      sessionId
    });

  } catch (error: any) {
    console.error('Messages API error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// POST /api/chat/messages - 새로운 메시지 추가
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, role, content, messageType = 'text', data = {}, metadata = {} } = body;

    if (!sessionId || !role || !content) {
      return NextResponse.json({
        success: false,
        error: 'sessionId, role, and content are required'
      }, { status: 400 });
    }

    if (!['user', 'assistant', 'system'].includes(role)) {
      return NextResponse.json({
        success: false,
        error: 'role must be one of: user, assistant, system'
      }, { status: 400 });
    }

    console.log('Adding new message:', { sessionId, role, contentLength: content.length, messageType });

    // 세션이 존재하는지 확인
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('chat_sessions')
      .select('id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({
        success: false,
        error: 'Session not found'
      }, { status: 404 });
    }

    // 고유한 메시지 ID 생성
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const { data: message, error } = await supabaseAdmin
      .from('chat_messages')
      .insert({
        id: messageId,
        session_id: sessionId,
        role,
        content,
        message_type: messageType,
        data,
        metadata
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating message:', error);
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }

    const transformedMessage = {
      id: message.id,
      role: message.role,
      content: message.content,
      timestamp: new Date(message.created_at),
      type: message.message_type,
      data: message.data,
      metadata: message.metadata
    };

    return NextResponse.json({
      success: true,
      data: transformedMessage
    });

  } catch (error: any) {
    console.error('Create message error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}