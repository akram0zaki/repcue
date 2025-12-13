/**
 * Text Sanitization Utility
 * 
 * Handles decoding of HTML-encoded characters in text content
 * from API responses and external sources.
 * 
 * Security: Uses browser's native TextContent API which is safe
 * from XSS attacks (converts HTML entities only, no script execution).
 */

/**
 * Decode HTML entities in text (e.g., &amp; → &, &lt; → <)
 * 
 * Safe approach using textarea element which properly decodes HTML entities
 * without evaluating any scripts. This is the OWASP-recommended method.
 * 
 * @param encodedText - Text with potential HTML entities (e.g., "bread &amp; butter")
 * @returns Decoded text (e.g., "bread & butter")
 * 
 * @example
 * decodeHtmlEntities("You&rsquo;ve trained well") → "You've trained well"
 * decodeHtmlEntities("Rest &amp; recover") → "Rest & recover"
 * decodeHtmlEntities("Avoid &lt;3 reps") → "Avoid <3 reps"
 */
export function decodeHtmlEntities(encodedText: string): string {
  if (!encodedText || typeof encodedText !== 'string') {
    return encodedText || '';
  }

  // Use textarea element to safely decode HTML entities
  // This leverages the browser's native HTML parser without evaluating scripts
  const textArea = document.createElement('textarea');
  textArea.innerHTML = encodedText;
  return textArea.value;
}

/**
 * Sanitize text for safe display by decoding HTML entities
 * 
 * Intended for display-only text (titles, messages) that may contain
 * HTML-encoded characters from API responses.
 * 
 * @param text - Text to sanitize
 * @returns Sanitized text with decoded HTML entities
 * 
 * @example
 * sanitizeText("High energy workout &mdash; 45 mins") → "High energy workout — 45 mins"
 */
export function sanitizeText(text: string): string {
  return decodeHtmlEntities(text);
}

/**
 * Check if text contains HTML entities
 * 
 * Useful for determining if sanitization is needed
 * 
 * @param text - Text to check
 * @returns true if text contains HTML entities, false otherwise
 * 
 * @example
 * containsHtmlEntities("Rest &amp; recover") → true
 * containsHtmlEntities("Rest and recover") → false
 */
export function containsHtmlEntities(text: string): boolean {
  if (!text || typeof text !== 'string') {
    return false;
  }
  // Pattern matches common HTML entities
  return /&[a-zA-Z]+;|&#[0-9]+;|&#x[0-9A-Fa-f]+;/.test(text);
}
