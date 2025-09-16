import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getUserFriendlyErrorMessage } from '@/lib/error-messages';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: 친구 목록 조회
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const authHeader = request.headers.get('authorization');
    let userId: string | null = null;

    // 1. JWT 이메일 인증 트랙 확인
    let authToken: string | null = null;
    if (authHeader?.startsWith('auth-token ')) {
      authToken = authHeader.substring(11);
    } else {
      authToken = cookieStore.get('auth-token')?.value || null;
    }

    if (authToken) {
      try {
        const { verifyToken } = await import('@/lib/auth/supabase-auth');
        const user = await verifyToken(authToken);
        if (user) {
          userId = user.id;
        }
      } catch (error) {
        console.error('JWT auth verification failed:', error);
      }
    }

    // 2. Google OAuth 트랙 확인 (기존 시스템 보존)
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
            // Find user in database by email
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
          console.error('Google OAuth verification failed:', error);
        }
      }
    }

    if (!userId) {
      // Get locale from request headers
      const locale = request.headers.get('accept-language')?.includes('en') ? 'en' : 'ko';

      return NextResponse.json(
        {
          error: getUserFriendlyErrorMessage({ code: 'AUTHENTICATION_REQUIRED' }, locale),
          code: 'AUTH_ERROR'
        },
        { status: 401 }
      );
    }

    // 친구 목록 조회 (양방향 관계 모두 조회)
    const { data: friendships, error } = await supabase
      .from('friends')
      .select(`
        id,
        user_id,
        friend_id,
        status,
        relationship_type,
        nickname,
        notes,
        meeting_frequency,
        last_meeting_date,
        created_at,
        accepted_at,
        friend:users!friends_friend_id_fkey(
          id,
          email,
          name
        ),
        user:users!friends_user_id_fkey(
          id,
          email,
          name
        )
      `)
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
      .eq('status', 'accepted');

    if (error) {
      console.error('Error fetching friends:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch friends' },
        { status: 500 }
      );
    }

    // 친구 정보 정리 (자신이 user_id든 friend_id든 상대방 정보를 반환)
    const friends = friendships?.map((friendship: any) => {
      const isUserInitiator = friendship.user_id === userId;
      const friendData = isUserInitiator ? friendship.friend : friendship.user;
      // Supabase 관계 쿼리에서 배열로 반환될 수 있으므로 첫 번째 요소 사용
      const friend = Array.isArray(friendData) ? friendData[0] : friendData;
      
      return {
        id: friendship.id,
        friendId: friend?.id,
        email: friend?.email,
        name: friend?.name || friendship.nickname || friend?.email,
        picture: friend?.picture,
        nickname: friendship.nickname,
        relationshipType: friendship.relationship_type,
        notes: friendship.notes,
        meetingFrequency: friendship.meeting_frequency,
        lastMeetingDate: friendship.last_meeting_date,
        friendSince: friendship.accepted_at || friendship.created_at
      };
    }) || [];

    return NextResponse.json({
      success: true,
      friends
    });

  } catch (error) {
    console.error('Error in GET /api/friends:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: 친구 요청 보내기
export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const authToken = cookieStore.get('auth-token')?.value;
    const accessToken = cookieStore.get('access_token')?.value;

    let userId: string | null = null;

    // Check email auth first
    if (authToken) {
      const { verifyToken } = await import('@/lib/auth/supabase-auth');
      try {
        const user = await verifyToken(authToken);
        if (user) {
          userId = user.id;
        }
      } catch (error) {
        console.error('Failed to verify email auth token:', error);
      }
    }

    // Fall back to Google OAuth
    if (!userId && accessToken) {
      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
      if (!authError && user) {
        userId = user.id;
      }
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { friendEmail, nickname, relationshipType, notes } = body;

    if (!friendEmail) {
      return NextResponse.json(
        { success: false, error: 'Friend email is required' },
        { status: 400 }
      );
    }

    // 친구 사용자 찾기
    const { data: friendUser, error: findError } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('email', friendEmail)
      .single();

    if (findError || !friendUser) {
      // 사용자가 없으면 초대 이메일 발송 (추후 구현)
      return NextResponse.json(
        { success: false, error: 'User not found. Invitation feature coming soon!' },
        { status: 404 }
      );
    }

    // 자기 자신은 친구 추가 불가
    if (friendUser.id === userId) {
      return NextResponse.json(
        { success: false, error: 'Cannot add yourself as a friend' },
        { status: 400 }
      );
    }

    // 이미 친구인지 확인
    const { data: existingFriend } = await supabase
      .from('friends')
      .select('id, status')
      .or(`and(user_id.eq.${userId},friend_id.eq.${friendUser.id}),and(user_id.eq.${friendUser.id},friend_id.eq.${userId})`)
      .single();

    if (existingFriend) {
      return NextResponse.json(
        { 
          success: false, 
          error: existingFriend.status === 'pending' 
            ? 'Friend request already sent' 
            : 'Already friends'
        },
        { status: 400 }
      );
    }

    // 친구 요청 생성
    const { data: newFriend, error: createError } = await supabase
      .from('friends')
      .insert({
        user_id: userId,
        friend_id: friendUser.id,
        status: 'pending',
        relationship_type: relationshipType,
        nickname: nickname,
        notes: notes
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating friend request:', createError);
      return NextResponse.json(
        { success: false, error: 'Failed to send friend request' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Friend request sent successfully',
      friend: {
        id: newFriend.id,
        friendId: friendUser.id,
        email: friendUser.email,
        name: friendUser.name || friendEmail,
        status: 'pending'
      }
    });

  } catch (error) {
    console.error('Error in POST /api/friends:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH: 친구 요청 수락/거절
export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const authToken = cookieStore.get('auth-token')?.value;
    const accessToken = cookieStore.get('access_token')?.value;

    let userId: string | null = null;

    // Check email auth first
    if (authToken) {
      const { verifyToken } = await import('@/lib/auth/supabase-auth');
      try {
        const user = await verifyToken(authToken);
        if (user) {
          userId = user.id;
        }
      } catch (error) {
        console.error('Failed to verify email auth token:', error);
      }
    }

    // Fall back to Google OAuth
    if (!userId && accessToken) {
      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
      if (!authError && user) {
        userId = user.id;
      }
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { friendshipId, action } = body; // action: 'accept' | 'reject'

    if (!friendshipId || !action) {
      return NextResponse.json(
        { success: false, error: 'Friendship ID and action are required' },
        { status: 400 }
      );
    }

    // 친구 요청 찾기 (자신이 friend_id인 경우만)
    const { data: friendship, error: findError } = await supabase
      .from('friends')
      .select('*')
      .eq('id', friendshipId)
      .eq('friend_id', userId)
      .eq('status', 'pending')
      .single();

    if (findError || !friendship) {
      return NextResponse.json(
        { success: false, error: 'Friend request not found' },
        { status: 404 }
      );
    }

    if (action === 'accept') {
      // 친구 요청 수락
      const { error: updateError } = await supabase
        .from('friends')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', friendshipId);

      if (updateError) {
        console.error('Error accepting friend request:', updateError);
        return NextResponse.json(
          { success: false, error: 'Failed to accept friend request' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Friend request accepted'
      });

    } else if (action === 'reject') {
      // 친구 요청 거절 (삭제)
      const { error: deleteError } = await supabase
        .from('friends')
        .delete()
        .eq('id', friendshipId);

      if (deleteError) {
        console.error('Error rejecting friend request:', deleteError);
        return NextResponse.json(
          { success: false, error: 'Failed to reject friend request' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Friend request rejected'
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error in PATCH /api/friends:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}