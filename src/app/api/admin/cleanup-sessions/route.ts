import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

// GET /api/admin/cleanup-sessions - user_id가 없는 세션들 확인 및 정리
export async function GET() {
  try {
    console.log('Checking for orphaned chat sessions...');
    
    // user_id가 null인 세션들 조회
    const { data: orphanedSessions, error: fetchError } = await supabase
      .from('chat_sessions')
      .select('id, title, created_at, updated_at, user_id')
      .is('user_id', null)
      .order('created_at', { ascending: false });
    
    if (fetchError) {
      console.error('Error fetching orphaned sessions:', fetchError);
      return NextResponse.json({
        success: false,
        error: fetchError.message
      }, { status: 500 });
    }
    
    console.log(`Found ${orphanedSessions?.length || 0} orphaned sessions`);
    
    return NextResponse.json({
      success: true,
      orphanedCount: orphanedSessions?.length || 0,
      orphanedSessions: orphanedSessions || [],
      message: 'Use DELETE method to remove these sessions'
    });
    
  } catch (error: any) {
    console.error('Cleanup check error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// DELETE /api/admin/cleanup-sessions - user_id가 없는 세션들 삭제
export async function DELETE() {
  try {
    console.log('Deleting orphaned chat sessions...');
    
    // 먼저 카운트 확인
    const { count, error: countError } = await supabase
      .from('chat_sessions')
      .select('*', { count: 'exact', head: true })
      .is('user_id', null);
    
    if (countError) {
      console.error('Error counting orphaned sessions:', countError);
      return NextResponse.json({
        success: false,
        error: countError.message
      }, { status: 500 });
    }
    
    console.log(`Attempting to delete ${count} orphaned sessions`);
    
    // user_id가 null인 세션들 삭제 (CASCADE로 메시지도 자동 삭제)
    const { error: deleteError } = await supabase
      .from('chat_sessions')
      .delete()
      .is('user_id', null);
    
    if (deleteError) {
      console.error('Error deleting orphaned sessions:', deleteError);
      return NextResponse.json({
        success: false,
        error: deleteError.message
      }, { status: 500 });
    }
    
    console.log(`Successfully deleted ${count} orphaned sessions`);
    
    return NextResponse.json({
      success: true,
      deletedCount: count,
      message: `Successfully deleted ${count} orphaned sessions and their messages`
    });
    
  } catch (error: any) {
    console.error('Cleanup delete error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}