import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/supabase-auth';
import { supabase } from '@/lib/db';

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();
        const authToken = cookieStore.get('auth-token')?.value;
        const { friendRequestId, action } = await request.json();
        
        if (!friendRequestId || !action) {
            return NextResponse.json({
                success: false,
                error: 'Friend request ID and action are required'
            }, { status: 400 });
        }

        if (!['accept', 'decline'].includes(action)) {
            return NextResponse.json({
                success: false,
                error: 'Action must be either "accept" or "decline"'
            }, { status: 400 });
        }

        let userId: string | null = null;

        // Check for supabase auth token
        if (authToken) {
            try {
                const user = await verifyToken(authToken);
                if (user) {
                    userId = user.id;
                }
            } catch (error) {
                logger.error('Supabase auth verification failed:', error);
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

        // Get the friend request
        const { data: friendRequest, error: fetchError } = await supabase
            .from('friends')
            .select(`
                id, 
                user_id, 
                friend_id, 
                status,
                users!friends_user_id_fkey(id, email, name)
            `)
            .eq('id', friendRequestId)
            .eq('friend_id', userId) // Only the recipient can respond
            .eq('status', 'pending')
            .single();

        if (fetchError || !friendRequest) {
            return NextResponse.json({
                success: false,
                error: 'Friend request not found or already processed'
            }, { status: 404 });
        }

        if (action === 'accept') {
            // Update the friend request status to accepted
            const { error: updateError } = await supabase
                .from('friends')
                .update({ 
                    status: 'accepted',
                    accepted_at: new Date().toISOString()
                })
                .eq('id', friendRequestId);

            if (updateError) {
                logger.error('Error accepting friend request:', updateError);
                return NextResponse.json({
                    success: false,
                    error: 'Failed to accept friend request'
                }, { status: 500 });
            }

            // Create reciprocal friendship (both directions)
            const { error: reciprocalError } = await supabase
                .from('friends')
                .insert({
                    user_id: userId,
                    friend_id: friendRequest.user_id,
                    status: 'accepted',
                    accepted_at: new Date().toISOString()
                });

            if (reciprocalError) {
                logger.error('Error creating reciprocal friendship:', reciprocalError);
                // This is not critical, the main relationship is already created
            }

            return NextResponse.json({
                success: true,
                action: 'accepted',
                friend: friendRequest.users,
                message: '친구 요청을 수락했습니다!'
            });
        } else {
            // Decline the friend request by deleting it
            const { error: deleteError } = await supabase
                .from('friends')
                .delete()
                .eq('id', friendRequestId);

            if (deleteError) {
                logger.error('Error declining friend request:', deleteError);
                return NextResponse.json({
                    success: false,
                    error: 'Failed to decline friend request'
                }, { status: 500 });
            }

            return NextResponse.json({
                success: true,
                action: 'declined',
                message: '친구 요청을 거절했습니다.'
            });
        }

    } catch (error) {
        logger.error('Error in POST /api/friends/respond:', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error'
        }, { status: 500 });
    }
}