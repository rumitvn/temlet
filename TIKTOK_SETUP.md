# TikTok API Setup Guide

To use the TikTok upload feature, you need to set up TikTok OAuth2 authentication.

## Required Environment Variables

Add these to your `.env.local` file:

```env
# TikTok API Credentials (from TikTok Developer Console)
TIKTOK_CLIENT_KEY=your_client_key_here
TIKTOK_CLIENT_SECRET=your_client_secret_here

# TikTok OAuth Redirect URI (must match your app configuration)
TIKTOK_REDIRECT_URI=http://localhost:3000/callback/tiktok

# Public variables (for frontend)
NEXT_PUBLIC_TIKTOK_CLIENT_KEY=your_client_key_here
NEXT_PUBLIC_TIKTOK_REDIRECT_URI=http://localhost:3000/callback/tiktok
```

## How to Get TikTok API Credentials

1. **Create a TikTok Developer Account**
   - Go to [TikTok for Developers](https://developers.tiktok.com/)
   - Sign up for a developer account

2. **Create an App**
   - Create a new app in the TikTok developer console
   - Select "Content Posting" as the app type
   - Configure your app settings

3. **Configure OAuth Settings**
   - In your app settings, add the redirect URI: `http://localhost:3000/callback/tiktok`
   - If that doesn't work, try these alternatives:
     - `http://localhost:3000/callback`
     - `http://localhost:3000/auth/callback`
     - `http://localhost:3000/oauth/callback`
   - Make sure your app has the required scopes:
     - `user.info.basic`
     - `video.upload`
     - `video.publish`

4. **Get API Credentials**
   - Copy your Client Key and Client Secret from the app dashboard
   - These will be used for OAuth2 authentication

## Alternative Solutions if Localhost Doesn't Work

### Option 1: Use ngrok (Recommended for Testing)
1. Download ngrok from [ngrok.com](https://ngrok.com/)
2. Run your app: `npm run dev`
3. In another terminal: `ngrok http 3000`
4. Use the ngrok URL: `https://abc123.ngrok.io/callback/tiktok`

### Option 2: Deploy to Production
1. Deploy to Vercel/Netlify/Railway
2. Use production URL: `https://your-app.vercel.app/callback/tiktok`

### Option 3: Custom Domain
1. Add to hosts file: `127.0.0.1 myapp.local`
2. Use: `http://myapp.local:3000/callback/tiktok`

## How It Works

1. **User clicks "Upload to TikTok"** - If not authenticated, the auth dialog opens
2. **OAuth2 Flow** - User is redirected to TikTok to authorize your app
3. **Token Exchange** - Your app exchanges the authorization code for an access token
4. **Upload** - Videos are uploaded using the user's access token

## Features

- ✅ OAuth2 authentication with TikTok
- ✅ Uploads videos as drafts to your TikTok account
- ✅ Uses the same metadata (title, description, tags) as YouTube uploads
- ✅ Handles token refresh automatically
- ✅ Secure token storage

## Notes

- Videos are uploaded as drafts, so you can review them before publishing
- The access token is stored temporarily (for personal use)
- You'll need to re-authenticate when the token expires
- Make sure your video files meet TikTok's requirements (format, size, duration)

## Troubleshooting

### "404 Not Found" Error
- Make sure your app is approved for Content Posting API
- Check that your redirect URI matches exactly
- Verify your Client Key and Secret are correct

### "Invalid Scope" Error
- Ensure your app has the required scopes: `user.info.basic,video.upload,video.publish`
- Check your app's permissions in the TikTok developer console

### "Access Denied" Error
- Your app may not be approved for Content Posting API
- Contact TikTok support for API access

### Redirect URI Issues
- Try different callback paths: `/callback`, `/auth/callback`, `/oauth/callback`
- Use ngrok for local development
- Deploy to production for permanent solution 