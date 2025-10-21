import type {
  LegalManifest,
  LegalDoc,
  LegalAcceptance,
  LegalAcceptanceStatus
} from '../types/legal';
import { ConsentService } from './consentService';
import logger from '../utils/logger';
import { LEGAL_ACCEPTANCE_V3_ENABLED } from '../config/features';

const BASELINE_MANIFEST_PATH = '/legal/manifest.json';
const LIVE_MANIFEST_URL = import.meta.env.VITE_SUPABASE_URL 
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/legal-manifest`
  : null;

/**
 * Legal Documents Service
 * 
 * Manages legal document manifest, version tracking, and user acceptance records.
 * Implements offline-first architecture with baseline manifest and live updates.
 * 
 * Features:
 * - Load baseline and live manifests
 * - Detect new/changed documents via version + contentHash
 * - Track user acceptances locally (device-level, no auth required)
 * - Locale fallback: user locale → base locale (ar-EG → ar) → en
 * - Diff logic for updates with effectiveFrom support
 */
export class LegalDocsService {
  private static instance: LegalDocsService;
  private consentService: ConsentService;
  private baselineManifest: LegalManifest | null = null;
  private liveManifest: LegalManifest | null = null;
  private lastETag: string | null = null;

  private constructor() {
    this.consentService = ConsentService.getInstance();
  }

  public static getInstance(): LegalDocsService {
    if (!LegalDocsService.instance) {
      LegalDocsService.instance = new LegalDocsService();
    }
    return LegalDocsService.instance;
  }

  /**
   * Initialize service by loading baseline manifest
   * Should be called early in app lifecycle
   */
  public async initialize(): Promise<boolean> {
    if (!LEGAL_ACCEPTANCE_V3_ENABLED) {
      logger.log('Legal Acceptance V3 disabled by feature flag');
      return false;
    }

    try {
      logger.log('Initializing LegalDocsService...');
      
      // Load baseline manifest (always available offline)
      this.baselineManifest = await this.loadBaselineManifest();
      
      if (!this.baselineManifest) {
        logger.error('Failed to load baseline manifest');
        return false;
      }

      logger.log(`Loaded baseline manifest with ${this.baselineManifest.documents.length} documents`);
      return true;
    } catch (error) {
      logger.error('Failed to initialize LegalDocsService:', error);
      return false;
    }
  }

  /**
   * Load baseline manifest from public directory
   * This is the offline-first fallback manifest
   */
  private async loadBaselineManifest(): Promise<LegalManifest | null> {
    try {
      const response = await fetch(BASELINE_MANIFEST_PATH, {
        cache: 'force-cache' // Use cached version
      });

      if (!response.ok) {
        throw new Error(`Failed to load baseline manifest: ${response.status}`);
      }

      const manifest = await response.json();
      return this.validateManifest(manifest) ? manifest : null;
    } catch (error) {
      logger.error('Error loading baseline manifest:', error);
      return null;
    }
  }

  /**
   * Load live manifest from Edge Function
   * Uses ETag for cache validation
   */
  public async loadLiveManifest(force: boolean = false): Promise<LegalManifest | null> {
    if (!LEGAL_ACCEPTANCE_V3_ENABLED) {
      return null;
    }

    if (!LIVE_MANIFEST_URL) {
      logger.warn('Live manifest URL not configured');
      return this.baselineManifest;
    }

    try {
      const headers: HeadersInit = {};
      
      // Add ETag for cache validation (unless forcing refresh)
      if (!force && this.lastETag) {
        headers['If-None-Match'] = this.lastETag;
      }

      const response = await fetch(LIVE_MANIFEST_URL, {
        method: 'GET',
        headers,
        cache: force ? 'no-cache' : 'default'
      });

      // 304 Not Modified - use current live manifest
      if (response.status === 304) {
        logger.log('Live manifest not modified (ETag match)');
        return this.liveManifest || this.baselineManifest;
      }

      if (!response.ok) {
        throw new Error(`Failed to load live manifest: ${response.status}`);
      }

      const manifest = await response.json();
      
      if (!this.validateManifest(manifest)) {
        throw new Error('Invalid manifest structure');
      }

      // Store ETag for future requests
      const etag = response.headers.get('ETag');
      if (etag) {
        this.lastETag = etag;
      }

      this.liveManifest = manifest;
      logger.log(`Loaded live manifest with ${manifest.documents.length} documents`);
      
      return manifest;
    } catch (error) {
      logger.error('Error loading live manifest, falling back to baseline:', error);
      return this.baselineManifest;
    }
  }

  /**
   * Validate manifest structure
   */
  private validateManifest(manifest: unknown): manifest is LegalManifest {
    return (
      typeof manifest === 'object' &&
      manifest !== null &&
      'updatedAt' in manifest &&
      'documents' in manifest &&
      Array.isArray((manifest as LegalManifest).documents)
    );
  }

  /**
   * Get current manifest (live if available, otherwise baseline)
   */
  public getCurrentManifest(): LegalManifest | null {
    return this.liveManifest || this.baselineManifest;
  }

  /**
   * Get a specific document by ID with locale fallback
   * Fallback order: exact locale → base locale (ar-EG → ar) → en
   */
  public getDocument(docId: string, locale: string): LegalDoc | null {
    const manifest = this.getCurrentManifest();
    if (!manifest) {
      return null;
    }

    const doc = manifest.documents.find(d => d.id === docId);
    if (!doc) {
      return null;
    }

    // Try exact locale match first
    let localeData = doc.locales.find(l => l.locale === locale);
    
    // Try base locale (e.g., ar-EG → ar)
    if (!localeData && locale.includes('-')) {
      const baseLocale = locale.split('-')[0];
      localeData = doc.locales.find(l => l.locale === baseLocale);
    }
    
    // Fallback to English
    if (!localeData) {
      localeData = doc.locales.find(l => l.locale === 'en');
    }

    if (!localeData) {
      logger.warn(`No locale data found for document ${docId} (locale: ${locale})`);
      return null;
    }

    return {
      ...doc,
      locales: [localeData] // Return only the selected locale
    };
  }

  /**
   * Get all required documents
   */
  public getRequiredDocuments(): LegalDoc[] {
    const manifest = this.getCurrentManifest();
    return manifest?.documents.filter(d => d.required) || [];
  }

  /**
   * Get all optional documents
   */
  public getOptionalDocuments(): LegalDoc[] {
    const manifest = this.getCurrentManifest();
    return manifest?.documents.filter(d => !d.required) || [];
  }

  /**
   * Record user acceptance of a legal document
   */
  public recordAcceptance(acceptance: LegalAcceptance): boolean {
    try {
      logger.log(`Recording acceptance for ${acceptance.docId} v${acceptance.acceptedVersion}`);
      return this.consentService.updateLegalAcceptance(acceptance);
    } catch (error) {
      logger.error('Failed to record acceptance:', error);
      return false;
    }
  }

  /**
   * Get user acceptance record for a specific document
   */
  public getAcceptance(docId: string): LegalAcceptance | null {
    const acceptances = this.consentService.getLegalAcceptances();
    return acceptances.find(a => a.docId === docId) || null;
  }

  /**
   * Get acceptance status for a document
   * Compares accepted version/hash with current manifest
   */
  public getAcceptanceStatus(docId: string, locale: string): LegalAcceptanceStatus {
    const doc = this.getDocument(docId, locale);
    if (!doc) {
      return {
        docId,
        accepted: false,
        requiresAcceptance: false,
        isBlocking: false
      };
    }

    const acceptance = this.getAcceptance(docId);
    const localeData = doc.locales[0]; // Already selected by getDocument
    
    if (!acceptance) {
      // Never accepted
      const isEffective = this.isEffectiveNow(doc.effectiveFrom);
      const policy = doc.policy || 'deferred';
      return {
        docId,
        accepted: false,
        requiresAcceptance: doc.required,
        isBlocking: doc.required && isEffective && policy === 'force',
        currentVersion: doc.version,
        currentHash: localeData.contentHash
      };
    }

    // Check if accepted version matches current version
    const versionMatch = acceptance.acceptedVersion === doc.version;
    const hashMatch = acceptance.contentHash === localeData.contentHash;
    const accepted = versionMatch && hashMatch;

    // If version/hash changed, check if re-acceptance is required
    const isEffective = this.isEffectiveNow(doc.effectiveFrom);
    const requiresAcceptance = !accepted && doc.required;
    const policy = doc.policy || 'deferred';
    const isBlocking = requiresAcceptance && isEffective && policy === 'force';

    return {
      docId,
      accepted,
      requiresAcceptance,
      isBlocking,
      currentVersion: doc.version,
      acceptedVersion: acceptance.acceptedVersion,
      currentHash: localeData.contentHash,
      acceptedHash: acceptance.contentHash,
      acceptedAt: acceptance.acceptedAt
    };
  }

  /**
   * Get acceptance status for all documents
   */
  public getAllAcceptanceStatuses(locale: string): LegalAcceptanceStatus[] {
    const manifest = this.getCurrentManifest();
    if (!manifest) {
      return [];
    }

    return manifest.documents.map(doc => 
      this.getAcceptanceStatus(doc.id, locale)
    );
  }

  /**
   * Check if any required documents need acceptance (blocking or deferred)
   */
  public hasUnacceptedRequired(locale: string): boolean {
    const statuses = this.getAllAcceptanceStatuses(locale);
    return statuses.some(s => s.requiresAcceptance);
  }

  /**
   * Check if any required documents are blocking
   */
  public hasBlockingDocuments(locale: string): boolean {
    const statuses = this.getAllAcceptanceStatuses(locale);
    return statuses.some(s => s.isBlocking);
  }

  /**
   * Detect changes between baseline and live manifests
   * Returns documents that are new or have version/hash changes
   */
  public detectUpdates(): LegalDoc[] {
    if (!this.liveManifest || !this.baselineManifest) {
      return [];
    }

    const updates: LegalDoc[] = [];

    for (const liveDoc of this.liveManifest.documents) {
      const baselineDoc = this.baselineManifest.documents.find(d => d.id === liveDoc.id);
      
      if (!baselineDoc) {
        // New document
        updates.push(liveDoc);
        continue;
      }

      // Check version change
      if (liveDoc.version !== baselineDoc.version) {
        updates.push(liveDoc);
        continue;
      }

      // Check content hash change (per locale)
      const hasContentChange = liveDoc.locales.some(liveLocale => {
        const baselineLocale = baselineDoc.locales.find(l => l.locale === liveLocale.locale);
        return !baselineLocale || baselineLocale.contentHash !== liveLocale.contentHash;
      });

      if (hasContentChange) {
        updates.push(liveDoc);
      }
    }

    return updates;
  }

  /**
   * Check if a document is effective now based on effectiveFrom date
   */
  private isEffectiveNow(effectiveFrom?: string): boolean {
    if (!effectiveFrom) {
      return true; // No effectiveFrom means immediately effective
    }

    try {
      const effectiveDate = new Date(effectiveFrom);
      const now = new Date();
      return now >= effectiveDate;
    } catch {
      logger.warn(`Invalid effectiveFrom date: ${effectiveFrom}`);
      return true; // Assume effective if date is invalid
    }
  }

  /**
   * Get days until a document becomes effective
   * Returns null if already effective or no effectiveFrom date
   */
  public getDaysUntilEffective(effectiveFrom?: string): number | null {
    if (!effectiveFrom) {
      return null;
    }

    try {
      const effectiveDate = new Date(effectiveFrom);
      const now = new Date();
      
      if (now >= effectiveDate) {
        return null; // Already effective
      }

      const diffMs = effectiveDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch {
      return null;
    }
  }

  /**
   * Clear all acceptance records (for testing or consent revocation)
   */
  public clearAllAcceptances(): boolean {
    try {
      return this.consentService.setLegalAcceptances([]);
    } catch (error) {
      logger.error('Failed to clear acceptances:', error);
      return false;
    }
  }
}

// Export singleton instance
export const legalDocsService = LegalDocsService.getInstance();
