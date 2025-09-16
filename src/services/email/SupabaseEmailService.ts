import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { EmailOptions, FriendInvitationData } from './EmailService';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Email service using Supabase Auth and Nodemailer
export class SupabaseEmailService {
  private transporter: nodemailer.Transporter | null = null;
  private fromEmail = process.env.FROM_EMAIL || 'support@geulpi.com';

  constructor() {
    this.initializeTransporter();
  }

  /**
   * Initialize Nodemailer transporter
   */
  private async initializeTransporter() {
    // Option 1: Use Gmail with App Password
    if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      });
    }
    // Option 2: Use custom SMTP
    else if (process.env.SMTP_HOST) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }
    // Option 3: Use Supabase's built-in email (for auth emails)
    else {
      console.log('Using Supabase built-in email service');
    }
  }

  /**
   * Send email using Supabase Auth (for magic links, OTP)
   */
  async sendAuthEmail(email: string, type: 'signup' | 'magiclink' | 'recovery') {
    try {
      let result;

      switch (type) {
        case 'signup':
          result = await supabase.auth.signInWithOtp({
            email,
            options: {
              emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
            }
          });
          break;

        case 'magiclink':
          result = await supabase.auth.signInWithOtp({
            email,
            options: {
              emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
            }
          });
          break;

        case 'recovery':
          result = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
          });
          break;
      }

      if (result?.error) {
        console.error('Supabase auth email error:', result.error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error sending auth email:', error);
      return false;
    }
  }

  /**
   * Send custom email using Nodemailer
   */
  async sendCustomEmail(options: EmailOptions): Promise<boolean> {
    try {
      // Fallback to Supabase if no transporter configured
      if (!this.transporter) {
        console.log('No email transporter configured, using mock send');
        console.log('Email would be sent to:', options.to);
        console.log('Subject:', options.subject);

        // Store email in database for admin review
        await this.storeEmailInDatabase(options);
        return true;
      }

      const info = await this.transporter.sendMail({
        from: this.fromEmail,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      console.log('Email sent:', info.messageId);
      return true;
    } catch (error) {
      console.error('Email send error:', error);

      // Fallback: Store in database
      await this.storeEmailInDatabase(options);
      return false;
    }
  }

  /**
   * Store unsent email in database for later processing
   */
  private async storeEmailInDatabase(options: EmailOptions) {
    try {
      const { error } = await supabase
        .from('email_queue')
        .insert({
          recipient: options.to,
          subject: options.subject,
          html: options.html,
          body_text: options.text,
          status: 'pending',
          created_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Failed to store email in queue:', error);
      } else {
        console.log('Email queued for later delivery');
      }
    } catch (error) {
      console.error('Database error:', error);
    }
  }

  /**
   * Send friend invitation email
   */
  async sendFriendInvitation(data: FriendInvitationData): Promise<boolean> {
    const subject = `${data.inviterName}님이 Geulpi에 초대했습니다!`;

    const html = this.generateFriendInvitationHTML(data);
    const text = this.generateFriendInvitationText(data);

    return this.sendCustomEmail({
      to: data.inviteeEmail,
      subject,
      html,
      text,
    });
  }

  /**
   * Generate HTML template for friend invitation
   */
  private generateFriendInvitationHTML(data: FriendInvitationData): string {
    return `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>친구 초대</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f5f5f5;
        }
        .container {
          background: white;
          padding: 40px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .logo {
          font-size: 32px;
          font-weight: bold;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 10px;
        }
        .invitation-message {
          background: #f8fafc;
          padding: 20px;
          border-radius: 8px;
          border-left: 4px solid #667eea;
          margin: 20px 0;
        }
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          text-decoration: none;
          padding: 14px 32px;
          border-radius: 50px;
          font-weight: 600;
          margin: 20px 0;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }
        .features {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin: 30px 0;
        }
        .feature {
          padding: 15px;
          background: #f8fafc;
          border-radius: 8px;
        }
        .feature-icon {
          font-size: 24px;
          margin-bottom: 5px;
        }
        .invitation-code {
          background: #f1f5f9;
          padding: 12px;
          border-radius: 6px;
          font-family: monospace;
          font-size: 18px;
          text-align: center;
          margin: 15px 0;
          letter-spacing: 2px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">글피 GEULPI</div>
          <h1>친구가 당신을 초대했어요! 🎉</h1>
        </div>

        <p>안녕하세요!</p>
        <p><strong>${data.inviterName}</strong> (${data.inviterEmail})님이 글피에서 함께 일정을 관리하고 싶다고 하네요!</p>

        ${data.message ? `
        <div class="invitation-message">
          <strong>💬 메시지:</strong><br>
          "${data.message}"
        </div>
        ` : ''}

        <h3>글피와 함께라면:</h3>
        <div class="features">
          <div class="feature">
            <div class="feature-icon">🤖</div>
            <strong>AI 일정 관리</strong><br>
            <small>자연어로 쉽게 일정 관리</small>
          </div>
          <div class="feature">
            <div class="feature-icon">👥</div>
            <strong>친구와 공유</strong><br>
            <small>약속 자동 조율</small>
          </div>
          <div class="feature">
            <div class="feature-icon">📍</div>
            <strong>장소 추천</strong><br>
            <small>중간 지점 찾기</small>
          </div>
          <div class="feature">
            <div class="feature-icon">⏰</div>
            <strong>스마트 알림</strong><br>
            <small>중요한 일정 놓치지 않기</small>
          </div>
        </div>

        <div style="text-align: center;">
          <a href="${data.invitationUrl}" class="cta-button">
            지금 가입하고 친구 맺기 →
          </a>
        </div>

        <p><strong>초대 코드:</strong></p>
        <div class="invitation-code">
          ${data.invitationCode}
        </div>

        <p style="font-size: 14px; color: #666; margin-top: 30px;">
          링크가 작동하지 않나요? 아래 주소를 복사해서 브라우저에 붙여넣어 주세요:<br>
          <a href="${data.invitationUrl}" style="color: #667eea;">${data.invitationUrl}</a>
        </p>

        <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 14px;">
            이 초대는 7일 후 만료됩니다<br>
            글피 팀 드림 💜
          </p>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  /**
   * Generate plain text template
   */
  private generateFriendInvitationText(data: FriendInvitationData): string {
    return `
글피(GEULPI) 친구 초대

안녕하세요!

${data.inviterName} (${data.inviterEmail})님이 글피에서 함께 일정을 관리하고 싶다고 하네요!

${data.message ? `메시지: "${data.message}"` : ''}

글피와 함께라면:
• AI 일정 관리 - 자연어로 쉽게 일정 관리
• 친구와 공유 - 약속 자동 조율
• 장소 추천 - 중간 지점 찾기
• 스마트 알림 - 중요한 일정 놓치지 않기

지금 가입하기: ${data.invitationUrl}

초대 코드: ${data.invitationCode}

이 초대는 7일 후 만료됩니다.

글피 팀 드림
    `;
  }

  /**
   * Send meeting proposal email
   */
  async sendMeetingProposal(data: {
    to: string;
    proposerName: string;
    meetingTitle: string;
    proposedTime: string;
    proposedLocation: string;
    message?: string;
  }): Promise<boolean> {
    const html = `
    <div style="max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="background: white; padding: 40px; border-radius: 12px;">
        <h2 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
          📅 새로운 약속 제안
        </h2>

        <p><strong>${data.proposerName}</strong>님이 약속을 제안했습니다.</p>

        <div style="background: linear-gradient(135deg, #f5f3ff 0%, #faf5ff 100%); padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
          <h3 style="margin-top: 0;">${data.meetingTitle}</h3>
          <p>📅 <strong>제안 시간:</strong> ${data.proposedTime}</p>
          <p>📍 <strong>제안 장소:</strong> ${data.proposedLocation}</p>
          ${data.message ? `<p>💬 <strong>메시지:</strong> ${data.message}</p>` : ''}
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard"
             style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white; text-decoration: none; padding: 12px 30px; border-radius: 50px;
                    font-weight: 600; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
            글피에서 확인하기 →
          </a>
        </div>
      </div>
    </div>
    `;

    return this.sendCustomEmail({
      to: data.to,
      subject: `${data.proposerName}님의 약속 제안: ${data.meetingTitle}`,
      html,
      text: `${data.proposerName}님이 약속을 제안했습니다.\n\n제목: ${data.meetingTitle}\n시간: ${data.proposedTime}\n장소: ${data.proposedLocation}${data.message ? `\n메시지: ${data.message}` : ''}`
    });
  }

  /**
   * Send meeting accepted email
   */
  async sendMeetingAccepted(data: {
    to: string;
    accepterName: string;
    meetingTitle: string;
    finalTime: string;
    finalLocation: string;
  }): Promise<boolean> {
    const html = `
    <div style="max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="background: white; padding: 40px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="display: inline-block; background: #10b981; color: white; padding: 8px 20px; border-radius: 50px; font-weight: 600;">
            ✅ 약속 확정
          </div>
        </div>

        <h2 style="text-align: center; color: #333;">약속이 확정되었습니다!</h2>

        <p style="text-align: center; color: #666;">
          <strong>${data.accepterName}</strong>님이 약속을 승인했습니다.
        </p>

        <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #10b981;">
          <h3 style="margin-top: 0; color: #059669;">${data.meetingTitle}</h3>
          <p>📅 <strong>확정 시간:</strong> ${data.finalTime}</p>
          <p>📍 <strong>확정 장소:</strong> ${data.finalLocation}</p>
        </div>

        <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-top: 20px;">
          <p style="margin: 0; font-size: 14px; color: #666;">
            💡 팁: 글피 캘린더에 자동으로 추가되었습니다. 알림을 설정하는 것을 잊지 마세요!
          </p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard"
             style="display: inline-block; background: #10b981; color: white; text-decoration: none;
                    padding: 12px 30px; border-radius: 50px; font-weight: 600;">
            캘린더에서 보기 →
          </a>
        </div>
      </div>
    </div>
    `;

    return this.sendCustomEmail({
      to: data.to,
      subject: `✅ 약속 확정: ${data.meetingTitle}`,
      html,
      text: `약속이 확정되었습니다!\n\n제목: ${data.meetingTitle}\n시간: ${data.finalTime}\n장소: ${data.finalLocation}`
    });
  }
}

// Export singleton instance
export const supabaseEmailService = new SupabaseEmailService();

// Export as default
export default SupabaseEmailService;