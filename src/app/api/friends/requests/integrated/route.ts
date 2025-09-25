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

// GET: 통합 친구 요청 목록 조회 (플랫폼 정보 포함)
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

    // Google OAuth 트랙 확인
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

    // 받은 친구 요청들 조회
    const { data: receivedRequests, error: receivedError } = await supabase
      .from('friends')
      .select(`
        id,
        user_id,
        friend_id,
        status,
        created_at,
        requester:users!friends_user_id_fkey(
          id,
          name,
          email,
          picture:user_profiles(picture)
        )
      `)
      .eq('friend_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    // 보낸 친구 요청들 조회
    const { data: sentRequests, error: sentError } = await supabase
      .from('friends')
      .select(`
        id,
        user_id,
        friend_id,
        status,
        created_at,
        recipient:users!friends_friend_id_fkey(
          id,
          name,
          email,
          picture:user_profiles(picture)
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (receivedError || sentError) {
      logger.error('Error fetching friend requests:', receivedError || sentError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch friend requests'
      }, { status: 500 });
    }

    // 각 요청에 대해 플랫폼 정보 추가 및 포맷팅
    const formatRequests = async (requests: any[], type: 'received' | 'sent') => {
      return Promise.all(
        (requests || []).map(async (request) => {
          const targetUserId = type === 'received' ? request.user_id : request.friend_id;
          const userInfo = type === 'received' ? request.requester : request.recipient;

          // 해당 사용자의 메신저 통합 정보 조회
          const { data: integrations } = await supabase
            .from('messenger_integrations')
            .select('platform, is_active')
            .eq('user_id', targetUserId)
            .eq('is_active', true);

          // 주요 플랫폼 결정 (카카오톡 > 디스코드 > 웹 순)
          let primaryPlatform: 'kakao' | 'discord' | 'web' = 'web';
          if (integrations?.some(i => i.platform === 'kakao')) {
            primaryPlatform = 'kakao';
          } else if (integrations?.some(i => i.platform === 'discord')) {
            primaryPlatform = 'discord';
          }

          return {
            id: request.id,
            type,
            user: {
              id: userInfo.id,
              email: userInfo.email,
              name: userInfo.name,
              picture: userInfo.picture?.picture || null
            },
            status: request.status,
            createdAt: request.created_at,
            platform: primaryPlatform,
            platformIntegrations: integrations || []
          };
        })
      );
    };

    const formattedReceivedRequests = await formatRequests(receivedRequests, 'received');
    const formattedSentRequests = await formatRequests(sentRequests, 'sent');

    // 시간순으로 정렬된 전체 요청 목록
    const allRequests = [...formattedReceivedRequests, ...formattedSentRequests]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      success: true,
      requests: allRequests,
      receivedRequests: formattedReceivedRequests,
      sentRequests: formattedSentRequests,
      counts: {
        total: allRequests.length,
        received: formattedReceivedRequests.length,
        sent: formattedSentRequests.length
      }
    });

  } catch (error) {
    logger.error('Error in integrated friend requests API:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}