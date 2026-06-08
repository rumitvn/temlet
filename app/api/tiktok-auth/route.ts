import { NextResponse } from "next/server";
import { logger } from "@/app/lib/logger";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  if (!code) {
    return NextResponse.json({ error: 'No authorization code received' }, { status: 400 });
  }

  try {
    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cache-Control': 'no-cache',
      },
      body: new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY!,
        client_secret: process.env.TIKTOK_CLIENT_SECRET!,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.TIKTOK_REDIRECT_URI!,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      logger.error('TikTok token exchange error:', errorText);
      return NextResponse.json({ error: 'Failed to exchange code for token' }, { status: 500 });
    }

    const tokenData = await tokenResponse.json();
    
    // Store the access token (in production, you'd store this securely)
    // For now, we'll store it in a simple way - you might want to use a database
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in;

    logger.debug('TikTok access token obtained successfully');
    logger.debug('Access Token:', accessToken);
    logger.debug('Refresh Token:', refreshToken);
    logger.debug('Expires In:', expiresIn);

    // Store tokens in environment variables (temporary solution for personal use)
    // In a real app, you'd store these in a database
    process.env.TIKTOK_ACCESS_TOKEN = accessToken;
    process.env.TIKTOK_REFRESH_TOKEN = refreshToken;
    process.env.TIKTOK_TOKEN_EXPIRES_AT = (Date.now() + expiresIn * 1000).toString();

    return NextResponse.json({ 
      success: true, 
      message: 'TikTok authentication successful! You can now upload videos.',
      accessToken: accessToken,
      expiresIn: expiresIn
    });

  } catch (error) {
    logger.error('TikTok auth error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
} 