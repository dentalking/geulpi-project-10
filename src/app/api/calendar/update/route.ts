import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getCalendarClient } from '@/lib/google-auth';

export async function PUT(request: Request) {
  const accessToken = cookies().get('access_token')?.value;
  
  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { eventId, updates } = await request.json();
    const calendar = getCalendarClient(accessToken);
    
    // 기존 이벤트 가져오기
    const existing = await calendar.events.get({
      calendarId: 'primary',
      eventId: eventId,
    });

    // 업데이트할 필드만 덮어쓰기
    const updatedEvent = {
      ...existing.data,
      ...updates,
    };

    const response = await calendar.events.update({
      calendarId: 'primary',
      eventId: eventId,
      requestBody: updatedEvent,
    });

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Failed to update event:', error);
    return NextResponse.json({ 
      error: 'Failed to update event',
      message: error.message 
    }, { status: 500 });
  }
}
