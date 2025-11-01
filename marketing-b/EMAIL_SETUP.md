# Email Configuration with Nodemailer

## Overview
This project uses **Nodemailer** with SMTP for sending emails. Nodemailer is a popular Node.js module that supports any email provider with SMTP capabilities.

## Migration from SendGrid
✅ **Completed**: Migrated from SendGrid API to Nodemailer SMTP

### Changes Made:
1. Replaced `@sendgrid/mail` with `nodemailer`
2. Updated `email.service.ts` to use SMTP transport
3. Removed `SENDGRID_API_KEY` from environment variables
4. Added TypeScript types for nodemailer

## Environment Configuration

Your `.env` file should have the following email-related variables:

```env
# Email Configuration (SMTP)
EMAIL_HOST=mail.privateemail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=contact@clearroot.cloud
EMAIL_FROM=ClearRoot <contact@clearroot.cloud>
EMAIL_PASSWORD=your-email-password
```

### Configuration Details:
- **EMAIL_HOST**: Your SMTP server hostname
- **EMAIL_PORT**: SMTP port (587 for TLS, 465 for SSL, 25 for unencrypted)
- **EMAIL_SECURE**: Set to `true` for port 465, `false` for other ports (uses STARTTLS)
- **EMAIL_USER**: Your email account username
- **EMAIL_FROM**: Sender name and email address
- **EMAIL_PASSWORD**: Your email account password or app-specific password

## Supported Email Providers

Nodemailer works with any SMTP-compatible email provider:

### Popular Options:
1. **Gmail** (Free with app passwords)
   ```env
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_SECURE=false
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-app-password
   ```

2. **Outlook/Hotmail**
   ```env
   EMAIL_HOST=smtp-mail.outlook.com
   EMAIL_PORT=587
   EMAIL_SECURE=false
   ```

3. **Yahoo Mail**
   ```env
   EMAIL_HOST=smtp.mail.yahoo.com
   EMAIL_PORT=587
   EMAIL_SECURE=false
   ```

4. **Custom Domain Email** (PrivateEmail, Namecheap, etc.)
   - Use the SMTP settings provided by your hosting provider

5. **Transactional Email Services**
   - **AWS SES**: smtp.us-east-1.amazonaws.com
   - **Mailgun**: smtp.mailgun.org
   - **Postmark**: smtp.postmarkapp.com
   - **Brevo (Sendinblue)**: smtp-relay.sendinblue.com

## Features

### Included Email Functions:
- ✉️ Email verification
- 🔒 Password reset
- 📅 Plan expiry reminders
- 🧪 Test email sending

### Built-in Features:
- ✅ Automatic retry logic (3 attempts)
- ✅ Connection verification
- ✅ Error handling with detailed logging
- ✅ Support for HTML emails

## Testing the Connection

The email service includes a `testConnection()` method that verifies your SMTP configuration:

```typescript
import { EmailService } from './services/email.service';

// In your controller or service
const isConnected = await this.emailService.testConnection();
if (isConnected) {
  console.log('✅ Email service is ready');
}
```

## Sending Test Emails

Use the built-in test method:

```typescript
await this.emailService.sendTestEmail(
  'recipient@example.com',
  'Test Subject',
  '<h1>Hello from Nodemailer!</h1>'
);
```

## Common Issues & Solutions

### Issue: "Cannot find module 'nodemailer'"
**Solution**: Restart your TypeScript server or IDE

### Issue: Authentication failed
**Solutions**:
- For Gmail: Enable 2FA and use an [App Password](https://support.google.com/accounts/answer/185833)
- For other providers: Check if you need app-specific passwords
- Verify your EMAIL_USER and EMAIL_PASSWORD are correct

### Issue: Connection timeout
**Solutions**:
- Check your firewall settings
- Verify the EMAIL_HOST and EMAIL_PORT are correct
- Some networks block port 587, try port 465 with `EMAIL_SECURE=true`

### Issue: Emails going to spam
**Solutions**:
- Set up SPF, DKIM, and DMARC records for your domain
- Use a verified domain email address
- Avoid spam trigger words in subject lines

## Receiving Emails

To receive emails, you have several options:

### 1. Email Forwarding
Set up forwarding rules in your email provider to forward incoming emails to a webhook endpoint.

### 2. IMAP Integration
Use `nodemailer-imap` or `imap-simple` to read incoming emails:

```bash
pnpm add imap-simple mailparser
```

### 3. Email API Services
Consider using:
- **SendGrid Inbound Parse** (webhook-based)
- **Mailgun Routes** (webhook-based)
- **AWS SES with S3** (store incoming emails)
- **Postmark Inbound** (webhook-based)

### 4. Custom Implementation Example
```typescript
// For IMAP-based email receiving
import * as imaps from 'imap-simple';

const config = {
  imap: {
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    host: 'imap.yourprovider.com',
    port: 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false }
  }
};

const connection = await imaps.connect(config);
const messages = await connection.search(['UNSEEN'], {
  bodies: ['HEADER', 'TEXT'],
  markSeen: true
});
```

## Benefits Over SendGrid

✅ **No API limits** - Send as many emails as your SMTP server allows  
✅ **No paid plans required** - Works with free email providers  
✅ **Provider flexibility** - Easy to switch between providers  
✅ **Better privacy** - Emails sent directly from your server  
✅ **Lower costs** - Use your existing email hosting  

## Need Help?

- Nodemailer Docs: https://nodemailer.com/
- SMTP Settings: Check your email provider's documentation
- Debugging: Enable debug logs with `debug: true` in transporter config
