import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getCalendarClient } from '@/lib/google-auth';

export async function DELETE(request: Request) {
  const accessToken = cookies().get('access_token')?.value;
  
  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { eventId } = await request.json();
    
    const calendar = getCalendarClient(accessToken);
    
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete event:', error);
    return NextResponse.json({ 
      error: 'Failed to delete event',
      message: error.message 
    }, { status: 500 });
  }
}
