/**
 * Legal Acceptance V3 - Type Definitions
 * 
 * This file defines types for the versioned legal document acceptance system.
 * Legal acceptance is separate from essential consent (cookies/storage) and
 * syncs across devices for authenticated users.
 */

/**
 * Legal acceptance record for a single document
 * Stored locally (IndexedDB) and synced to Supabase for authenticated users
 */
export interface LegalAcceptance {
  /** Unique identifier for the legal document (e.g., 'terms_conditions') */
  docId: string;
  
  /** Semantic version of the accepted document (e.g., '1.0.0') */
  acceptedVersion: string;
  
  /** SHA-256 base64 hash of the document content for change detection */
  contentHash: string;
  
  /** ISO 8601 timestamp of when the user accepted this version */
  acceptedAt: string;
  
  /** Locale the user viewed when accepting (for audit trail) */
  acceptedLocale: string;
}

/**
 * Consent V3 - extends V2 with legal acceptances
 * Stores both essential consent (device-local) and legal acceptances (synced)
 */
export interface ConsentV3 {
  /** Schema version for migration handling */
  version: 3;
  
  /** ISO 8601 timestamp of when consent was last modified */
  timestamp: string;
  
  /** Essential cookies/storage consent (device-local, required for app function) */
  essentialAccepted: boolean;
  
  /** Cookie consent (separate from essential) */
  cookiesAccepted: boolean;
  
  /** Analytics/telemetry consent */
  analyticsAccepted: boolean;
  
  /** Marketing communications consent */
  marketingAccepted: boolean;
  
  /** Data retention period in days */
  dataRetentionDays: number;
  
  /** Legal document acceptances (synced across devices for auth users) */
  legalAcceptances: LegalAcceptance[];
}

/**
 * Policy for how to enforce legal document acceptance
 */
export type LegalPolicy = 
  | 'force'     // Immediate blocking gate (emergency compliance)
  | 'deferred'; // Workout-aware deferral (default)

/**
 * Localized version of a legal document
 */
export interface LegalDocLocale {
  /** Locale code (e.g., 'en', 'nl', 'ar') */
  locale: string;
  
  /** Path to the markdown file (e.g., '/legal/01-terms_conditions.en.md') */
  path: string;
  
  /** SHA-256 base64 hash of the document content */
  contentHash: string;
}

/**
 * Legal document metadata
 */
export interface LegalDoc {
  /** Unique identifier (e.g., 'terms_conditions') - no numeric prefix */
  id: string;
  
  /** User-facing title (e.g., 'Terms & Conditions') */
  title: string;
  
  /** Semantic version of this document (e.g., '1.0.0') */
  version: string;
  
  /** Whether acceptance is required to use the app */
  required: boolean;
  
  /** Enforcement policy (defaults to 'deferred') */
  policy?: LegalPolicy;
  
  /** ISO 8601 date when acceptance becomes mandatory (defaults to immediate) */
  effectiveFrom?: string;
  
  /** Available localized versions */
  locales: LegalDocLocale[];
}

/**
 * Legal manifest - lists all legal documents and their versions
 */
export interface LegalManifest {
  /** ISO 8601 timestamp of when this manifest was last updated */
  updatedAt: string;
  
  /** List of legal documents (ordered by priority) */
  documents: LegalDoc[];
}

/**
 * Status of a user's legal acceptance state
 */
export interface LegalAcceptanceStatus {
  /** All required documents are accepted */
  allRequiredAccepted: boolean;
  
  /** Documents requiring acceptance */
  outstandingRequired: LegalDoc[];
  
  /** Documents with future effective dates (notification only) */
  upcomingChanges: LegalDoc[];
  
  /** Total number of documents in manifest */
  totalDocuments: number;
  
  /** Number of required documents */
  requiredDocuments: number;
  
  /** Number of accepted documents */
  acceptedDocuments: number;
}

/**
 * Locale fallback rules for legal documents
 * ar-* → ar; all other locales → en
 */
export type LocaleFallbackRules = {
  /** Preferred locale */
  preferred: string;
  
  /** Fallback locale if preferred not available */
  fallback: 'en' | 'ar';
};

/**
 * Request to record legal acceptance
 */
export interface RecordAcceptanceRequest {
  /** Document identifier */
  docId: string;
  
  /** Document version accepted */
  version: string;
  
  /** Content hash of accepted version */
  contentHash: string;
  
  /** Locale viewed when accepting */
  acceptedLocale: string;
}

/**
 * Supabase table row for legal_acceptances
 */
export interface LegalAcceptanceRow {
  user_id: string;
  doc_id: string;
  accepted_version: string;
  content_hash: string;
  locale: string;
  accepted_at: string;
}
