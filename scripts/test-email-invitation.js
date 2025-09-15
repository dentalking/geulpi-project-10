const { Resend } = require('resend');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function testEmailInvitation() {
  console.log('Testing email invitation system...\n');

  // Check environment variables
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.FROM_EMAIL;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  console.log('Environment Check:');
  console.log('- RESEND_API_KEY:', apiKey ? '✓ Set' : '✗ Missing');
  console.log('- FROM_EMAIL:', fromEmail || '✗ Missing');
  console.log('- NEXT_PUBLIC_APP_URL:', appUrl || '✗ Missing');

  if (!apiKey || !fromEmail) {
    console.error('\n❌ Missing required environment variables');
    process.exit(1);
  }

  // Initialize Resend
  const resend = new Resend(apiKey);

  // Test email data - Using your email for testing (Resend limitation in test mode)
  const testEmail = 'bangheerack@gmail.com';
  const inviterName = '테스트 사용자';
  const invitationCode = 'test_invitation_code_123';

  console.log('\n📧 Sending test invitation email...');
  console.log(`- To: ${testEmail}`);
  console.log(`- From: ${fromEmail}`);
  console.log(`- Inviter: ${inviterName}`);

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: testEmail,
      subject: `${inviterName}님이 Geulpi 캘린더로 초대했습니다!`,
      html: `
        <div style="font-family: 'Pretendard', -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="color: #1a1a1a; font-size: 28px; margin-bottom: 24px;">
            친구 초대를 받으셨습니다! 🎉
          </h1>

          <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 32px;">
            <strong style="color: #1a1a1a;">${inviterName}</strong>님이 Geulpi 캘린더로 당신을 초대했습니다.
            지금 가입하시면 자동으로 친구가 됩니다!
          </p>

          <a href="${appUrl}/ko/register?invitation=${invitationCode}"
             style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none;
                    font-weight: 600; font-size: 16px;">
            가입하고 친구 되기
          </a>

          <div style="margin-top: 48px; padding-top: 24px; border-top: 1px solid #e5e5e5;">
            <p style="color: #999; font-size: 14px;">
              이 초대는 7일 후 만료됩니다.<br>
              Geulpi - AI 기반 스마트 캘린더
            </p>
          </div>
        </div>
      `,
      text: `${inviterName}님이 Geulpi 캘린더로 초대했습니다!\n\n지금 가입하시면 자동으로 친구가 됩니다.\n\n가입하기: ${appUrl}/ko/register?invitation=${invitationCode}\n\n이 초대는 7일 후 만료됩니다.`
    });

    if (error) {
      console.error('❌ Email send failed:', error);
      return;
    }

    console.log('✅ Test email sent successfully!');
    console.log('- Email ID:', data?.id);
    console.log('\n📌 Note: This is a test email to "test@example.com"');
    console.log('   In production, real emails will be sent to actual user addresses.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the test
testEmailInvitation();