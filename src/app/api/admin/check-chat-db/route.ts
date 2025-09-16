import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export async function GET() {
  try {
    console.log('Checking chat database tables...');

    const results = {
      chat_sessions: { exists: false, count: 0, error: null as string | null },
      chat_messages: { exists: false, count: 0, error: null as string | null }
    };

    // chat_sessions 테이블 확인
    try {
      const { data: sessions, error: sessionsError, count } = await supabase
        .from('chat_sessions')
        .select('*', { count: 'exact', head: true });

      if (sessionsError) {
        results.chat_sessions.error = sessionsError.message;
      } else {
        results.chat_sessions.exists = true;
        results.chat_sessions.count = count || 0;
      }
    } catch (error: any) {
      results.chat_sessions.error = error.message;
    }

    // chat_messages 테이블 확인
    try {
      const { data: messages, error: messagesError, count } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true });

      if (messagesError) {
        results.chat_messages.error = messagesError.message;
      } else {
        results.chat_messages.exists = true;
        results.chat_messages.count = count || 0;
      }
    } catch (error: any) {
      results.chat_messages.error = error.message;
    }

    const allTablesExist = results.chat_sessions.exists && results.chat_messages.exists;

    return NextResponse.json({
      success: allTablesExist,
      message: allTablesExist ? 
        'All chat tables exist and are accessible' : 
        'Some tables are missing or inaccessible',
      tables: results,
      nextSteps: !allTablesExist ? [
        '1. Go to Supabase dashboard: https://supabase.com/dashboard',
        '2. Navigate to SQL Editor',
        '3. Copy and paste the content from CHAT_SCHEMA.sql',
        '4. Execute the script to create missing tables'
      ] : [
        'Database is ready! You can now proceed with the chat API implementation.'
      ]
    });

  } catch (error: any) {
    console.error('Database check error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      message: 'Failed to check database tables'
    }, { status: 500 });
  }
}