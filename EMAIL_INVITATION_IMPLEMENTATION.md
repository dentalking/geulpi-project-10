# Email Invitation System Implementation

## Overview

This implementation adds email invitation functionality to the friend request system, allowing users to invite non-registered users via email. When a friend request is sent to a non-registered email address, the system automatically creates an invitation record in the database and sends a beautifully formatted email invitation.

## Components Implemented

### 1. Email Service (`src/services/email/EmailService.ts`)

**Features:**
- Uses [Resend](https://resend.com) as the email service provider
- Responsive HTML email templates with modern design
- Plain text fallbacks for email clients
- Automatic invitation URL generation
- Error handling and graceful degradation

**Key Methods:**
- `sendFriendInvitation()`: Sends formatted invitation emails
- `generateInvitationUrl()`: Creates signup links with invitation codes
- `sendEmail()`: Generic email sending method

### 2. Enhanced Friend Request API (`src/app/api/friends/request/route.ts`)

**New Features:**
- Detects when friend email is not registered
- Generates unique invitation codes (22 characters)
- Creates database records in `friend_invitations` table
- Sends invitation emails automatically
- Returns detailed response including email send status

**Response Format:**
```json
{
  "success": true,
  "type": "invitation",
  "invitation": { ... },
  "emailSent": true,
  "message": "User not yet registered. Invitation email sent."
}
```

### 3. Invitation Info API (`src/app/api/invitations/info/route.ts`)

**Purpose:** Validates and retrieves invitation details for registration flow

**Features:**
- Validates invitation codes
- Checks expiration (7 days from creation)
- Returns inviter information for UI display
- Automatically marks expired invitations

### 4. Invitation Accept API (`src/app/api/invitations/accept/route.ts`)

**Purpose:** Processes invitation acceptance and creates friendships

**Features:**
- Verifies user authentication
- Validates invitation ownership (email match)
- Creates friendship records automatically
- Marks invitations as accepted
- Prevents duplicate friendships

### 5. Enhanced Registration Page (`src/app/[locale]/register/page.tsx`)

**New Features:**
- Detects invitation codes from URL parameters
- Displays invitation information banner
- Pre-fills email from invitation
- Automatically accepts friend requests on successful registration
- Enhanced UI for invitation flow

### 6. Database Schema (`schema/friends-schema.sql`)

**`friend_invitations` Table:**
```sql
CREATE TABLE friend_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inviter_id UUID NOT NULL REFERENCES users(id),
  invitee_email VARCHAR(255) NOT NULL,
  invitation_code VARCHAR(100) UNIQUE NOT NULL,
  message TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '7 days',
  accepted_at TIMESTAMP
);
```

## Email Template Design

### HTML Template Features:
- **Modern Design**: Clean, professional layout with Geulpi branding
- **Responsive**: Mobile-friendly design
- **Clear CTA**: Prominent "Join Now" button
- **Personal Touch**: Displays inviter name and custom message
- **Code Display**: Shows invitation code for manual entry
- **Fallback URL**: Full URL provided for copy/paste

### Text Template:
- Simple, clean format for plain text email clients
- All essential information included
- Compatible with screen readers

## Configuration

### Environment Variables

Add to your `.env.local`:

```env
# Email Configuration (Resend)
RESEND_API_KEY=your_resend_api_key
FROM_EMAIL=noreply@yourdomain.com
```

### Dependencies

Added to `package.json`:
```json
{
  "dependencies": {
    "resend": "^4.0.1"
  }
}
```

## User Flow

### 1. Sending Invitation
1. User enters non-registered email in friend request form
2. System creates invitation record with unique code
3. Email is sent to invitee with signup link
4. Inviter receives confirmation

### 2. Receiving Invitation
1. Invitee receives email with personalized message
2. Clicks link or visits registration page with invitation code
3. Registration form shows invitation details
4. Email is pre-filled from invitation

### 3. Registration with Invitation
1. User completes registration form
2. Account is created successfully
3. User is automatically logged in
4. Friendship is created immediately
5. Invitation is marked as accepted

## Testing

### Component Tests
Run: `node scripts/test-email-service.js`

**Tests:**
- Invitation URL generation
- Email template validation
- Configuration validation
- Invitation code generation

### Integration Testing
Run: `node scripts/test-email-invitation.js`

**Tests:**
- End-to-end invitation flow
- Email sending (requires API key)
- Database operations
- API endpoints

## Security Features

### Invitation Validation:
- **Unique Codes**: 22-character random strings
- **Expiration**: 7-day automatic expiration
- **Email Verification**: Must match invitation email
- **Single Use**: Invitations can only be accepted once

### Authentication:
- **JWT Verification**: All API calls require authentication
- **User Matching**: Invitations tied to specific email addresses
- **CSRF Protection**: Standard Next.js protections

## Error Handling

### Graceful Degradation:
- **Email Fails**: Invitation still created, manual sharing possible
- **Invalid Codes**: Clear error messages
- **Expired Invitations**: Automatic cleanup and user notification
- **Duplicate Invitations**: Prevention and appropriate messaging

## Performance Considerations

### Optimizations:
- **Async Email**: Non-blocking email sending
- **Template Caching**: Reuse of email template structure
- **Database Indexes**: Efficient invitation lookups
- **Minimal Dependencies**: Lightweight email service

## Monitoring & Logging

### Logged Events:
- Email send success/failure
- Invitation creation
- Invitation acceptance
- Expiration processing

## Future Enhancements

### Potential Improvements:
1. **Email Templates**: Multiple template designs
2. **Reminder Emails**: Follow-up for pending invitations
3. **Bulk Invitations**: Multiple recipients at once
4. **Custom Domains**: Branded email addresses
5. **Analytics**: Invitation conversion tracking
6. **Localization**: Multi-language email templates

## Deployment Notes

### Production Setup:
1. **Resend Account**: Verify domain for production
2. **Environment Variables**: Set all required keys
3. **SMTP**: Configure for high deliverability
4. **Rate Limiting**: Prevent invitation spam
5. **Monitoring**: Track email delivery rates

## API Reference

### Friend Request
```
POST /api/friends/request
Body: { friendEmail: string, message?: string }
Response: { success: boolean, type: 'invitation'|'request', emailSent: boolean }
```

### Invitation Info
```
GET /api/invitations/info?code=<invitation_code>
Response: { success: boolean, invitation: { inviterName, inviterEmail, message } }
```

### Accept Invitation
```
POST /api/invitations/accept
Body: { invitationCode: string }
Response: { success: boolean, friendship: object }
```

---

## Installation & Setup

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment:**
   ```bash
   cp .env.example .env.local
   # Add RESEND_API_KEY and FROM_EMAIL
   ```

3. **Run Tests:**
   ```bash
   node scripts/test-email-service.js
   ```

4. **Start Development:**
   ```bash
   npm run dev
   ```

The email invitation system is now fully integrated and ready for testing!