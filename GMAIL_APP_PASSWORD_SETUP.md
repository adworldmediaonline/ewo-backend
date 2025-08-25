# Gmail App Password Setup Guide

This guide will help you set up Gmail App Password authentication for sending emails from your EWO backend application. This method is simpler and more reliable than OAuth 2.0.

## Prerequisites

- Google account with Gmail
- 2-Step Verification enabled on your Google account
- Node.js application with nodemailer

## Step 1: Enable 2-Step Verification

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Click on "2-Step Verification"
3. Follow the setup process to enable 2-Step Verification
4. You'll need your phone number and may need to verify with a code

## Step 2: Generate App Password

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Click on "App passwords" (under 2-Step Verification)
3. Click "Select app" and choose "Mail"
4. Click "Select device" and choose "Other (Custom name)"
5. Enter a name like "EWO Backend Server"
6. Click "Generate"
7. **Copy the 16-character password** (it looks like: `abcd efgh ijkl mnop`)

## Step 3: Environment Variables

Add these variables to your `.env` file:

```env
# Gmail App Password Configuration
GMAIL_USER=your-gmail-address@gmail.com
GOOGLE_APP_PASSWORD=your-16-character-app-password
APP_NAME=EWO App
```

**Important:**

- Remove spaces from the app password
- The password is case-sensitive
- Keep it secure and never commit to version control

## Step 4: Test the Connection

Use the provided test script:

```bash
cd ewo-backend
node test-gmail-oauth.js
```

Or test manually:

```javascript
import { verifyGmailConnection } from './lib/email-services-gmail.js';

// Test the connection
const isConnected = await verifyGmailConnection();
console.log('Gmail connection:', isConnected ? '✅ Success' : '❌ Failed');
```

## Step 5: Send Test Email

```javascript
import { sendEmailGmail } from './lib/email-services-gmail.js';

try {
  await sendEmailGmail({
    to: 'test@example.com',
    subject: 'Test Email from EWO App',
    html: '<h1>Hello!</h1><p>This is a test email.</p>',
  });
  console.log('✅ Test email sent successfully!');
} catch (error) {
  console.error('❌ Failed to send test email:', error);
}
```

## Benefits of App Passwords

✅ **Simpler Setup** - No OAuth 2.0 complexity
✅ **More Reliable** - Bypasses most Google security heuristics
✅ **Easier Maintenance** - No token refresh issues
✅ **Better for Servers** - Designed for automated services
✅ **Individual Control** - Each password can be revoked separately

## Troubleshooting

### Common Issues:

1. **EAUTH Error**: Check GMAIL_USER and GOOGLE_APP_PASSWORD are set correctly
2. **2-Step Verification Required**: App passwords only work with 2-Step Verification enabled
3. **Invalid Password**: Ensure you copied the full 16-character password without spaces
4. **Account Security**: Google may block if it detects unusual activity

### Debug Steps:

1. Verify 2-Step Verification is enabled
2. Check environment variables are loaded
3. Ensure app password was generated for "Mail" app
4. Test with the provided test script
5. Check Gmail account settings and security

## Security Best Practices

- **Never commit app passwords** to version control
- **Use environment variables** for all sensitive data
- **Generate unique passwords** for different applications
- **Regularly review** app passwords in Google Account
- **Revoke unused passwords** immediately
- **Monitor account activity** for suspicious behavior

## Gmail Sending Limits

- **Regular Gmail**: 500 emails/day
- **Google Workspace**: 2000 emails/day (varies by plan)
- **Rate limiting**: 100 emails/second
- **App passwords**: Same limits as regular Gmail

## Migration from OAuth 2.0

If you were previously using OAuth 2.0:

1. **Remove OAuth variables** from your `.env` file:

   ```env
   # Remove these:
   # GOOGLE_CLIENT_ID=...
   # GOOGLE_CLIENT_SECRET=...
   # GOOGLE_REFRESH_TOKEN=...
   # GOOGLE_ACCESS_TOKEN=...
   ```

2. **Add App Password variables**:

   ```env
   GOOGLE_APP_PASSWORD=your-16-character-password
   ```

3. **Update your code** to use `sendEmailGmail` instead of OAuth functions

## Support

For additional help:

- [Google Account Security](https://myaccount.google.com/security)
- [Gmail Help - App Passwords](https://support.google.com/accounts/answer/185833)
- [Nodemailer Gmail Guide](https://nodemailer.com/transports/smtp/#using-gmail)

## Quick Test

After setup, run this quick test:

```bash
# Test connection
node -e "
import { verifyGmailConnection } from './lib/email-services-gmail.js';
verifyGmailConnection().then(result => console.log('Connection:', result ? '✅ Success' : '❌ Failed'));
"
```

Your Gmail App Password setup should now work reliably! 🚀📧
