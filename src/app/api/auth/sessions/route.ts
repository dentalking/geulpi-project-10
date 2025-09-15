import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { sessionManager } from '@/lib/auth/session-manager';
import { verifyToken } from '@/lib/auth/supabase-auth';

// GET: Get all sessions for the current user
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Verify the current session
    const session = await sessionManager.verifyAccessToken(token);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }
    
    // Get all user sessions
    const sessions = await sessionManager.getUserSessions(session.userId);
    
    // Format sessions for response
    const formattedSessions = sessions.map(s => ({
      id: s.id,
      device: s.deviceInfo.device || 'Unknown Device',
      browser: s.deviceInfo.browser || 'Unknown Browser',
      os: s.deviceInfo.os || 'Unknown OS',
      ip: s.deviceInfo.ip,
      createdAt: s.createdAt,
      lastActive: s.lastActive,
      isCurrent: s.id === session.id,
      rememberMe: s.rememberMe
    }));
    
    return NextResponse.json({
      sessions: formattedSessions,
      currentSessionId: session.id
    });
  } catch (error: any) {
    console.error('Get sessions error:', error);
    return NextResponse.json(
      { error: 'Failed to get sessions' },
      { status: 500 }
    );
  }
}

// DELETE: Revoke a specific session or all sessions
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Verify the current session
    const session = await sessionManager.verifyAccessToken(token);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const revokeAll = searchParams.get('all') === 'true';
    
    if (revokeAll) {
      // Revoke all sessions except current
      const sessions = await sessionManager.getUserSessions(session.userId);
      for (const s of sessions) {
        if (s.id !== session.id) {
          await sessionManager.revokeSession(s.id);
        }
      }
      
      return NextResponse.json({
        success: true,
        message: 'All other sessions have been revoked'
      });
    } else if (sessionId) {
      // Revoke specific session
      if (sessionId === session.id) {
        return NextResponse.json(
          { error: 'Cannot revoke current session' },
          { status: 400 }
        );
      }
      
      await sessionManager.revokeSession(sessionId);
      
      return NextResponse.json({
        success: true,
        message: 'Session revoked successfully'
      });
    } else {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Revoke session error:', error);
    return NextResponse.json(
      { error: 'Failed to revoke session' },
      { status: 500 }
    );
  }
}