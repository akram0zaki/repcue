/**
 * useDeepLinks Hook
 * 
 * Handles Universal Links (iOS) and App Links (Android) for native Capacitor apps.
 * When the app is opened via a deep link (e.g., https://repcue.me/auth/callback),
 * this hook navigates to the appropriate route.
 * 
 * This hook should be used inside a Router context.
 */

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { isNativePlatform, onDeepLink, markLaunchUrlHandled, wasLaunchUrlHandled } from '../utils/nativeCapabilities';
import logger from '../utils/logger';

/**
 * Extract path from a URL, handling custom schemes properly
 * For custom schemes like repcue://auth/callback, the URL parser treats
 * 'auth' as the host and '/callback' as the path, so we need special handling
 */
function extractPathFromUrl(url: URL, originalUrl: string): string {
  // For custom schemes (repcue://), the URL is parsed as:
  // - host = 'auth'
  // - pathname = '/callback'
  // We need to reconstruct: /auth/callback
  const isCustomScheme = originalUrl.startsWith('repcue://');
  
  if (isCustomScheme && url.host) {
    // Combine host and pathname to get the full path
    return `/${url.host}${url.pathname}`;
  }
  
  return url.pathname;
}

/**
 * Hook to handle deep links in native apps
 * Automatically navigates to the path when a deep link is received
 */
export const useDeepLinks = (): void => {
  const navigate = useNavigate();
  const isNative = isNativePlatform();
  const handledUrls = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isNative) {
      // Web handles URLs normally through the browser
      return;
    }

    logger.log('🔗 Registering deep link handler for native app');

    const cleanup = onDeepLink((url: URL, isLaunchUrl: boolean) => {
      const originalUrl = url.href;
      
      // For launch URLs, check if already handled globally
      if (isLaunchUrl && wasLaunchUrlHandled()) {
        logger.log('🔗 Launch URL already handled globally, skipping');
        return;
      }
      
      // Extract the correct path (handles custom schemes)
      const pathname = extractPathFromUrl(url, originalUrl);
      
      // Create a unique key for this URL to avoid duplicate handling
      // Use a shorter key without the full hash for deduplication
      const hashPrefix = url.hash ? url.hash.substring(0, 30) : '';
      const urlKey = `${pathname}${url.search}${hashPrefix}`;
      
      if (handledUrls.current.has(urlKey)) {
        logger.log('🔗 Deep link already handled in this session, skipping');
        return;
      }
      
      handledUrls.current.add(urlKey);
      
      // Mark launch URL as handled globally (including persistent storage for auth callbacks)
      if (isLaunchUrl) {
        // Fire and forget - don't await to avoid blocking navigation
        markLaunchUrlHandled(originalUrl).catch(err => {
          logger.warn('Failed to mark launch URL as handled:', err);
        });
      }
      
      // Clean up old entries after 60 seconds
      setTimeout(() => {
        handledUrls.current.delete(urlKey);
      }, 60000);

      logger.log('🔗 Processing deep link:', {
        extractedPath: pathname,
        isLaunchUrl,
        hasHash: !!url.hash
      });

      // Build the navigation target
      // Include hash for auth callbacks (Supabase puts tokens in hash)
      let target = pathname;
      if (url.search) {
        target += url.search;
      }
      if (url.hash) {
        target += url.hash;
      }

      // Always log for debugging (visible in Xcode console)
      console.log('🔗 Deep link navigation target:', target.substring(0, 100));
      console.log('🔗 Hash included:', !!url.hash);
      
      // Navigate to the deep link path
      logger.log('🔗 Navigating to:', pathname);
      navigate(target, { replace: true });
    });

    return cleanup;
  }, [isNative, navigate]);
};

export default useDeepLinks;
