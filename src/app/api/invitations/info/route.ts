import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({
        success: false,
        error: 'Invitation code is required'
      }, { status: 400 });
    }

    // Get invitation details
    const { data: invitation, error } = await supabaseAdmin
      .from('friend_invitations')
      .select(`
        id,
        invitee_email,
        message,
        status,
        created_at,
        expires_at,
        inviter:users!inviter_id (
          name,
          email
        )
      `)
      .eq('invitation_code', code)
      .single();

    if (error || !invitation) {
      return NextResponse.json({
        success: false,
        error: 'Invalid or expired invitation code'
      }, { status: 404 });
    }

    // Check if invitation is still valid
    if (invitation.status !== 'pending') {
      return NextResponse.json({
        success: false,
        error: 'This invitation has already been used'
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
        .eq('invitation_code', code);

      return NextResponse.json({
        success: false,
        error: 'This invitation has expired'
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      invitation: {
        inviterName: (invitation.inviter as any)?.name || 'Unknown User',
        inviterEmail: (invitation.inviter as any)?.email,
        inviteeEmail: invitation.invitee_email,
        message: invitation.message
      }
    });

  } catch (error) {
    console.error('Error fetching invitation info:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch invitation information'
    }, { status: 500 });
  }
}