/**
 * Text Sanitization Utility Tests
 * 
 * Tests for HTML entity decoding and text sanitization functions
 */

import { describe, it, expect } from 'vitest';
import { decodeHtmlEntities, sanitizeText, containsHtmlEntities } from '../sanitizeText';

describe('sanitizeText utility', () => {
  describe('decodeHtmlEntities', () => {
    it('should decode ampersand entity', () => {
      expect(decodeHtmlEntities('bread &amp; butter')).toBe('bread & butter');
    });

    it('should decode right single quotation mark', () => {
      expect(decodeHtmlEntities("You&rsquo;ve trained well")).toBe("You've trained well");
    });

    it('should decode less-than entity', () => {
      expect(decodeHtmlEntities('Avoid &lt;3 reps')).toBe('Avoid <3 reps');
    });

    it('should decode greater-than entity', () => {
      expect(decodeHtmlEntities('Duration &gt; 45 mins')).toBe('Duration > 45 mins');
    });

    it('should decode em dash', () => {
      expect(decodeHtmlEntities('High energy workout &mdash; 45 mins')).toBe(
        'High energy workout — 45 mins'
      );
    });

    it('should decode multiple entities', () => {
      expect(decodeHtmlEntities('Rest &amp; recover &mdash; you&rsquo;ve earned it')).toBe(
        'Rest & recover — you've earned it'
      );
    });

    it('should handle text without entities', () => {
      expect(decodeHtmlEntities('Rest and recover')).toBe('Rest and recover');
    });

    it('should handle empty string', () => {
      expect(decodeHtmlEntities('')).toBe('');
    });

    it('should handle null as empty string', () => {
      expect(decodeHtmlEntities(null as unknown as string)).toBe('');
    });

    it('should decode numeric entities', () => {
      expect(decodeHtmlEntities('Price &#36; 100')).toBe('Price $ 100');
    });

    it('should decode hex entities', () => {
      expect(decodeHtmlEntities('Copyright &#xA9; 2024')).toBe('Copyright © 2024');
    });
  });

  describe('sanitizeText', () => {
    it('should sanitize encoded text by decoding entities', () => {
      expect(sanitizeText('You&rsquo;ve done great &mdash; keep pushing')).toBe(
        "You've done great — keep pushing"
      );
    });

    it('should handle text without entities', () => {
      expect(sanitizeText('Regular text')).toBe('Regular text');
    });
  });

  describe('containsHtmlEntities', () => {
    it('should detect named entities', () => {
      expect(containsHtmlEntities('text &amp; more')).toBe(true);
    });

    it('should detect numeric entities', () => {
      expect(containsHtmlEntities('price &#36; value')).toBe(true);
    });

    it('should detect hex entities', () => {
      expect(containsHtmlEntities('symbol &#xA9; mark')).toBe(true);
    });

    it('should return false for text without entities', () => {
      expect(containsHtmlEntities('plain text here')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(containsHtmlEntities('')).toBe(false);
    });

    it('should return false for null', () => {
      expect(containsHtmlEntities(null as unknown as string)).toBe(false);
    });

    it('should detect multiple entity types', () => {
      expect(containsHtmlEntities('&amp; &#36; &#xA9;')).toBe(true);
    });
  });
});
