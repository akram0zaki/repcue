/**
 * Simplified Integration Tests for LegalDocsService
 * Tests boot scenarios and basic offline/online behavior
 * LA-REQ-004, LA-REQ-006
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LegalDocsService } from '../legalDocsService';
import { ConsentService } from '../consentService';
import type { LegalManifest, LegalAcceptance } from '../../types';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock feature flags
vi.mock('../../config/features', () => ({
  DEBUG: false,
  LEGAL_ACCEPTANCE_V3_ENABLED: true,
  SYNC_ENABLED: true,
  VIDEO_DEMOS_ENABLED: true,
  AI_WORKOUT_BUILDER: false
}));

// Mock logger
vi.mock('../../utils/logger', () => ({
  default: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn()
  }
}));

// Mock Supabase client
vi.mock('../../config/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(() => Promise.resolve({ data: null, error: null }))
    })),
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null }))
    }
  }
}));

// Mock environment variables for live manifest URL
vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');

describe('LegalDocsService Integration Tests (Simplified)', () => {
  let legalDocsService: LegalDocsService;
  let consentService: ConsentService;

  // Mock baseline manifest (offline fallback)
  const baselineManifest: LegalManifest = {
    updatedAt: '2025-10-15T00:00:00.000Z',
    documents: [
      {
        id: 'terms_conditions',
        title: 'Terms & Conditions',
        required: true,
        policy: 'defer',
        effectiveFrom: '2025-10-20T00:00:00.000Z',
        version: '1.0.0',
        locales: [
          { locale: 'en', path: '/legal/terms_en.md', contentHash: 'baseline_terms_hash' }
        ]
      },
      {
        id: 'privacy_policy',
        title: 'Privacy Policy',
        required: true,
        policy: 'force',
        effectiveFrom: '2025-10-20T00:00:00.000Z',
        version: '1.0.0',
        locales: [
          { locale: 'en', path: '/legal/privacy_en.md', contentHash: 'baseline_privacy_hash' }
        ]
      }
    ]
  };

  beforeEach(() => {
    // Clear mocks
    vi.clearAllMocks();
    mockFetch.mockClear();
    
    // Reset localStorage
    localStorage.clear();
    
    // Reset singleton instances
    (LegalDocsService as any).instance = undefined;
    (ConsentService as any).instance = undefined;

    // Setup default fetch mock for baseline manifest
    // This ensures the service can initialize even without explicit mock setup
    mockFetch.mockImplementation((url: string) => {
      if (typeof url === 'string') {
        if (url.includes('/legal/manifest.json')) {
          // Baseline manifest
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(baselineManifest)
          });
        } else if (url.includes('/functions/v1/legal-manifest')) {
          // Live manifest (return baseline by default unless overridden in test)
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(baselineManifest),
            headers: new Headers({ 'etag': 'default-etag' })
          });
        }
      }
      return Promise.reject(new Error('Not found'));
    });

    // Get fresh instances
    legalDocsService = LegalDocsService.getInstance();
    consentService = ConsentService.getInstance();
  });

  describe('Boot Scenarios (LA-REQ-004)', () => {
    it('should initialize successfully with baseline manifest', async () => {
      // Mock baseline manifest fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => baselineManifest
      });

      // Initialize service
      const initialized = await legalDocsService.initialize();

      expect(initialized).toBe(true);
      // In dev mode, cache-busting param is added
      expect(mockFetch).toHaveBeenCalled();
      const fetchCall = mockFetch.mock.calls[0][0] as string;
      expect(fetchCall).toContain('/legal/manifest.json');

      // Verify baseline manifest is loaded
      const termsDoc = legalDocsService.getDocument('terms_conditions', 'en');
      expect(termsDoc).toBeDefined();
      expect(termsDoc?.version).toBe('1.0.0');
    });

    it('should handle offline initialization gracefully', async () => {
      // Simulate offline - fetch fails
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      // Initialize should handle error gracefully
      const initialized = await legalDocsService.initialize();

      // Should fail gracefully
      expect(initialized).toBe(false);
    });

    it('should load live manifest when online', async () => {
      await legalDocsService.initialize();

      // Mock live manifest (updated version)
      const liveManifest: LegalManifest = {
        ...baselineManifest,
        updatedAt: '2025-10-22T00:00:00.000Z',
        documents: [
          ...baselineManifest.documents.slice(0, 1),
          {
            ...baselineManifest.documents[1],
            version: '1.1.0', // Privacy policy updated
            locales: [
              { locale: 'en', path: '/legal/privacy_en.md', contentHash: 'updated_privacy_hash' }
            ]
          }
        ]
      };

      // Override fetch mock for live manifest call
      mockFetch.mockImplementationOnce((url: string) => {
        if (typeof url === 'string' && url.includes('/functions/v1/legal-manifest')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(liveManifest),
            headers: new Headers({ 'etag': 'updated-etag' })
          });
        }
        return Promise.reject(new Error('Not found'));
      });

      // Load live manifest
      const loaded = await legalDocsService.loadLiveManifest();

      expect(loaded).not.toBeNull();
      // Check that we got an updated manifest with updated privacy policy
      const privacyDoc = loaded?.documents.find(d => d.id === 'privacy_policy');
      expect(privacyDoc?.version).toBe('1.1.0');
    });
  });

  describe('Blocking Logic (LA-REQ-006)', () => {
    beforeEach(async () => {
      // Initialize with baseline
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => baselineManifest
      });

      await legalDocsService.initialize();

      // Set up consent
      consentService.setConsent({
        hasConsented: true,
        cookiesAccepted: true,
        analyticsAccepted: false,
        marketingAccepted: false
      });
    });

    it('should detect blocking documents with force policy', () => {
      // Privacy policy has policy: force and effectiveFrom in past (2025-10-20)
      // Should be blocking if not accepted
      const hasBlocking = legalDocsService.hasBlockingDocuments('en');

      // Should be true because privacy_policy is force policy and not accepted
      expect(hasBlocking).toBe(true);
    });

    it('should not block when all required documents accepted', () => {
      // Accept both required documents
      const acceptances: LegalAcceptance[] = [
        {
          docId: 'terms_conditions',
          acceptedVersion: '1.0.0',
          acceptedLocale: 'en',
          acceptedAt: '2025-10-21T10:00:00.000Z'
        },
        {
          docId: 'privacy_policy',
          acceptedVersion: '1.0.0',
          acceptedLocale: 'en',
          acceptedAt: '2025-10-21T10:00:00.000Z'
        }
      ];

      acceptances.forEach(a => legalDocsService.recordAcceptance(a));

      // Should not block after acceptance
      const hasBlocking = legalDocsService.hasBlockingDocuments('en');
      expect(hasBlocking).toBe(false);
    });

    it('should detect unaccepted required documents', () => {
      // No acceptances yet
      const hasUnaccepted = legalDocsService.hasUnacceptedRequired('en');

      // Should be true - both terms and privacy are required and unaccepted
      expect(hasUnaccepted).toBe(true);
    });

    it('should calculate days until effective correctly', () => {
      // Test with future date (8 days from now)
      const futureDate = '2025-10-30T00:00:00.000Z';
      const daysUntil = legalDocsService.getDaysUntilEffective(futureDate);

      expect(daysUntil).toBeGreaterThan(0);
      expect(daysUntil).toBeLessThanOrEqual(8);
    });

    it('should return null for past effective dates', () => {
      // Test with past date
      const pastDate = '2025-10-15T00:00:00.000Z';
      const daysUntil = legalDocsService.getDaysUntilEffective(pastDate);

      expect(daysUntil).toBeNull();
    });
  });

  describe('Document Retrieval', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => baselineManifest
      });

      await legalDocsService.initialize();
    });

    it('should retrieve required documents', () => {
      const required = legalDocsService.getRequiredDocuments();

      expect(required.length).toBe(2);
      expect(required.some(d => d.id === 'terms_conditions')).toBe(true);
      expect(required.some(d => d.id === 'privacy_policy')).toBe(true);
    });

    it('should retrieve optional documents', () => {
      const optional = legalDocsService.getOptionalDocuments();

      // No optional docs in baseline
      expect(optional.length).toBe(0);
    });

    it('should get document by id and locale', () => {
      const doc = legalDocsService.getDocument('terms_conditions', 'en');

      expect(doc).toBeDefined();
      expect(doc?.id).toBe('terms_conditions');
      expect(doc?.version).toBe('1.0.0');
    });
  });

  describe('Acceptance Tracking', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => baselineManifest
      });

      await legalDocsService.initialize();

      consentService.setConsent({
        hasConsented: true,
        cookiesAccepted: true,
        analyticsAccepted: false,
        marketingAccepted: false
      });
    });

    it('should record acceptance successfully', () => {
      const acceptance: LegalAcceptance = {
        docId: 'terms_conditions',
        acceptedVersion: '1.0.0',
        contentHash: 'baseline_terms_hash',
        acceptedLocale: 'en',
        acceptedAt: new Date().toISOString()
      };

      const success = legalDocsService.recordAcceptance(acceptance);
      expect(success).toBe(true);
    });

    it('should retrieve acceptance status', () => {
      // Accept terms
      legalDocsService.recordAcceptance({
        docId: 'terms_conditions',
        acceptedVersion: '1.0.0',
        contentHash: 'baseline_terms_hash',
        acceptedLocale: 'en',
        acceptedAt: new Date().toISOString()
      });

      // Check status
      const status = legalDocsService.getAcceptanceStatus('terms_conditions', 'en');

      expect(status.accepted).toBe(true);
      expect(status.isBlocking).toBe(false);
    });

    it('should detect when acceptance requires update', async () => {
      // Accept version 1.0.0
      legalDocsService.recordAcceptance({
        docId: 'privacy_policy',
        acceptedVersion: '1.0.0',
        contentHash: 'baseline_privacy_hash',
        acceptedLocale: 'en',
        acceptedAt: new Date().toISOString()
      });

      // Load live manifest with version 1.1.0
      const updatedManifest: LegalManifest = {
        ...baselineManifest,
        updatedAt: '2025-10-22T00:00:00.000Z',
        documents: [
          baselineManifest.documents[0],
          {
            ...baselineManifest.documents[1],
            version: '1.1.0',
            locales: [
              { locale: 'en', path: '/legal/privacy_en.md', contentHash: 'updated_privacy_hash' }
            ]
          }
        ]
      };

      // Override fetch mock for live manifest call
      mockFetch.mockImplementationOnce((url: string) => {
        if (typeof url === 'string' && url.includes('/functions/v1/legal-manifest')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(updatedManifest),
            headers: new Headers({ 'etag': 'updated-etag' })
          });
        }
        return Promise.reject(new Error('Not found'));
      });

      await legalDocsService.loadLiveManifest();

      // Check status - should show old version accepted but not current
      const status = legalDocsService.getAcceptanceStatus('privacy_policy', 'en');

      // Old version (1.0.0) was accepted, but current is 1.1.0
      expect(status.acceptedVersion).toBe('1.0.0');
      expect(status.currentVersion).toBe('1.1.0');
      expect(status.accepted).toBe(false); // Not accepted for current version
    });
  });

  describe('Update Detection', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => baselineManifest
      });

      await legalDocsService.initialize();

      // Accept baseline
      consentService.setConsent({
        hasConsented: true,
        cookiesAccepted: true,
        analyticsAccepted: false,
        marketingAccepted: false
      });

      baselineManifest.documents.forEach((doc: any) => {
        const locale = doc.locales[0];
        legalDocsService.recordAcceptance({
          docId: doc.id,
          acceptedVersion: doc.version,
          contentHash: locale.contentHash,
          acceptedLocale: 'en',
          acceptedAt: new Date().toISOString()
        });
      });
    });

    it('should detect updated documents when live manifest changes', async () => {
      // Load updated manifest
      const updatedManifest: LegalManifest = {
        ...baselineManifest,
        updatedAt: '2025-10-22T00:00:00.000Z',
        documents: [
          baselineManifest.documents[0],
          {
            ...baselineManifest.documents[1],
            version: '1.1.0', // Privacy updated
            locales: [
              { locale: 'en', path: '/legal/privacy_en.md', contentHash: 'updated_privacy_hash' }
            ]
          }
        ]
      };

      // Override fetch mock for live manifest call
      mockFetch.mockImplementationOnce((url: string) => {
        if (typeof url === 'string' && url.includes('/functions/v1/legal-manifest')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(updatedManifest),
            headers: new Headers({ 'etag': 'updated-etag' })
          });
        }
        return Promise.reject(new Error('Not found'));
      });

      await legalDocsService.loadLiveManifest();

      // Detect updates
      const updates = legalDocsService.detectUpdates();

      // Should detect privacy_policy update
      expect(updates.length).toBeGreaterThan(0);
      expect(updates.some(u => u.id === 'privacy_policy')).toBe(true);
    });
  });
});
