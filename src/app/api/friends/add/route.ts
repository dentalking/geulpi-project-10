import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { env } from '@/lib/env';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/supabase-auth';
import { supabaseEmailService } from '@/services/email/SupabaseEmailService';

const supabase = createClient(
  env.get('NEXT_PUBLIC_SUPABASE_URL')!,
  env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// POST: 플랫폼별 친구 추가
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const authHeader = request.headers.get('authorization');
    let userId: string | null = null;

    // JWT 인증 확인
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
              .select('id, name, email')
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

    const { email, nickname, platform = 'email' } = await request.json();

    if (!email) {
      return NextResponse.json({
        success: false,
        error: 'Email is required'
      }, { status: 400 });
    }

    // 대상 사용자 찾기
    const { data: targetUser, error: targetUserError } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('email', email.toLowerCase())
      .single();

    if (targetUserError || !targetUser) {
      // 사용자가 존재하지 않는 경우, 플랫폼별 처리
      if (platform === 'kakao' || platform === 'discord') {
        return NextResponse.json({
          success: false,
          error: `${platform === 'kakao' ? '카카오톡' : '디스코드'}에서 해당 사용자를 찾을 수 없습니다. 먼저 해당 플랫폼에서 연결되어야 합니다.`
        }, { status: 404 });
      }

      // 이메일의 경우 초대 링크 발송
      try {
        // 현재 사용자 정보 가져오기
        const { data: currentUser } = await supabase
          .from('users')
          .select('name, email')
          .eq('id', userId)
          .single();

        // 임시 초대 코드 생성
        const invitationCode = Math.random().toString(36).substring(2, 15);

        await supabaseEmailService.sendFriendInvitation({
          inviterName: currentUser?.name || currentUser?.email || 'User',
          inviterEmail: currentUser?.email || 'user@example.com',
          inviteeEmail: email,
          invitationCode: invitationCode,
          invitationUrl: `${env.get('NEXT_PUBLIC_APP_URL')}/invite?token=${invitationCode}`
        });

        return NextResponse.json({
          success: true,
          message: '초대 이메일을 발송했습니다. 상대방이 가입 후 친구가 됩니다.',
          type: 'invitation_sent'
        });
      } catch (emailError) {
        logger.error('Failed to send invitation email:', emailError);
        return NextResponse.json({
          success: false,
          error: '초대 이메일 발송에 실패했습니다.'
        }, { status: 500 });
      }
    }

    // 자기 자신에게 친구 요청하는 경우 방지
    if (targetUser.id === userId) {
      return NextResponse.json({
        success: false,
        error: '자기 자신에게는 친구 요청을 보낼 수 없습니다.'
      }, { status: 400 });
    }

    // 이미 친구이거나 요청이 있는지 확인
    const { data: existingRelation } = await supabase
      .from('friends')
      .select('status')
      .or(`and(user_id.eq.${userId},friend_id.eq.${targetUser.id}),and(user_id.eq.${targetUser.id},friend_id.eq.${userId})`)
      .single();

    if (existingRelation) {
      const statusMessage = {
        'pending': '이미 친구 요청을 보냈거나 받았습니다.',
        'accepted': '이미 친구입니다.',
        'rejected': '친구 요청이 거절되었습니다.'
      };

      return NextResponse.json({
        success: false,
        error: statusMessage[existingRelation.status as keyof typeof statusMessage] || '알 수 없는 상태입니다.'
      }, { status: 400 });
    }

    // 플랫폼별 처리
    let friendData: any = {
      user_id: userId,
      friend_id: targetUser.id,
      status: 'pending',
      nickname: nickname || targetUser.name,
      relationship_type: 'friend'
    };

    // 카카오톡이나 디스코드의 경우 추가 검증
    if (platform === 'kakao' || platform === 'discord') {
      // 상대방이 해당 플랫폼에 연결되어 있는지 확인
      const { data: targetIntegration } = await supabase
        .from('messenger_integrations')
        .select('id, is_active')
        .eq('user_id', targetUser.id)
        .eq('platform', platform)
        .eq('is_active', true)
        .single();

      if (!targetIntegration) {
        return NextResponse.json({
          success: false,
          error: `상대방이 ${platform === 'kakao' ? '카카오톡' : '디스코드'}에 연결되어 있지 않습니다.`
        }, { status: 400 });
      }

      // 플랫폼 연동이 있는 경우 자동 수락 (실제로는 해당 플랫폼의 친구 상태를 확인해야 함)
      if (platform === 'kakao' || platform === 'discord') {
        friendData.status = 'accepted'; // 임시로 자동 수락
        friendData.accepted_at = new Date().toISOString();
      }
    }

    // 친구 관계 생성
    const { data: newFriend, error: friendError } = await supabase
      .from('friends')
      .insert(friendData)
      .select()
      .single();

    if (friendError) {
      logger.error('Error creating friend relation:', friendError);
      return NextResponse.json({
        success: false,
        error: '친구 요청 생성에 실패했습니다.'
      }, { status: 500 });
    }

    // 상대방이 웹에 연결되어 있으면 이메일 알림 발송
    if (platform === 'email' || friendData.status === 'pending') {
      try {
        const { data: currentUser } = await supabase
          .from('users')
          .select('name, email')
          .eq('id', userId)
          .single();

        if (currentUser) {
          // sendFriendRequest 메소드가 존재하지 않으므로 주석 처리
          // TODO: 친구 요청 이메일 기능 구현 필요
          logger.debug('Friend request email would be sent to:', targetUser.email);
        }
      } catch (emailError) {
        logger.error('Failed to send friend request email:', emailError);
        // 이메일 실패해도 친구 요청은 성공으로 처리
      }
    }

    const successMessage = {
      'pending': '친구 요청을 보냈습니다.',
      'accepted': platform === 'kakao' ? '카카오톡에서 자동으로 친구가 되었습니다!' :
                 platform === 'discord' ? '디스코드에서 자동으로 친구가 되었습니다!' :
                 '친구가 되었습니다!'
    };

    return NextResponse.json({
      success: true,
      message: successMessage[friendData.status as keyof typeof successMessage],
      friend: newFriend,
      platform,
      autoAccepted: friendData.status === 'accepted'
    });

  } catch (error) {
    logger.error('Error in add friend API:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}