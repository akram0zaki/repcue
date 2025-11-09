/**
 * Cloudflare Pages Function: /media/* Proxy to R2 Bucket
 * 
 * Serves exercise demo videos from R2 bucket with:
 * - Range request support (HTTP 206) for seeking
 * - Immutable cache headers for hashed filenames
 * - Path validation and sanitization (OWASP A01: Broken Access Control)
 * - Content-Type inference
 * - Error handling (404 for missing, no directory listing)
 * 
 * Security:
 * - Same-origin serving preserves CSP
 * - No directory enumeration
 * - Strict filename pattern validation
 * - Rate limiting via Cloudflare
 */

interface Env {
  VIDEOS: R2Bucket;
  DEBUG?: string;
}

// Strict filename pattern: exerciseId_v1_WIDTHxHEIGHT_hash.ext (e.g., burpees_v1_1080x1920_95dc97e6.webm)
const VALID_KEY_PATTERN = /^[a-z0-9_-]+_v1_\d{3,4}x\d{3,4}_[a-f0-9]{8,}\.(mp4|webm)$/i;

// Content-Type mapping (fallback if R2 metadata missing)
const CONTENT_TYPES: Record<string, string> = {
  'webm': 'video/webm',
  'mp4': 'video/mp4',
};

/**
 * Sanitize and validate the requested path
 * Prevents path traversal attacks (OWASP A01)
 */
function sanitizePath(path: string): string | null {
  // Remove leading /media/ prefix if present
  let cleanPath = path.startsWith('/media/') ? path.slice(7) : path;
  cleanPath = cleanPath.startsWith('/') ? cleanPath.slice(1) : cleanPath;
  
  // Reject paths with traversal attempts
  if (cleanPath.includes('..') || cleanPath.includes('\\') || cleanPath.includes('//')) {
    return null;
  }
  
  // Validate against strict pattern
  if (!VALID_KEY_PATTERN.test(cleanPath)) {
    return null;
  }
  
  return cleanPath;
}

/**
 * Parse Range header and return byte range
 * Returns null if invalid or unsatisfiable
 */
function parseRange(rangeHeader: string | null, fileSize: number): { start: number; end: number } | null {
  if (!rangeHeader || !rangeHeader.startsWith('bytes=')) {
    return null;
  }
  
  const parts = rangeHeader.slice(6).split('-');
  if (parts.length !== 2) {
    return null;
  }
  
  const start = parts[0] ? parseInt(parts[0], 10) : 0;
  const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
  
  // Validate range
  if (isNaN(start) || isNaN(end) || start < 0 || end >= fileSize || start > end) {
    return null;
  }
  
  return { start, end };
}

/**
 * Infer Content-Type from filename extension
 */
function inferContentType(key: string): string {
  const ext = key.split('.').pop()?.toLowerCase();
  return ext && CONTENT_TYPES[ext] ? CONTENT_TYPES[ext] : 'application/octet-stream';
}

/**
 * Main handler for /media/* requests
 */
export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const debug = env.DEBUG === 'true';
  
  // Check if R2 binding is available
  if (!env.VIDEOS) {
    console.error('[Media Proxy] R2 bucket binding "VIDEOS" is not configured');
    return new Response('Service configuration error: R2 bucket not available', { 
      status: 503,
      headers: { 
        'Cache-Control': 'no-store',
        'Content-Type': 'text/plain'
      }
    });
  }
  
  // Extract path from URL (everything after /media/)
  const requestPath = url.pathname;
  
  // Sanitize and validate path
  const key = sanitizePath(requestPath);
  if (!key) {
    if (debug) {
      console.warn(`[Media Proxy] Invalid path rejected: ${requestPath}`);
    }
    return new Response('Invalid path', { 
      status: 400,
      headers: { 'Cache-Control': 'no-store' }
    });
  }
  
  try {
    // Fetch object metadata first (cheaper than full GET)
    const object = await env.VIDEOS.get(key);
    
    if (!object) {
      if (debug) {
        console.warn(`[Media Proxy] Object not found: ${key}`);
      }
      return new Response('Not Found', { 
        status: 404,
        headers: { 'Cache-Control': 'no-store' }
      });
    }
    
    // Get file size for range calculations
    const fileSize = object.size;
    
    // Parse Range header if present
    const rangeHeader = request.headers.get('Range');
    const range = parseRange(rangeHeader, fileSize);
    
    // Determine Content-Type (use R2 metadata or infer from extension)
    const contentType = object.httpMetadata?.contentType || inferContentType(key);
    
    // Prepare response headers
    const headers = new Headers({
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'X-Content-Type-Options': 'nosniff',
      // Immutable cache for hashed filenames (1 year)
      'Cache-Control': 'public, max-age=31536000, immutable',
    });
    
    // Handle range request (206 Partial Content)
    if (range) {
      const { start, end } = range;
      const contentLength = end - start + 1;
      
      // Fetch partial content from R2
      const partialObject = await env.VIDEOS.get(key, {
        range: { offset: start, length: contentLength }
      });
      
      if (!partialObject) {
        return new Response('Range Not Satisfiable', { 
          status: 416,
          headers: { 'Content-Range': `bytes */${fileSize}` }
        });
      }
      
      headers.set('Content-Length', contentLength.toString());
      headers.set('Content-Range', `bytes ${start}-${end}/${fileSize}`);
      
      if (debug) {
        console.log(`[Media Proxy] Serving partial: ${key} (${start}-${end}/${fileSize})`);
      }
      
      return new Response(partialObject.body, {
        status: 206,
        headers,
      });
    }
    
    // Full content response (200 OK)
    headers.set('Content-Length', fileSize.toString());
    
    if (debug) {
      console.log(`[Media Proxy] Serving full: ${key} (${fileSize} bytes)`);
    }
    
    return new Response(object.body, {
      status: 200,
      headers,
    });
    
  } catch (error) {
    console.error(`[Media Proxy] Error serving ${key}:`, error);
    return new Response('Internal Server Error', { 
      status: 500,
      headers: { 'Cache-Control': 'no-store' }
    });
  }
};
