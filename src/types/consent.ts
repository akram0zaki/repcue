// Consent data versioning system for RepCue
// This file handles different versions of consent data structure

export interface ConsentDataV1 {
  version: 1;
  timestamp: string;
  hasConsented: boolean;
  cookiesAccepted: boolean;
  analyticsAccepted: boolean;
  consentDate?: Date | string;
}

export interface ConsentDataV2 {
  version: 2;
  timestamp: string;
  hasConsented: boolean;
  cookiesAccepted: boolean;
  analyticsAccepted: boolean;
  marketingAccepted: boolean;
  dataRetentionDays: number;
  consentDate?: Date | string;
}

// Union type for all consent versions
export type ConsentData = ConsentDataV1 | ConsentDataV2;

// Current version (update this when adding new versions)
export type CurrentConsentData = ConsentDataV2;
export const CURRENT_CONSENT_VERSION = 2;

// Migration interface for handling version upgrades
export interface ConsentMigration {
  from: number;
  to: number;
  migrate: (oldData: ConsentData) => ConsentData;
}

// Consent status for debugging and UI display
export interface ConsentStatus {
  hasConsent: boolean;
  version: number;
  isLatestVersion: boolean;
  data: CurrentConsentData | null;
  requiresUpdate: boolean;
}

// Legacy consent data interface (for backward compatibility)
export interface LegacyConsentData {
  hasConsented?: boolean;
  accepted?: boolean;
  cookiesAccepted?: boolean;
  analyticsAccepted?: boolean;
  consentDate?: Date | string;
  date?: Date | string;
  version?: number;
}
