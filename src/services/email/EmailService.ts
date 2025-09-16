import { Resend } from 'resend';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

// Email service interface
export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Friend invitation email data
export interface FriendInvitationData {
  inviterName: string;
  inviterEmail: string;
  inviteeEmail: string;
  invitationCode: string;
  message?: string;
  invitationUrl: string;
}

export class EmailService {
  private fromEmail = process.env.FROM_EMAIL || 'noreply@geulpi.com';

  /**
   * Send a generic email
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      if (!process.env.RESEND_API_KEY) {
        console.warn('RESEND_API_KEY not configured, skipping email send');
        return false;
      }

      const { data, error } = await resend.emails.send({
        from: this.fromEmail,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      if (error) {
        console.error('Error sending email:', error);
        return false;
      }

      console.log('Email sent successfully:', data);
      return true;
    } catch (error) {
      console.error('Email service error:', error);
      return false;
    }
  }

  /**
   * Send friend invitation email to non-registered users
   */
  async sendFriendInvitation(data: FriendInvitationData): Promise<boolean> {
    const subject = `${data.inviterName} invited you to join Geulpi!`;

    const html = this.generateFriendInvitationHTML(data);
    const text = this.generateFriendInvitationText(data);

    return this.sendEmail({
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
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
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
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .logo {
          font-size: 28px;
          font-weight: bold;
          color: #6366f1;
          margin-bottom: 10px;
        }
        .invitation-message {
          background: #f8fafc;
          padding: 20px;
          border-radius: 8px;
          border-left: 4px solid #6366f1;
          margin: 20px 0;
        }
        .cta-button {
          display: inline-block;
          background: #6366f1;
          color: white;
          text-decoration: none;
          padding: 14px 28px;
          border-radius: 8px;
          font-weight: 500;
          margin: 20px 0;
        }
        .cta-button:hover {
          background: #5856eb;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          color: #666;
          font-size: 14px;
        }
        .invitation-code {
          background: #f1f5f9;
          padding: 10px;
          border-radius: 6px;
          font-family: monospace;
          text-align: center;
          margin: 15px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">📅 Geulpi</div>
          <h1>친구 초대를 받으셨습니다!</h1>
        </div>

        <p><strong>${data.inviterName}</strong> (${data.inviterEmail})님이 Geulpi에서 친구가 되고 싶다고 하네요!</p>

        ${data.message ? `
        <div class="invitation-message">
          <strong>메시지:</strong><br>
          "${data.message}"
        </div>
        ` : ''}

        <p>Geulpi는 AI 기반 캘린더 도우미로, 친구들과 일정을 쉽게 공유하고 관리할 수 있습니다.</p>

        <div style="text-align: center;">
          <a href="${data.invitationUrl}" class="cta-button">
            지금 가입하고 친구되기
          </a>
        </div>

        <p><strong>초대 코드:</strong></p>
        <div class="invitation-code">
          ${data.invitationCode}
        </div>

        <p style="font-size: 14px; color: #666;">
          위 링크가 작동하지 않으면, 다음 주소를 복사해서 브라우저에 붙여넣기 하세요:<br>
          <a href="${data.invitationUrl}">${data.invitationUrl}</a>
        </p>

        <div class="footer">
          <p>이 초대장은 7일간 유효합니다.</p>
          <p>Geulpi 팀 드림</p>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  /**
   * Generate plain text template for friend invitation
   */
  private generateFriendInvitationText(data: FriendInvitationData): string {
    return `
Geulpi 친구 초대

${data.inviterName} (${data.inviterEmail})님이 Geulpi에서 친구가 되고 싶다고 하네요!

${data.message ? `메시지: "${data.message}"` : ''}

Geulpi는 AI 기반 캘린더 도우미로, 친구들과 일정을 쉽게 공유하고 관리할 수 있습니다.

지금 가입하고 친구되기: ${data.invitationUrl}

초대 코드: ${data.invitationCode}

이 초대장은 7일간 유효합니다.

Geulpi 팀 드림
    `;
  }

  /**
   * Generate invitation URL with code
   */
  static generateInvitationUrl(invitationCode: string, baseUrl?: string): string {
    const domain = baseUrl || process.env.NEXTAUTH_URL || 'http://localhost:3000';
    return `${domain}/register?invitation=${encodeURIComponent(invitationCode)}`;
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
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
      <h2>📅 새로운 약속 제안</h2>
      <p><strong>${data.proposerName}</strong>님이 약속을 제안했습니다.</p>

      <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>${data.meetingTitle}</h3>
        <p><strong>📅 제안 시간:</strong> ${data.proposedTime}</p>
        <p><strong>📍 제안 장소:</strong> ${data.proposedLocation}</p>
        ${data.message ? `<p><strong>메시지:</strong> ${data.message}</p>` : ''}
      </div>

      <p>Geulpi에서 약속을 확인하고 응답해보세요!</p>
    </div>
    `;

    return this.sendEmail({
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
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
      <h2>✅ 약속이 확정되었습니다!</h2>
      <p><strong>${data.accepterName}</strong>님이 약속을 승인했습니다.</p>

      <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
        <h3>${data.meetingTitle}</h3>
        <p><strong>📅 확정 시간:</strong> ${data.finalTime}</p>
        <p><strong>📍 확정 장소:</strong> ${data.finalLocation}</p>
      </div>

      <p>약속을 캘린더에 추가하는 것을 잊지 마세요!</p>
    </div>
    `;

    return this.sendEmail({
      to: data.to,
      subject: `약속 확정: ${data.meetingTitle}`,
      html,
      text: `약속이 확정되었습니다!\n\n제목: ${data.meetingTitle}\n시간: ${data.finalTime}\n장소: ${data.finalLocation}`
    });
  }
}

// Export singleton instance
export const emailService = new EmailService();

// Export as default
export default EmailService;