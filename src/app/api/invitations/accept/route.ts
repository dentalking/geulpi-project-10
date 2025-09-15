import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/email-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { handleApiError, AuthError } from '@/lib/api-errors';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;
    const { invitationCode } = await request.json();

    if (!invitationCode) {
      return NextResponse.json({
        success: false,
        error: 'Invitation code is required'
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
      const accessToken = cookieStore.get('access_token')?.value;
      if (accessToken) {
        const { data: { user } } = await supabaseAdmin.auth.getUser(accessToken);
        userId = user?.id || null;
      }
    }

    if (!userId) {
      return handleApiError(new AuthError());
    }

    // Get the invitation
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('friend_invitations')
      .select('*')
      .eq('invitation_code', invitationCode)
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json({
        success: false,
        error: 'Invalid invitation code'
      }, { status: 404 });
    }

    // Check if invitation is still valid
    if (invitation.status !== 'pending') {
      return NextResponse.json({
        success: false,
        error: 'This invitation has already been used or expired'
      }, { status: 400 });
    }

    // Check if invitation has expired (7 days)
    const expiryDate = new Date(invitation.created_at);
    expiryDate.setDate(expiryDate.getDate() + 7);

    if (new Date() > expiryDate) {
      // Mark as expired
      await supabaseAdmin
        .from('friend_invitations')
        .update({ status: 'expired' })
        .eq('invitation_code', invitationCode);

      return NextResponse.json({
        success: false,
        error: 'This invitation has expired'
      }, { status: 400 });
    }

    // Get current user email to verify invitation
    const { data: currentUser } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('id', userId)
      .single();

    if (!currentUser || currentUser.email !== invitation.invitee_email) {
      return NextResponse.json({
        success: false,
        error: 'This invitation is not for your email address'
      }, { status: 400 });
    }

    // Check if users are already friends
    const { data: existingFriend } = await supabaseAdmin
      .from('friends')
      .select('id, status')
      .or(`and(user_id.eq.${invitation.inviter_id},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${invitation.inviter_id})`)
      .single();

    if (existingFriend) {
      // Mark invitation as accepted even if already friends
      await supabaseAdmin
        .from('friend_invitations')
        .update({ status: 'accepted' })
        .eq('invitation_code', invitationCode);

      return NextResponse.json({
        success: true,
        message: 'You are already friends with this user'
      });
    }

    // Create the friendship
    const { data: friendship, error: friendError } = await supabaseAdmin
      .from('friends')
      .insert({
        user_id: invitation.inviter_id,
        friend_id: userId,
        status: 'accepted' // Auto-accept since they registered via invitation
      })
      .select()
      .single();

    if (friendError) {
      console.error('Error creating friendship:', friendError);
      return NextResponse.json({
        success: false,
        error: 'Failed to create friendship'
      }, { status: 500 });
    }

    // Mark invitation as accepted
    await supabaseAdmin
      .from('friend_invitations')
      .update({ status: 'accepted' })
      .eq('invitation_code', invitationCode);

    return NextResponse.json({
      success: true,
      message: 'Friend invitation accepted successfully',
      friendship
    });

  } catch (error) {
    console.error('Error accepting invitation:', error);
    return handleApiError(error);
  }
}