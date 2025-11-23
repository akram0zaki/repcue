import type {
  LegalManifest,
  LegalDoc,
  LegalAcceptance,
  LegalAcceptanceStatus,
} from '../types/legal';
import { ConsentService } from './consentService';
import { supabase } from '../config/supabase';
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
      // In dev mode, always reload to pick up manifest changes
      // In production, only load if not already loaded
      if (import.meta.env.DEV || !this.baselineManifest) {
        // Load baseline manifest (always available offline)
        this.baselineManifest = await this.loadBaselineManifest();
      }
      
      if (!this.baselineManifest) {
        logger.error('Failed to load baseline manifest');
        return false;
      }
      
      return true;
    } catch (error) {
      logger.error('Failed to initialize LegalDocsService:', error);
      return false;
    }
  }

  /**
   * Load baseline manifest from public directory
   * This is the offline-first fallback manifest
   * In development, bypasses cache for easier testing
   */
  private async loadBaselineManifest(): Promise<LegalManifest | null> {
    try {
      // In development, add cache-busting query param AND force reload headers
      const url = import.meta.env.DEV 
        ? `${BASELINE_MANIFEST_PATH}?t=${Date.now()}&r=${Math.random()}`
        : BASELINE_MANIFEST_PATH;
      
      const response = await fetch(url, {
        cache: import.meta.env.DEV ? 'reload' : 'force-cache',
        headers: import.meta.env.DEV ? {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        } : {}
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
      
      // Add authentication headers for Supabase Edge Function
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (anonKey) {
        headers['apikey'] = anonKey;
        headers['Authorization'] = `Bearer ${anonKey}`;
      }
      
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
      logger.warn(`[getDocument] No manifest available`);
      return null;
    }

    const doc = manifest.documents.find(d => d.id === docId);
    if (!doc) {
      logger.warn(`[getDocument] Document not found: ${docId}`);
      return null;
    }

    logger.log(`[getDocument] Looking for docId: ${docId}, locale: ${locale}`);
    logger.log(`[getDocument] Available locales:`, doc.locales.map(l => l.locale).join(', '));

    // Try exact locale match first
    let localeData = doc.locales.find(l => l.locale === locale);
    
    if (localeData) {
      logger.log(`[getDocument] ✅ Found exact locale match: ${locale}`);
    }
    
    // Try base locale (e.g., ar-EG → ar)
    if (!localeData && locale.includes('-')) {
      const baseLocale = locale.split('-')[0];
      logger.log(`[getDocument] Trying base locale fallback: ${baseLocale}`);
      localeData = doc.locales.find(l => l.locale === baseLocale);
      if (localeData) {
        logger.log(`[getDocument] ✅ Found base locale match: ${baseLocale}`);
      }
    }
    
    // Fallback to English
    if (!localeData) {
      logger.log(`[getDocument] Falling back to English`);
      localeData = doc.locales.find(l => l.locale === 'en');
    }

    if (!localeData) {
      logger.warn(`No locale data found for document ${docId} (locale: ${locale})`);
      return null;
    }

    logger.log(`[getDocument] Returning document with locale: ${localeData.locale}, path: ${localeData.path}`);

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
      logger.log(`[getAcceptanceStatus] Document ${docId} not found for locale ${locale}`);
      return {
        docId,
        accepted: false,
        requiresAcceptance: false,
        isBlocking: false,
        currentVersion: '0.0.0',
        currentHash: ''
      };
    }

    const acceptance = this.getAcceptance(docId);
    const localeData = doc.locales[0]; // Already selected by getDocument
    
    logger.log(`[getAcceptanceStatus] ${docId}:`, {
      hasAcceptance: !!acceptance,
      effectiveFrom: doc.effectiveFrom,
      policy: doc.policy,
      required: doc.required,
      version: doc.version
    });
    
    if (!acceptance) {
      // Never accepted
      const isEffective = this.isEffectiveNow(doc.effectiveFrom);
      const policy = doc.policy || 'deferred';
      const isBlocking = doc.required && isEffective && policy === 'force';
      
      logger.log(`[getAcceptanceStatus] ${docId} never accepted:`, {
        isEffective,
        policy,
        isBlocking,
        required: doc.required
      });
      
      return {
        docId,
        accepted: false,
        requiresAcceptance: doc.required,
        isBlocking,
        currentVersion: doc.version,
        currentHash: localeData.contentHash
      };
    }

    // Check if accepted version matches current version
    // Note: We only check version, not content hash across locales
    // Different locales have different hashes, but acceptance is document-wide
    const versionMatch = acceptance.acceptedVersion === doc.version;
    const accepted = versionMatch;

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
    logger.log('[legalDocsService] hasBlockingDocuments called with locale:', locale);
    
    const statuses = this.getAllAcceptanceStatuses(locale);
    logger.log('[legalDocsService] Got acceptance statuses:', statuses.length, 'documents');
    
    statuses.forEach(status => {
      logger.log('[legalDocsService] Document:', status.docId, {
        accepted: status.accepted,
        requiresAcceptance: status.requiresAcceptance,
        isBlocking: status.isBlocking,
        currentVersion: status.currentVersion,
        acceptedVersion: status.acceptedVersion
      });
    });
    
    const hasBlocking = statuses.some(s => s.isBlocking);
    logger.log('[legalDocsService] Has blocking documents:', hasBlocking);
    
    return hasBlocking;
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

  // ============================================================================
  // SUPABASE SYNC METHODS (Phase 4)
  // ============================================================================

  /**
   * Fetch legal acceptances from Supabase for the authenticated user
   * Returns empty array if not authenticated or on error
   */
  private async fetchServerAcceptances(): Promise<LegalAcceptance[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        logger.log('[sync] No authenticated user, skipping server fetch');
        return [];
      }

      const { data, error } = await supabase
        .from('legal_acceptances')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        logger.error('[sync] Error fetching server acceptances:', error);
        return [];
      }

      if (!data || data.length === 0) {
        logger.log('[sync] No server acceptances found');
        return [];
      }

      // Convert from database rows to LegalAcceptance format
      const acceptances: LegalAcceptance[] = data.map((row) => ({
        docId: row.doc_id,
        acceptedVersion: row.accepted_version,
        contentHash: row.content_hash,
        acceptedLocale: row.locale, // Map locale → acceptedLocale
        acceptedAt: row.accepted_at
      }));

      logger.log(`[sync] Fetched ${acceptances.length} server acceptances`);
      return acceptances;
    } catch (error) {
      logger.error('[sync] Exception fetching server acceptances:', error);
      return [];
    }
  }

  /**
   * Upsert a legal acceptance to Supabase
   * Returns true on success, false on failure
   */
  private async upsertServerAcceptance(acceptance: LegalAcceptance): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        logger.log('[sync] No authenticated user, skipping server upsert');
        return false;
      }

      const row = {
        user_id: user.id,
        doc_id: acceptance.docId,
        accepted_version: acceptance.acceptedVersion,
        content_hash: acceptance.contentHash,
        locale: acceptance.acceptedLocale, // Map acceptedLocale → locale
        accepted_at: acceptance.acceptedAt
      };

      const { error } = await supabase
        .from('legal_acceptances')
        .upsert(row, {
          onConflict: 'user_id,doc_id'
        });

      if (error) {
        logger.error('[sync] Error upserting server acceptance:', error);
        return false;
      }

      logger.log(`[sync] Successfully upserted ${acceptance.docId} to server`);
      return true;
    } catch (error) {
      logger.error('[sync] Exception upserting server acceptance:', error);
      return false;
    }
  }

  /**
   * Compare two semver version strings
   * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
   */
  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      
      if (p1 > p2) return 1;
      if (p1 < p2) return -1;
    }
    
    return 0;
  }

  /**
   * Merge local and server acceptances using last-write-wins strategy
   * Tie-breaker: higher semver version wins
   * 
   * @param local - Local acceptances from ConsentService
   * @param server - Server acceptances from Supabase
   * @returns Merged acceptances array
   */
  private mergeAcceptances(
    local: LegalAcceptance[],
    server: LegalAcceptance[]
  ): LegalAcceptance[] {
    const merged = new Map<string, LegalAcceptance>();

    // Add all local acceptances
    for (const acceptance of local) {
      merged.set(acceptance.docId, acceptance);
    }

    // Merge server acceptances
    for (const serverAcceptance of server) {
      const localAcceptance = merged.get(serverAcceptance.docId);

      if (!localAcceptance) {
        // No local record, use server
        merged.set(serverAcceptance.docId, serverAcceptance);
        continue;
      }

      // Both exist - use last-write-wins by timestamp
      const serverTime = new Date(serverAcceptance.acceptedAt).getTime();
      const localTime = new Date(localAcceptance.acceptedAt).getTime();

      if (serverTime > localTime) {
        merged.set(serverAcceptance.docId, serverAcceptance);
      } else if (serverTime === localTime) {
        // Tie-breaker: higher semver wins
        const versionComparison = this.compareVersions(
          serverAcceptance.acceptedVersion,
          localAcceptance.acceptedVersion
        );
        if (versionComparison > 0) {
          merged.set(serverAcceptance.docId, serverAcceptance);
        }
        // If local version is higher or equal, keep local (already in map)
      }
      // If local is newer, keep it (already in map)
    }

    return Array.from(merged.values());
  }

  /**
   * Sync legal acceptances with Supabase on sign-in
   * Fetches server acceptances, merges with local using last-write-wins
   * Updates local storage with merged result
   * 
   * Should be called after successful authentication
   */
  public async syncOnSignIn(): Promise<boolean> {
    try {
      logger.log('[sync] Starting sign-in sync...');

      // Fetch server acceptances
      const serverAcceptances = await this.fetchServerAcceptances();
      
      // Get local acceptances
      const localAcceptances = this.consentService.getLegalAcceptances();

      logger.log(`[sync] Local: ${localAcceptances.length}, Server: ${serverAcceptances.length}`);

      // Merge using last-write-wins strategy
      const mergedAcceptances = this.mergeAcceptances(localAcceptances, serverAcceptances);

      logger.log(`[sync] Merged: ${mergedAcceptances.length} acceptances`);

      // Update local storage
      const updateSuccess = this.consentService.setLegalAcceptances(mergedAcceptances);
      
      if (!updateSuccess) {
        logger.error('[sync] Failed to update local storage with merged acceptances');
        return false;
      }

      // Push any local-only or local-newer acceptances to server
      for (const acceptance of mergedAcceptances) {
        const serverAcceptance = serverAcceptances.find(s => s.docId === acceptance.docId);
        
        if (!serverAcceptance) {
          // Local-only acceptance, push to server
          logger.log(`[sync] Pushing local-only ${acceptance.docId} to server`);
          await this.upsertServerAcceptance(acceptance);
        } else {
          // Check if local is newer
          const localTime = new Date(acceptance.acceptedAt).getTime();
          const serverTime = new Date(serverAcceptance.acceptedAt).getTime();
          
          if (localTime > serverTime) {
            logger.log(`[sync] Pushing newer local ${acceptance.docId} to server`);
            await this.upsertServerAcceptance(acceptance);
          }
        }
      }

      logger.log('[sync] Sign-in sync complete');
      return true;
    } catch (error) {
      logger.error('[sync] Sign-in sync failed:', error);
      return false;
    }
  }

  /**
   * Record user acceptance of a legal document and sync to server
   * Updates both local storage and Supabase (if authenticated)
   */
  public async recordAcceptanceWithSync(acceptance: LegalAcceptance): Promise<boolean> {
    try {
      logger.log(`[sync] Recording acceptance for ${acceptance.docId} v${acceptance.acceptedVersion}`);
      
      // Update local storage first (offline-first)
      const localSuccess = this.consentService.updateLegalAcceptance(acceptance);
      
      if (!localSuccess) {
        logger.error('[sync] Failed to update local acceptance');
        return false;
      }

      // Try to sync to server (best-effort, don't fail if offline)
      const serverSuccess = await this.upsertServerAcceptance(acceptance);
      
      if (serverSuccess) {
        logger.log(`[sync] Successfully synced ${acceptance.docId} to server`);
      } else {
        logger.warn(`[sync] Could not sync ${acceptance.docId} to server (may be offline)`);
      }

      // Return true even if server sync fails (offline-first)
      return true;
    } catch (error) {
      logger.error('[sync] Failed to record acceptance with sync:', error);
      return false;
    }
  }

  /**
   * On sign-out: keep local records, do NOT delete server rows
   * Server records are preserved for when user signs in again
   */
  public onSignOut(): void {
    logger.log('[sync] User signed out - keeping local acceptances');
    // No action needed - local acceptances remain in localStorage
    // Server records remain in Supabase for this user
  }
}

// Export singleton instance
export const legalDocsService = LegalDocsService.getInstance();
