import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { env } from '@/lib/env';
import { createClient } from '@supabase/supabase-js';

// Force this route to run only on the server
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const supabase = createClient(
  env.get('NEXT_PUBLIC_SUPABASE_URL')!,
  env.get('SUPABASE_SERVICE_ROLE_KEY') || env.get('NEXT_PUBLIC_SUPABASE_ANON_KEY')!
);

export async function POST(request: NextRequest) {
  try {
    const { to, inviterName, invitationCode } = await request.json();

    // Generate invitation URL
    const invitationUrl = `${env.get('NEXT_PUBLIC_APP_URL') || 'https://geulpi.com'}/invite/${invitationCode}`;

    // Store invitation in database for processing
    const { data, error } = await supabase
      .from('email_queue')
      .insert({
        recipient: to,
        subject: `${inviterName}님이 글피 친구 초대를 보냈어요!`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #333; text-align: center;">글피 친구 초대</h1>
            <p style="color: #666; font-size: 16px;">안녕하세요!</p>
            <p style="color: #666; font-size: 16px;"><strong>${inviterName}</strong>님이 글피에서 친구가 되고 싶어해요.</p>
            <p style="color: #666; font-size: 16px;">아래 버튼을 클릭하여 친구 요청을 수락해주세요:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${invitationUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 500;">친구 요청 수락하기</a>
            </div>
            <p style="color: #999; font-size: 14px;">또는 아래 링크를 복사하여 브라우저에 붙여넣으세요:</p>
            <p style="color: #4F46E5; font-size: 14px; word-break: break-all;">${invitationUrl}</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">© 2024 글피. All rights reserved.</p>
          </div>
        `,
        body_text: `${inviterName}님이 글피 친구 초대를 보냈어요!\n\n아래 링크를 클릭하여 친구 요청을 수락해주세요:\n${invitationUrl}`,
        status: 'pending',
        attempts: 0
      })
      .select()
      .single();

    if (error) {
      logger.error('[Send Invitation] Database error:', error);
      throw error;
    }

    // Try to send immediately using fallback method
    // For now, we'll rely on the email processor script
    logger.debug('[Send Invitation] Email queued successfully', { value: data.id });

    return NextResponse.json({
      success: true,
      queued: true,
      queueId: data.id,
      message: 'Invitation email has been queued for sending'
    });

  } catch (error: any) {
    logger.error('[Send Invitation] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}