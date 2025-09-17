// Standalone email processor for Geulpi
// This runs outside of Next.js to avoid webpack bundling issues
const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Initialize Gmail transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER || 'team.geulpi@gmail.com',
    pass: process.env.GMAIL_APP_PASSWORD || 'ihztbovxgalpizwu',
  },
});

async function processEmailQueue() {
  console.log('[Email Processor] Starting email queue processing...');

  try {
    // Verify transporter
    await transporter.verify();
    console.log('[Email Processor] Gmail transport verified successfully');

    // Fetch pending emails from queue
    const { data: pendingEmails, error: fetchError } = await supabase
      .from('email_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10);

    if (fetchError) {
      console.error('[Email Processor] Error fetching email queue:', fetchError);
      return;
    }

    if (!pendingEmails || pendingEmails.length === 0) {
      console.log('[Email Processor] No pending emails in queue');
      return;
    }

    console.log(`[Email Processor] Found ${pendingEmails.length} pending emails`);

    // Process each email
    for (const email of pendingEmails) {
      try {
        console.log(`[Email Processor] Sending email to ${email.recipient}...`);

        // Send email
        const info = await transporter.sendMail({
          from: process.env.FROM_EMAIL || 'team.geulpi@gmail.com',
          to: email.recipient,
          subject: email.subject,
          text: email.body_text || '',
          html: email.html,
        });

        console.log(`[Email Processor] Email sent successfully. Message ID: ${info.messageId}`);

        // Update queue status
        const { error: updateError } = await supabase
          .from('email_queue')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            error_message: null,
          })
          .eq('id', email.id);

        if (updateError) {
          console.error(`[Email Processor] Error updating queue status for email ${email.id}:`, updateError);
        }

      } catch (error) {
        console.error(`[Email Processor] Error sending email ${email.id}:`, error);

        // Update queue with error
        await supabase
          .from('email_queue')
          .update({
            status: 'failed',
            error_message: error.message,
            attempts: (email.attempts || 0) + 1,
            last_attempt_at: new Date().toISOString(),
          })
          .eq('id', email.id);
      }
    }

  } catch (error) {
    console.error('[Email Processor] Fatal error:', error);
  }
}

// Process emails immediately when script runs
processEmailQueue().then(() => {
  console.log('[Email Processor] Processing complete');

  // Set up interval to process queue every 30 seconds
  if (process.argv.includes('--watch')) {
    console.log('[Email Processor] Running in watch mode. Checking queue every 30 seconds...');
    setInterval(processEmailQueue, 30000);
  } else {
    process.exit(0);
  }
});