"use client";

import { useState } from 'react';
import { Button, Dialog } from '@/app/components/ui';

interface TikTokAuthDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TikTokAuthDialog({ isOpen, onClose, onSuccess }: TikTokAuthDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleTikTokLogin = () => {
    setIsLoading(true);
    setError(null);

    // Generate state parameter for security
    const state = Math.random().toString(36).substring(7);

    // Store state in localStorage to verify later
    localStorage.setItem('tiktok_auth_state', state);

    // Construct TikTok OAuth URL
    const clientKey = process.env.NEXT_PUBLIC_TIKTOK_CLIENT_KEY;
    const redirectUri = process.env.NEXT_PUBLIC_TIKTOK_REDIRECT_URI;

    if (!clientKey || !redirectUri) {
      setError('TikTok configuration is missing. Please check your environment variables.');
      setIsLoading(false);
      return;
    }

    const authUrl = new URL('https://www.tiktok.com/v2/auth/authorize/');
    authUrl.searchParams.set('client_key', clientKey);
    // Request video upload permissions (video.publish is no longer available)
    authUrl.searchParams.set('scope', 'user.info.basic,video.upload,video.list');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', state);

    // Open TikTok auth in a popup window
    const popup = window.open(
      authUrl.toString(),
      'tiktok-auth',
      'width=500,height=600,scrollbars=yes,resizable=yes'
    );

    if (!popup) {
      setError('Popup blocked. Please allow popups for this site.');
      setIsLoading(false);
      return;
    }

    // Listen for the popup to close or receive message
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        setIsLoading(false);

        console.log('Popup closed, checking for token...');

        // Wait a bit for localStorage to be updated
        setTimeout(() => {
          // Check if we have a token (this would be set by the callback)
          const token = localStorage.getItem('tiktok_access_token');
          const expiresAt = localStorage.getItem('tiktok_token_expires_at');

          console.log('Token found:', !!token);
          console.log('Token value:', token ? token.substring(0, 20) + '...' : 'null');
          console.log('Expires at:', expiresAt);

          if (token && expiresAt) {
            const expiryTime = parseInt(expiresAt);
            const now = Date.now();

            if (now < expiryTime) {
              console.log('Token is valid, closing dialog...');
              setSuccess(true);
              setTimeout(() => {
                onSuccess();
                onClose();
              }, 1000);
            } else {
              console.log('Token has expired');
            }
          } else {
            console.log('No valid token found');
            // Try to check again after a longer delay
            setTimeout(() => {
              const retryToken = localStorage.getItem('tiktok_access_token');
              const retryExpiresAt = localStorage.getItem('tiktok_token_expires_at');
              console.log('Retry - Token found:', !!retryToken);
              console.log('Retry - Expires at:', retryExpiresAt);

              if (retryToken && retryExpiresAt) {
                const expiryTime = parseInt(retryExpiresAt);
                const now = Date.now();

                if (now < expiryTime) {
                  console.log('Token found on retry, closing dialog...');
                  setSuccess(true);
                  setTimeout(() => {
                    onSuccess();
                    onClose();
                  }, 1000);
                }
              }
            }, 2000);
          }
        }, 500);
      }
    }, 1000);

    // Listen for messages from the popup
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      console.log('Received message from popup:', event.data);
      console.log('Message type:', typeof event.data);
      console.log('Message keys:', Object.keys(event.data || {}));

      // Check if it's our expected message format
      if (event.data && typeof event.data === 'object' && event.data.type === 'TIKTOK_AUTH_SUCCESS') {
        clearInterval(checkClosed);
        popup.close();
        setIsLoading(false);
        setSuccess(true);
        console.log('TikTok auth success, closing dialog...');
        // Close immediately instead of waiting
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1000);
      } else if (event.data && typeof event.data === 'object' && event.data.type === 'TIKTOK_AUTH_ERROR') {
        clearInterval(checkClosed);
        popup.close();
        setIsLoading(false);
        setError(event.data.error || 'Authentication failed');
      }
    };

    window.addEventListener('message', handleMessage);

    // Cleanup
    return () => {
      clearInterval(checkClosed);
      window.removeEventListener('message', handleMessage);
    };
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Connect TikTok Account" size="sm">
      <div className="space-y-4">
        <p className="text-text-muted">
          To upload videos to TikTok, you need to authorize this app to access your TikTok account.
        </p>

        {error && (
          <div className="bg-danger-bg border border-danger/30 rounded-lg p-3">
            <p className="text-danger text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-success-bg border border-success/30 rounded-lg p-3">
            <p className="text-success text-sm">
              ✅ TikTok account connected successfully! You can now upload videos.
            </p>
            <Button
              variant="primary"
              className="mt-2 w-full bg-success hover:bg-success/90 text-white"
              onClick={() => {
                onSuccess();
                onClose();
              }}
            >
              Continue to Upload
            </Button>
          </div>
        )}

        {/* Manual check button for debugging */}
        <div className="bg-info-bg border border-info/30 rounded-lg p-3">
          <p className="text-info text-sm mb-2">
            Debug: Check if token was stored
          </p>
          <Button
            variant="primary"
            className="w-full bg-info hover:bg-info/90 text-white"
            onClick={() => {
              const token = localStorage.getItem('tiktok_access_token');
              const expiresAt = localStorage.getItem('tiktok_token_expires_at');
              console.log('Manual check - Token:', !!token);
              console.log('Manual check - Expires at:', expiresAt);

              if (token && expiresAt) {
                const expiryTime = parseInt(expiresAt);
                const now = Date.now();

                if (now < expiryTime) {
                  console.log('Token is valid, closing dialog...');
                  setSuccess(true);
                  setTimeout(() => {
                    onSuccess();
                    onClose();
                  }, 1000);
                } else {
                  alert('Token has expired');
                }
              } else {
                alert('No token found in localStorage');
              }
            }}
          >
            Check Token & Close
          </Button>
        </div>

        <div className="flex gap-3">
          <Button
            variant="primary"
            className="flex-1 bg-black text-white hover:bg-black/80"
            onClick={handleTikTokLogin}
            disabled={isLoading || success}
            loading={isLoading}
          >
            {isLoading ? (
              'Connecting...'
            ) : success ? (
              'Connected!'
            ) : (
              <span className="flex items-center justify-center gap-2">
                <svg height="20" viewBox="0 0 24 24" width="20" fill="currentColor">
                  <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                </svg>
                Connect TikTok
              </span>
            )}
          </Button>

          {!success ? (
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
          ) : (
            <Button
              variant="primary"
              className="bg-success hover:bg-success/90 text-white"
              onClick={() => {
                onSuccess();
                onClose();
              }}
            >
              Continue
            </Button>
          )}
        </div>

        <div className="text-xs text-text-faint">
          <p>This will open TikTok's authorization page in a new window.</p>
          <p>Make sure to allow popups for this site.</p>
        </div>
      </div>
    </Dialog>
  );
}
