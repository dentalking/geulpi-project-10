import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/email-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { handleApiError, AuthError } from '@/lib/api-errors';
import { emailService, EmailService } from '@/services/email/EmailService';

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();
        const authToken = cookieStore.get('auth-token')?.value;
        const { friendEmail, message } = await request.json();
        
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
                const { data: { user } } = await supabaseAdmin.auth.getUser(accessToken);
                userId = user?.id || null;
            }
        }

        if (!userId) {
            return handleApiError(new AuthError());
        }

        // Check if friend exists in users table
        const { data: friendUser, error: friendError } = await supabaseAdmin
            .from('users')
            .select('id, email, name')
            .eq('email', friendEmail)
            .single();

        if (friendError || !friendUser) {
            // Send invitation if user doesn't exist
            const invitationCode = Math.random().toString(36).substring(2, 15) +
                                  Math.random().toString(36).substring(2, 15);

            const { data: invitation, error: inviteError } = await supabaseAdmin
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
            const { data: inviterUser } = await supabaseAdmin
                .from('users')
                .select('name, email')
                .eq('id', userId)
                .single();

            // Send invitation email
            const invitationUrl = EmailService.generateInvitationUrl(invitationCode);
            const emailSent = await emailService.sendFriendInvitation({
                inviterName: inviterUser?.name || 'Geulpi 사용자',
                inviterEmail: inviterUser?.email || '',
                inviteeEmail: friendEmail,
                invitationCode: invitationCode,
                message: message,
                invitationUrl: invitationUrl
            });

            return NextResponse.json({
                success: true,
                type: 'invitation',
                invitation,
                emailSent,
                message: emailSent
                    ? '사용자가 아직 가입하지 않았습니다. 초대 이메일을 보냈습니다.'
                    : '초대장을 생성했지만 이메일 전송에 실패했습니다. 초대 코드를 직접 공유해 주세요.'
            });
        }

        // Check if already friends
        const { data: existingFriend } = await supabaseAdmin
            .from('friends')
            .select('id, status')
            .or(`and(user_id.eq.${userId},friend_id.eq.${friendUser.id}),and(user_id.eq.${friendUser.id},friend_id.eq.${userId})`)
            .single();

        if (existingFriend) {
            if (existingFriend.status === 'accepted') {
                return NextResponse.json({
                    success: false,
                    error: '이미 친구입니다.'
                }, { status: 400 });
            } else {
                return NextResponse.json({
                    success: false,
                    error: '이미 친구 요청이 진행 중입니다.'
                }, { status: 400 });
            }
        }

        // Create friend request
        const { data: friendRequest, error: requestError } = await supabaseAdmin
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
            return NextResponse.json({
                success: false,
                error: 'Failed to send friend request'
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            type: 'request',
            friendRequest,
            friend: {
                id: friendUser.id,
                email: friendUser.email,
                name: friendUser.name
            },
            message: '친구 요청을 보냈습니다.'
        });

    } catch (error) {
        return handleApiError(error);
    }
}