import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/supabase-auth';
import { supabase } from '@/lib/db';
import { getUserFriendlyErrorMessage } from '@/lib/error-messages';
import { withFriendRequest, withDebounce } from '@/lib/concurrency-manager';

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();
        const authToken = cookieStore.get('auth-token')?.value;
        const { friendEmail, message } = await request.json();

        // Get locale from request headers
        const locale = request.headers.get('accept-language')?.includes('en') ? 'en' : 'ko';
        
        if (!friendEmail) {
            return NextResponse.json({
                success: false,
                error: 'Friend email is required'
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
                const { data: { user } } = await supabase.auth.getUser(accessToken);
                userId = user?.id || null;
            }
        }

        if (!userId) {
            return NextResponse.json({
                success: false,
                error: 'Authentication required'
            }, { status: 401 });
        }

        // Check if friend exists in users table
        const { data: friendUser, error: friendError } = await supabase
            .from('users')
            .select('id, email, name')
            .eq('email', friendEmail)
            .single();

        if (friendError || !friendUser) {
            // Send invitation if user doesn't exist
            const invitationCode = Math.random().toString(36).substring(2, 15) +
                                  Math.random().toString(36).substring(2, 15);

            const { data: invitation, error: inviteError } = await supabase
                .from('friend_invitations')
                .insert({
                    inviter_id: userId,
                    invitee_email: friendEmail,
                    invitation_code: invitationCode,
                    message: message || '친구 요청을 보냈습니다!',
                    status: 'pending'
                })
                .select()
                .single();

            if (inviteError) {
                console.error('Error creating invitation:', inviteError);
                return NextResponse.json({
                    success: false,
                    error: 'Failed to send invitation'
                }, { status: 500 });
            }

            // Get inviter user info for the email
            const { data: inviterUser } = await supabase
                .from('users')
                .select('name, email')
                .eq('id', userId)
                .single();

            // For now, just return the invitation without sending email
            return NextResponse.json({
                success: true,
                type: 'invitation',
                invitation,
                message: '사용자가 아직 가입하지 않았습니다. 초대 코드를 직접 공유해 주세요.',
                invitationCode: invitationCode
            });
        }

        // Wrap the critical section with concurrency control to prevent race conditions
        const result = await withFriendRequest(userId, friendUser.id, async () => {
            // Check if already friends
            const { data: existingFriend } = await supabase
                .from('friends')
                .select('id, status')
                .or(`and(user_id.eq.${userId},friend_id.eq.${friendUser.id}),and(user_id.eq.${friendUser.id},friend_id.eq.${userId})`)
                .single();

            if (existingFriend) {
                if (existingFriend.status === 'accepted') {
                    return {
                        success: false,
                        error: getUserFriendlyErrorMessage({ code: 'ALREADY_FRIENDS' }, locale),
                        status: 400
                    };
                } else {
                    return {
                        success: false,
                        error: getUserFriendlyErrorMessage({ code: 'FRIEND_REQUEST_PENDING' }, locale),
                        status: 400
                    };
                }
            }

            // Create friend request
            const { data: friendRequest, error: requestError } = await supabase
                .from('friends')
                .insert({
                    user_id: userId,
                    friend_id: friendUser.id,
                    status: 'pending',
                    notes: message || ''
                })
                .select()
                .single();

            if (requestError) {
                console.error('Error creating friend request:', requestError);
                return {
                    success: false,
                    error: 'Failed to send friend request',
                    status: 500
                };
            }

            return {
                success: true,
                friendRequest,
                friend: {
                    id: friendUser.id,
                    email: friendUser.email,
                    name: friendUser.name
                }
            };
        });

        if (!result.success) {
            return NextResponse.json({
                success: false,
                error: result.error
            }, { status: result.status });
        }

        const { friendRequest, friend } = result;

        return NextResponse.json({
            success: true,
            type: 'request',
            friendRequest,
            friend,
            message: '친구 요청을 보냈습니다.'
        });

    } catch (error) {
        console.error('Error in POST /api/friends/request:', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error'
        }, { status: 500 });
    }
}