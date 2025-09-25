import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { env } from '@/lib/env';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/supabase-auth';

const supabase = createClient(
  env.get('NEXT_PUBLIC_SUPABASE_URL')!,
  env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// GET: 통합 친구 목록 조회 (메신저 플랫폼 정보 포함)
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const authHeader = request.headers.get('authorization');
    let userId: string | null = null;

    // JWT 이메일 인증 트랙 확인
    let authToken: string | null = null;
    if (authHeader?.startsWith('auth-token ')) {
      authToken = authHeader.substring(11);
    } else {
      authToken = cookieStore.get('auth-token')?.value || null;
    }

    if (authToken) {
      try {
        const user = await verifyToken(authToken);
        if (user) {
          userId = user.id;
        }
      } catch (error) {
        logger.error('JWT auth verification failed:', error);
      }
    }

    // Google OAuth 트랙 확인 (기존 시스템 보존)
    if (!userId) {
      const accessToken = cookieStore.get('access_token')?.value;
      if (accessToken) {
        try {
          const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          });

          if (response.ok) {
            const userInfo = await response.json();
            const { data: dbUser } = await supabase
              .from('users')
              .select('id')
              .eq('email', userInfo.email)
              .single();

            if (dbUser) {
              userId = dbUser.id;
            }
          }
        } catch (error) {
          logger.error('Google OAuth verification failed:', error);
        }
      }
    }

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // 친구 목록과 메신저 통합 정보를 함께 조회
    const { data: friends, error: friendsError } = await supabase
      .from('friends')
      .select(`
        id,
        friend_id,
        nickname,
        relationship_type,
        notes,
        meeting_frequency,
        last_meeting_date,
        created_at,
        friend:users!friends_friend_id_fkey(
          id,
          name,
          email,
          picture:user_profiles(picture)
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false });

    if (friendsError) {
      logger.error('Error fetching friends:', friendsError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch friends'
      }, { status: 500 });
    }

    // 각 친구의 메신저 통합 정보 조회
    const friendsWithIntegrations = await Promise.all(
      (friends || []).map(async (friend) => {
        const { data: integrations, error: integrationsError } = await supabase
          .from('messenger_integrations')
          .select('platform, platform_user_id, is_active, last_active_at')
          .eq('user_id', friend.friend_id);

        if (integrationsError) {
          logger.error('Error fetching integrations:', integrationsError);
        }

        return {
          id: friend.id,
          friendId: friend.friend_id,
          email: (friend.friend as any)?.email,
          name: (friend.friend as any)?.name,
          picture: (friend.friend as any)?.picture?.[0]?.picture || null,
          nickname: friend.nickname,
          relationshipType: friend.relationship_type,
          notes: friend.notes,
          meetingFrequency: friend.meeting_frequency,
          lastMeetingDate: friend.last_meeting_date,
          friendSince: friend.created_at,
          messengerIntegrations: integrations || []
        };
      })
    );

    return NextResponse.json({
      success: true,
      friends: friendsWithIntegrations
    });

  } catch (error) {
    logger.error('Error in integrated friends API:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}