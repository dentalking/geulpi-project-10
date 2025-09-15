import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/email-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { handleApiError, AuthError } from '@/lib/api-errors';

// POST: 이벤트를 친구들과 공유
export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();
        const authToken = cookieStore.get('auth-token')?.value;
        const { eventId, friendIds, permission } = await request.json();
        
        if (!eventId || !friendIds || !Array.isArray(friendIds)) {
            return NextResponse.json({
                success: false,
                error: 'Event ID and friend IDs array are required'
            }, { status: 400 });
        }

        let userId: string | null = null;

        // Check for email auth
        if (authToken) {
            try {
                const user = await verifyToken(authToken);
                if (user) {
                    userId = user.id;
                }
            } catch (error) {
                console.error('Email auth verification failed:', error);
            }
        }

        // Check for Google OAuth
        if (!userId) {
            const cookieStore = await cookies();
            const accessToken = cookieStore.get('access_token')?.value;
            if (accessToken) {
                const { data: { user } } = await supabaseAdmin.auth.getUser(accessToken);
                userId = user?.id || null;
            }
        }

        if (!userId) {
            return handleApiError(new AuthError());
        }

        // 이벤트가 사용자의 소유인지 확인
        const { data: event, error: eventError } = await supabaseAdmin
            .from('calendar_events')
            .select('id, user_id, summary, shared_with')
            .eq('id', eventId)
            .eq('user_id', userId)
            .single();

        if (eventError || !event) {
            return NextResponse.json({
                success: false,
                error: 'Event not found or access denied'
            }, { status: 404 });
        }

        // 친구들이 실제로 친구인지 확인
        const { data: friendships, error: friendError } = await supabaseAdmin
            .from('friends')
            .select('friend_id, user_id')
            .or(
                friendIds.map(friendId => 
                    `and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`
                ).join(',')
            )
            .eq('status', 'accepted');

        if (friendError) {
            console.error('Error checking friendships:', friendError);
            return NextResponse.json({
                success: false,
                error: 'Failed to verify friendships'
            }, { status: 500 });
        }

        // 확인된 친구 ID만 추출
        const verifiedFriendIds = friendships?.map(friendship => 
            friendship.user_id === userId ? friendship.friend_id : friendship.user_id
        ) || [];

        const invalidFriendIds = friendIds.filter(id => !verifiedFriendIds.includes(id));
        if (invalidFriendIds.length > 0) {
            return NextResponse.json({
                success: false,
                error: 'Some users are not your friends',
                invalidFriendIds
            }, { status: 400 });
        }

        // 기존 공유 목록에 새로운 친구들 추가
        const currentSharedWith = event.shared_with || [];
        const newSharedWith = [...new Set([...currentSharedWith, ...friendIds])];

        // 이벤트의 shared_with 필드 업데이트
        const { error: updateError } = await supabaseAdmin
            .from('calendar_events')
            .update({
                shared_with: newSharedWith,
                share_permission: permission || 'view'
            })
            .eq('id', eventId);

        if (updateError) {
            console.error('Error sharing event:', updateError);
            return NextResponse.json({
                success: false,
                error: 'Failed to share event'
            }, { status: 500 });
        }

        // 친구 정보 가져오기
        const { data: friends, error: friendsError } = await supabaseAdmin
            .from('users')
            .select('id, email, name')
            .in('id', friendIds);

        return NextResponse.json({
            success: true,
            message: `이벤트를 ${friendIds.length}명의 친구와 공유했습니다.`,
            sharedWith: friends || [],
            eventSummary: event.summary
        });

    } catch (error) {
        return handleApiError(error);
    }
}

// DELETE: 이벤트 공유 취소
export async function DELETE(request: Request) {
    try {
        const cookieStore = await cookies();
        const authToken = cookieStore.get('auth-token')?.value;
        const { eventId, friendIds } = await request.json();
        
        if (!eventId || !friendIds || !Array.isArray(friendIds)) {
            return NextResponse.json({
                success: false,
                error: 'Event ID and friend IDs array are required'
            }, { status: 400 });
        }

        let userId: string | null = null;

        // Check for email auth
        if (authToken) {
            try {
                const user = await verifyToken(authToken);
                if (user) {
                    userId = user.id;
                }
            } catch (error) {
                console.error('Email auth verification failed:', error);
            }
        }

        // Check for Google OAuth
        if (!userId) {
            const cookieStore = await cookies();
            const accessToken = cookieStore.get('access_token')?.value;
            if (accessToken) {
                const { data: { user } } = await supabaseAdmin.auth.getUser(accessToken);
                userId = user?.id || null;
            }
        }

        if (!userId) {
            return handleApiError(new AuthError());
        }

        // 이벤트가 사용자의 소유인지 확인
        const { data: event, error: eventError } = await supabaseAdmin
            .from('calendar_events')
            .select('id, user_id, summary, shared_with')
            .eq('id', eventId)
            .eq('user_id', userId)
            .single();

        if (eventError || !event) {
            return NextResponse.json({
                success: false,
                error: 'Event not found or access denied'
            }, { status: 404 });
        }

        // 기존 공유 목록에서 특정 친구들 제거
        const currentSharedWith = event.shared_with || [];
        const newSharedWith = currentSharedWith.filter(id => !friendIds.includes(id));

        // 이벤트의 shared_with 필드 업데이트
        const { error: updateError } = await supabaseAdmin
            .from('calendar_events')
            .update({
                shared_with: newSharedWith
            })
            .eq('id', eventId);

        if (updateError) {
            console.error('Error unsharing event:', updateError);
            return NextResponse.json({
                success: false,
                error: 'Failed to unshare event'
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: `${friendIds.length}명의 친구와의 공유를 취소했습니다.`,
            eventSummary: event.summary
        });

    } catch (error) {
        return handleApiError(error);
    }
}