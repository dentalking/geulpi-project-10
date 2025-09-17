import { NextRequest, NextResponse } from 'next/server';

// Force this route to run only on the server
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Use require for Node.js modules in server-only context
    const nodemailer = require('nodemailer');

    // Log environment variables (without exposing password)
    console.log('[Test Email API] Environment check:', {
      GMAIL_USER: process.env.GMAIL_USER,
      GMAIL_APP_PASSWORD: process.env.GMAIL_APP_PASSWORD ? '[SET]' : '[NOT SET]',
      FROM_EMAIL: process.env.FROM_EMAIL,
    });

    // Create transporter directly
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER || 'team.geulpi@gmail.com',
        pass: process.env.GMAIL_APP_PASSWORD || 'ihztbovxgalpizwu',
      },
    });

    // Verify transporter
    await new Promise((resolve, reject) => {
      transporter.verify((error, success) => {
        if (error) {
          console.error('[Test Email API] Verification failed:', error);
          reject(error);
        } else {
          console.log('[Test Email API] Gmail transporter verified successfully');
          resolve(success);
        }
      });
    });

    // Send test email
    const info = await transporter.sendMail({
      from: process.env.FROM_EMAIL || 'team.geulpi@gmail.com',
      to: 'optiroomhr@gmail.com',
      subject: '글피 테스트 이메일',
      text: '이것은 글피에서 보내는 테스트 이메일입니다.',
      html: '<h1>글피 테스트</h1><p>이메일이 정상적으로 작동합니다!</p>',
    });

    console.log('[Test Email API] Email sent:', info.messageId);

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      response: info.response,
    });

  } catch (error: any) {
    console.error('[Test Email API] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}