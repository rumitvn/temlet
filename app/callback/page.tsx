"use client";

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { logger } from "@/app/lib/logger";

function Callback() {
  const searchParams = useSearchParams();

  useEffect(() => {
    logger.debug('=== TIKTOK CALLBACK PAGE LOADED ===');
    logger.debug('URL:', window.location.href);
    logger.debug('Search params:', Object.fromEntries(searchParams.entries()));
    
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      logger.error('TikTok auth error:', error);
      alert('TikTok authentication failed: ' + error);
      window.close();
      return;
    }

    if (!code) {
      logger.error('No authorization code received');
      alert('No authorization code received');
      window.close();
      return;
    }

    // Exchange code for token
    const exchangeToken = async () => {
      try {
        logger.debug('Exchanging code for token...');
        const response = await fetch('/api/tiktok-auth?' + new URLSearchParams({
          code: code,
          state: state || ''
        }));

        const data = await response.json();
        logger.debug('Token exchange response:', data);

        if (data.success) {
          logger.debug('TikTok auth successful, storing token...');
          logger.debug('Access token:', data.accessToken ? data.accessToken.substring(0, 20) + '...' : 'null');
          logger.debug('Expires in:', data.expiresIn);
          
          // Store token and expiry in localStorage
          localStorage.setItem('tiktok_access_token', data.accessToken);
          localStorage.setItem('tiktok_token_expires_at', (Date.now() + data.expiresIn * 1000).toString());
          
          // Verify storage
          const storedToken = localStorage.getItem('tiktok_access_token');
          const storedExpiry = localStorage.getItem('tiktok_token_expires_at');
          logger.debug('Stored token:', storedToken ? 'YES' : 'NO');
          logger.debug('Stored expiry:', storedExpiry);
          
          // Show success message
          alert('TikTok authentication successful! You can now upload videos.');
          
          // Close the popup
          window.close();
        } else {
          logger.error('Token exchange failed:', data.error);
          alert('Token exchange failed: ' + (data.error || 'Unknown error'));
          window.close();
        }
      } catch (error) {
        logger.error('Failed to exchange token:', error);
        alert('Failed to exchange token: ' + error);
        window.close();
      }
    };

    exchangeToken();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="text-center text-text">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
        <h1 className="text-xl font-bold mb-2">Connecting to TikTok...</h1>
        <p className="text-text-muted">Please wait while we complete the authentication.</p>
        <p className="text-text-faint text-sm mt-4">This window will close automatically.</p>
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense>
      <Callback />
    </Suspense>
  );
} 