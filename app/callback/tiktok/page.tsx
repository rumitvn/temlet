"use client";

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

function TikTokCallback() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      // Handle error
      window.opener?.postMessage({
        type: 'TIKTOK_AUTH_ERROR',
        error: error
      }, window.location.origin);
      window.close();
      return;
    }

    if (!code) {
      window.opener?.postMessage({
        type: 'TIKTOK_AUTH_ERROR',
        error: 'No authorization code received'
      }, window.location.origin);
      window.close();
      return;
    }

    // Exchange code for token
    const exchangeToken = async () => {
      try {
        const response = await fetch('/api/tiktok-auth?' + new URLSearchParams({
          code: code,
          state: state || ''
        }));

        const data = await response.json();

        if (data.success) {
          // Store token in localStorage (for demo purposes)
          localStorage.setItem('tiktok_access_token', data.accessToken);
          
          // Notify parent window
          window.opener?.postMessage({
            type: 'TIKTOK_AUTH_SUCCESS',
            accessToken: data.accessToken
          }, window.location.origin);
        } else {
          window.opener?.postMessage({
            type: 'TIKTOK_AUTH_ERROR',
            error: data.error || 'Token exchange failed'
          }, window.location.origin);
        }
      } catch (error) {
        window.opener?.postMessage({
          type: 'TIKTOK_AUTH_ERROR',
          error: 'Failed to exchange token'
        }, window.location.origin);
      }

      // Close the popup
      setTimeout(() => {
        window.close();
      }, 1000);
    };

    exchangeToken();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="text-center text-text">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
        <h1 className="text-xl font-bold mb-2">Connecting to TikTok...</h1>
        <p className="text-text-muted">Please wait while we complete the authentication.</p>
      </div>
    </div>
  );
}

export default function TikTokCallbackPage() {
  return (
    <Suspense>
      <TikTokCallback />
    </Suspense>
  );
} 