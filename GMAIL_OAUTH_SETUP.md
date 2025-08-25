# Gmail OAuth 2.0 Setup Guide

This guide will help you set up Gmail OAuth 2.0 authentication for sending emails from your EWO backend application.

## Prerequisites

- Google account with Gmail
- Google Cloud Console access
- Node.js application with nodemailer

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Gmail API:
   - Go to "APIs & Services" > "Library"
   - Search for "Gmail API"
   - Click "Enable"

## Step 2: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Configure the OAuth consent screen:
   - User Type: External (or Internal if using Google Workspace)
   - App name: Your app name
   - User support email: Your email
   - Developer contact information: Your email
4. Add scopes:
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/gmail.compose`
5. Add test users (your Gmail address)
6. Create OAuth 2.0 Client ID:
   - Application type: Web application
   - Name: Your app name
   - Authorized redirect URIs: `http://localhost:3000/auth/google/callback` (for development)

## Step 3: Get OAuth 2.0 Tokens

### Option A: Using Google OAuth 2.0 Playground (Recommended for testing)

1. Go to [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
2. Click the settings icon (⚙️) in the top right
3. Check "Use your own OAuth credentials"
4. Enter your Client ID and Client Secret
5. Close settings
6. Select "Gmail API v1" > "https://www.googleapis.com/auth/gmail.send"
7. Click "Authorize APIs"
8. Sign in with your Gmail account
9. Click "Exchange authorization code for tokens"
10. Copy the Refresh Token

### Option B: Using your application (for production)

1. Implement OAuth 2.0 flow in your app
2. Store the refresh token securely
3. Use the refresh token for subsequent requests

## Step 4: Environment Variables

Add these variables to your `.env` file:

```env
# Gmail OAuth 2.0 Configuration
GMAIL_USER=your-gmail-address@gmail.com
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
GOOGLE_REFRESH_TOKEN=your-google-oauth-refresh-token
GOOGLE_ACCESS_TOKEN=your-google-oauth-access-token
APP_NAME=EWO App
```

## Step 5: Test the Connection

Use the provided `verifyGmailConnection()` function to test:

```javascript
import { verifyGmailConnection } from './lib/email-services-gmail.js';

// Test the connection
const isConnected = await verifyGmailConnection();
console.log('Gmail connection:', isConnected ? '✅ Success' : '❌ Failed');
```

## Step 6: Send Test Email

```javascript
import { sendEmail } from './lib/email-services-gmail.js';

try {
  await sendEmail({
    to: 'test@example.com',
    subject: 'Test Email from EWO App',
    html: '<h1>Hello!</h1><p>This is a test email.</p>',
  });
  console.log('✅ Test email sent successfully!');
} catch (error) {
  console.error('❌ Failed to send test email:', error);
}
```

## Troubleshooting

### Common Issues:

1. **EAUTH Error**: Check all environment variables are set correctly
2. **Invalid Grant**: Refresh token may have expired, regenerate it
3. **Quota Exceeded**: Gmail has daily sending limits (500 for regular accounts)
4. **Scope Issues**: Ensure you have the correct Gmail API scopes

### Debug Steps:

1. Check environment variables are loaded
2. Verify OAuth credentials in Google Cloud Console
3. Test with OAuth Playground first
4. Check Gmail account settings and security
5. Review Google Cloud Console logs

## Security Notes

- Never commit OAuth credentials to version control
- Use environment variables for all sensitive data
- Regularly rotate refresh tokens
- Monitor API usage in Google Cloud Console
- Consider using Google Workspace for production applications

## Gmail Sending Limits

- **Regular Gmail**: 500 emails/day
- **Google Workspace**: 2000 emails/day (varies by plan)
- **Rate limiting**: 100 emails/second

## Support

For additional help:

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [Nodemailer Gmail Guide](https://nodemailer.com/transports/smtp/#using-gmail)
