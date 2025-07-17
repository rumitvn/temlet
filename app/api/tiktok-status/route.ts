import { NextResponse } from "next/server";

export async function GET() {
  try {
    const accessToken = process.env.TIKTOK_ACCESS_TOKEN;
    
    if (!accessToken) {
      return NextResponse.json({ 
        connected: false, 
        message: "No TikTok access token found" 
      });
    }

    // Optionally verify the token is still valid by making a test API call
    // For now, we'll just check if the token exists
    return NextResponse.json({ 
      connected: true, 
      message: "TikTok account connected" 
    });

  } catch (error) {
    console.error('Error checking TikTok status:', error);
    return NextResponse.json({ 
      connected: false, 
      message: "Error checking TikTok connection" 
    }, { status: 500 });
  }
} 