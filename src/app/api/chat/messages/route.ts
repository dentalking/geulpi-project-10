import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { successResponse, errorResponse, ApiError, ErrorCodes } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { checkRateLimit } from '@/middleware/rateLimiter';

// GET /api/chat/messages - 특정 세션의 메시지들 가져오기
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResponse = await checkRateLimit(request, 'general');
    if (rateLimitResponse) return rateLimitResponse;
    
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const order = searchParams.get('order') || 'asc'; // asc: 오래된 메시지부터, desc: 최신 메시지부터

    if (!sessionId) {
      throw new ApiError(
        400, 
        ErrorCodes.MISSING_FIELD, 
        'sessionId is required'
      );
    }

    logger.info('Fetching messages for session', { sessionId, limit, offset, order });

    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: order === 'asc' })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('Error fetching messages', error, { sessionId });
      throw new ApiError(
        500,
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch messages'
      );
    }

    // TypeScript 타입 호환을 위한 변환
    const transformedMessages = messages?.map((msg: any) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      timestamp: new Date(msg.created_at),
      type: msg.message_type,
      data: msg.data,
      metadata: msg.metadata
    })) || [];

    logger.debug('Messages fetched successfully', { 
      sessionId, 
      messageCount: transformedMessages.length 
    });

    return successResponse({
      messages: transformedMessages,
      count: transformedMessages.length,
      sessionId
    });

  } catch (error) {
    if (error instanceof ApiError) {
      return errorResponse(error);
    }
    
    logger.error('Messages API error', error);
    return errorResponse(
      new ApiError(500, ErrorCodes.INTERNAL_ERROR, 'An unexpected error occurred')
    );
  }
}

// POST /api/chat/messages - 새로운 메시지 추가
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResponse = await checkRateLimit(request, 'general');
    if (rateLimitResponse) return rateLimitResponse;
    
    const body = await request.json();
    const { sessionId, role, content, messageType = 'text', data = {}, metadata = {} } = body;

    // Validation
    if (!sessionId) {
      throw new ApiError(
        400,
        ErrorCodes.MISSING_FIELD,
        'sessionId is required'
      );
    }
    
    if (!role) {
      throw new ApiError(
        400,
        ErrorCodes.MISSING_FIELD,
        'role is required'
      );
    }
    
    if (!content) {
      throw new ApiError(
        400,
        ErrorCodes.MISSING_FIELD,
        'content is required'
      );
    }

    if (!['user', 'assistant', 'system'].includes(role)) {
      throw new ApiError(
        400,
        ErrorCodes.INVALID_INPUT,
        'role must be one of: user, assistant, system'
      );
    }

    logger.info('Adding new message', { 
      sessionId, 
      role, 
      contentLength: content.length, 
      messageType 
    });

    // 세션이 존재하는지 확인
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      logger.warn('Session not found', { sessionId });
      throw new ApiError(
        404,
        ErrorCodes.NOT_FOUND,
        'Session not found'
      );
    }

    // UUID는 데이터베이스에서 자동 생성
    const { data: message, error } = await supabase
      .from('chat_messages')
      .insert({
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
      logger.error('Error creating message', error, { sessionId, role });
      throw new ApiError(
        500,
        ErrorCodes.INTERNAL_ERROR,
        'Failed to create message'
      );
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

    logger.info('Message created successfully', { 
      messageId: message.id, 
      sessionId 
    });

    return successResponse(transformedMessage, 201);

  } catch (error) {
    if (error instanceof ApiError) {
      return errorResponse(error);
    }
    
    logger.error('Create message error', error);
    return errorResponse(
      new ApiError(500, ErrorCodes.INTERNAL_ERROR, 'An unexpected error occurred')
    );
  }
}