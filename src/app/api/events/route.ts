import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Helper to get user ID from request
function getUserIdFromRequest(request: NextRequest): string | null {
  const authToken = request.cookies.get('auth-token')?.value;

  if (!authToken) {
    return null;
  }

  try {
    const decoded = jwt.verify(authToken, JWT_SECRET) as any;
    return decoded.userId;
  } catch {
    return null;
  }
}

// GET all events for a user
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');
    const category = searchParams.get('category');

    let query = supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', userId)
      .order('start_time', { ascending: true });

    if (startDate) {
      query = query.gte('start_time', startDate);
    }
    if (endDate) {
      query = query.lte('start_time', endDate);
    }
    if (category) {
      query = query.eq('category', category);
    }

    const { data: events, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      events: events || []
    });
  } catch (error: any) {
    console.error('Get events error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

// POST create a new event
export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      summary,
      description,
      location,
      startTime,
      endTime,
      isAllDay,
      category,
      reminders,
      recurrence
    } = body;

    if (!summary || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Summary, start time, and end time are required' },
        { status: 400 }
      );
    }

    const { data: event, error } = await supabase
      .from('calendar_events')
      .insert({
        user_id: userId,
        summary,
        description,
        location,
        start_time: startTime,
        end_time: endTime,
        is_all_day: isAllDay || false,
        category,
        reminders,
        recurrence,
        source: 'local',
        metadata: {
          createdVia: 'web',
          createdAt: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      event
    });
  } catch (error: any) {
    console.error('Create event error:', error);
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    );
  }
}

// PUT update an event
export async function PUT(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }

    // Check if user owns the event
    const { data: existingEvent } = await supabase
      .from('calendar_events')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!existingEvent || existingEvent.user_id !== userId) {
      return NextResponse.json(
        { error: 'Event not found or access denied' },
        { status: 404 }
      );
    }

    const { data: event, error } = await supabase
      .from('calendar_events')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      event
    });
  } catch (error: any) {
    console.error('Update event error:', error);
    return NextResponse.json(
      { error: 'Failed to update event' },
      { status: 500 }
    );
  }
}

// DELETE an event
export async function DELETE(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }

    // Check if user owns the event
    const { data: existingEvent } = await supabase
      .from('calendar_events')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!existingEvent || existingEvent.user_id !== userId) {
      return NextResponse.json(
        { error: 'Event not found or access denied' },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error: any) {
    console.error('Delete event error:', error);
    return NextResponse.json(
      { error: 'Failed to delete event' },
      { status: 500 }
    );
  }
}