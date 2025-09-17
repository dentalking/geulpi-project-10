const nodemailer = require('nodemailer');

// Check environment variables
console.log('Environment variables check:');
console.log('GMAIL_USER:', process.env.GMAIL_USER || 'team.geulpi@gmail.com');
console.log('GMAIL_APP_PASSWORD:', process.env.GMAIL_APP_PASSWORD ? '[SET]' : '[NOT SET]');

// Use hardcoded values for testing
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'team.geulpi@gmail.com',
    pass: 'ihztbovxgalpizwu'
  }
});

// Verify transporter
transporter.verify((error, success) => {
  if (error) {
    console.error('Gmail verification failed:', error);
  } else {
    console.log('Gmail is ready to send emails!');

    // Send test email
    const mailOptions = {
      from: 'team.geulpi@gmail.com',
      to: 'optiroomhr@gmail.com',
      subject: '글피 친구 초대 테스트',
      text: '이것은 글피에서 보내는 테스트 이메일입니다.',
      html: '<h1>글피 친구 초대</h1><p>이것은 테스트 이메일입니다.</p>'
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Failed to send email:', error);
      } else {
        console.log('Email sent successfully!');
        console.log('Message ID:', info.messageId);
        console.log('Response:', info.response);
      }
    });
  }
});