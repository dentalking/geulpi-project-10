# Email Service Setup Guide

## Overview
We've implemented a flexible email service that supports multiple providers:
1. **Supabase Auth** - For authentication emails (magic links, OTPs)
2. **Gmail with App Password** - Free, reliable email service
3. **Custom SMTP** - For enterprise use
4. **Email Queue** - Database fallback when email service is unavailable

## Comparison with Resend

| Feature | Resend | Our Solution |
|---------|--------|--------------|
| **Free Tier** | 100 emails/month | 500 emails/day (Gmail) |
| **Cost** | $20/month for 10,000 | Free (Gmail) or $0 (Supabase) |
| **Reliability** | Good | Excellent (Google infrastructure) |
| **Setup Complexity** | Easy | Medium |
| **API Key Required** | Yes | No (for Supabase), Yes (for Gmail) |
| **Database Fallback** | No | Yes (Email Queue) |
| **Auth Email Support** | No | Yes (Supabase Auth) |

## Setup Instructions

### Option 1: Gmail with App Password (Recommended)

1. **Enable 2-Factor Authentication on Gmail**
   - Go to https://myaccount.google.com/security
   - Enable "2-Step Verification"

2. **Generate App Password**
   - Visit https://myaccount.google.com/apppasswords
   - Select "Mail" and your device
   - Copy the 16-character password

3. **Configure Environment Variables**
   ```env
   GMAIL_USER=your-email@gmail.com
   GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
   FROM_EMAIL=support@geulpi.com
   ```

4. **Deploy to Vercel**
   ```bash
   vercel env add GMAIL_USER
   vercel env add GMAIL_APP_PASSWORD
   vercel env add FROM_EMAIL
   ```

### Option 2: Supabase Auth Only (Simplest)

Already configured! Supabase handles:
- Magic links
- Password reset emails
- OTP verification

No additional setup required.

### Option 3: Custom SMTP

For enterprise users with existing email infrastructure:

```env
SMTP_HOST=smtp.yourdomain.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=email@yourdomain.com
SMTP_PASS=your-password
```

## Email Queue System

When email service is unavailable, emails are automatically stored in database:

```sql
-- View pending emails
SELECT * FROM email_queue WHERE status = 'pending';

-- Manually process queue
SELECT * FROM process_email_queue();
```

## Testing

Test email sending:
```javascript
// Test in API route
import { supabaseEmailService } from '@/services/email/SupabaseEmailService';

await supabaseEmailService.sendCustomEmail({
  to: 'test@example.com',
  subject: 'Test Email',
  html: '<h1>Hello World</h1>',
  text: 'Hello World'
});
```

## Monitoring

Check email queue status:
```sql
-- Check email statistics
SELECT
  status,
  COUNT(*) as count,
  MAX(created_at) as latest
FROM email_queue
GROUP BY status;
```

## Benefits Over Resend

1. **Cost Savings**: $0 vs $20+/month
2. **Higher Limits**: 500/day vs 100/month on free tier
3. **Reliability**: Google's infrastructure
4. **Flexibility**: Multiple provider options
5. **Resilience**: Database queue as fallback
6. **Integration**: Built-in Supabase Auth support

## Migration from Resend

1. Remove Resend dependency:
   ```bash
   npm uninstall resend
   ```

2. Update imports:
   ```typescript
   // Before
   import { EmailService } from '@/services/email/EmailService';

   // After
   import { supabaseEmailService } from '@/services/email/SupabaseEmailService';
   ```

3. Update method calls (same API):
   ```typescript
   await supabaseEmailService.sendFriendInvitation(data);
   await supabaseEmailService.sendMeetingProposal(data);
   ```

## Production Checklist

- [ ] Set up Gmail App Password
- [ ] Configure environment variables in Vercel
- [ ] Test email sending in production
- [ ] Monitor email queue table
- [ ] Set up email queue processing (optional cron job)