import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

interface RouteParams {
  params: {
    messageId: string;
  };
}

// GET /api/chat/messages/[messageId] - 특정 메시지 가져오기
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { messageId } = params;

    console.log('Fetching message:', messageId);

    const { data: message, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('id', messageId)
      .single();

    if (error) {
      console.error('Error fetching message:', error);
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: error.code === 'PGRST116' ? 404 : 500 });
    }

    const transformedMessage = {
      id: message.id,
      role: message.role,
      content: message.content,
      timestamp: new Date(message.created_at),
      type: message.message_type,
      data: message.data,
      metadata: message.metadata,
      sessionId: message.session_id
    };

    return NextResponse.json({
      success: true,
      data: transformedMessage
    });

  } catch (error: any) {
    console.error('Get message error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// PUT /api/chat/messages/[messageId] - 메시지 업데이트
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { messageId } = params;
    const body = await request.json();
    const { content, messageType, data, metadata } = body;

    if (!content && !messageType && !data && !metadata) {
      return NextResponse.json({
        success: false,
        error: 'At least one field (content, messageType, data, metadata) is required for update'
      }, { status: 400 });
    }

    console.log('Updating message:', messageId);

    // 업데이트할 필드들만 포함
    const updateData: any = {};
    if (content !== undefined) updateData.content = content;
    if (messageType !== undefined) updateData.message_type = messageType;
    if (data !== undefined) updateData.data = data;
    if (metadata !== undefined) updateData.metadata = metadata;

    const { data: message, error } = await supabase
      .from('chat_messages')
      .update(updateData)
      .eq('id', messageId)
      .select()
      .single();

    if (error) {
      console.error('Error updating message:', error);
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: error.code === 'PGRST116' ? 404 : 500 });
    }

    const transformedMessage = {
      id: message.id,
      role: message.role,
      content: message.content,
      timestamp: new Date(message.created_at),
      type: message.message_type,
      data: message.data,
      metadata: message.metadata,
      sessionId: message.session_id
    };

    return NextResponse.json({
      success: true,
      data: transformedMessage
    });

  } catch (error: any) {
    console.error('Update message error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// DELETE /api/chat/messages/[messageId] - 메시지 삭제
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { messageId } = params;

    console.log('Deleting message:', messageId);

    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .eq('id', messageId);

    if (error) {
      console.error('Error deleting message:', error);
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: error.code === 'PGRST116' ? 404 : 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Message deleted successfully'
    });

  } catch (error: any) {
    console.error('Delete message error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}