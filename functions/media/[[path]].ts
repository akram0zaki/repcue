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
export const onRequest: PagesFunction<Env> = async () => {
  // Function temporarily disabled while serving static assets from /videos
  return new Response('Media function disabled; use /videos/* static assets', {
    status: 410,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/plain'
    }
  });
};
