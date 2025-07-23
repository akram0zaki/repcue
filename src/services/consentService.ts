import type { 
  CurrentConsentData, 
  ConsentMigration, 
  ConsentStatus,
  LegacyConsentData,
  ConsentData
} from '../types/consent';
import { CURRENT_CONSENT_VERSION } from '../types/consent';

const CONSENT_STORAGE_KEY = 'repcue_consent';

/**
 * Enhanced GDPR-compliant consent management service with versioning and migration
 * Handles different versions of consent data structure for future compatibility
 */
export class ConsentService {
  private static instance: ConsentService;
  private consentData: CurrentConsentData | null = null;
  
  // Migration definitions for handling version upgrades
  private readonly migrations: ConsentMigration[] = [
    {
      from: 1,
      to: 2,
      migrate: (v1Data: ConsentData) => ({
        ...v1Data,
        version: 2,
        marketingAccepted: false, // Default to false for privacy
        dataRetentionDays: 365,   // Default retention period
        timestamp: v1Data.timestamp || new Date().toISOString()
      })
    }
    // Future migrations can be added here
  ];

  private constructor() {
    this.loadAndMigrateConsentData();
  }

  public static getInstance(): ConsentService {
    if (!ConsentService.instance) {
      ConsentService.instance = new ConsentService();
    }
    return ConsentService.instance;
  }

  /**
   * Load and migrate consent data to current version if needed
   */
  private loadAndMigrateConsentData(): void {
    try {
      const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
      if (!stored) {
        this.consentData = null;
        return;
      }

      let consentData = JSON.parse(stored);
      
      // Handle legacy data without version (assume v1)
      if (!consentData.version) {
        consentData = this.migrateLegacyConsentData(consentData);
      }

      // Apply migrations sequentially to reach current version
      const migratedData = this.applyMigrations(consentData);
      
      // Validate and set the migrated data
      if (this.isValidCurrentConsentData(migratedData)) {
        this.consentData = migratedData;
        
        // Save migrated data if version changed
        if (migratedData.version !== consentData.version) {
          console.log(`Consent migrated from v${consentData.version} to v${migratedData.version}`);
          this.saveConsentData();
        }
      } else {
        console.warn('Invalid consent data after migration, resetting');
        this.resetConsent();
      }
    } catch (error) {
      console.error('Consent migration failed:', error);
      this.resetConsent(); // Reset on migration failure
    }
  }

  /**
   * Apply migrations sequentially to reach current version
   */
  private applyMigrations(data: ConsentData): CurrentConsentData {
    let currentData = { ...data };
    
    while (currentData.version < CURRENT_CONSENT_VERSION) {
      const migration = this.migrations.find(m => m.from === currentData.version);
      if (!migration) {
        console.warn(`No migration found from version ${currentData.version} to ${CURRENT_CONSENT_VERSION}`);
        break;
      }
      
      console.log(`Applying migration from v${migration.from} to v${migration.to}`);
      currentData = migration.migrate(currentData);
    }

    return currentData as CurrentConsentData;
  }

  /**
   * Migrate legacy consent data to v1 format
   */
  private migrateLegacyConsentData(data: LegacyConsentData): ConsentData {
    // Check if data has at least one recognized legacy field
    const hasRecognizedField = (
      'hasConsented' in data || 
      'accepted' in data || 
      'cookiesAccepted' in data || 
      'analyticsAccepted' in data || 
      'consentDate' in data || 
      'date' in data ||
      'version' in data
    );
    
    if (!hasRecognizedField) {
      throw new Error('Malformed legacy data: no recognized fields found');
    }
    
    return {
      version: 1,
      timestamp: new Date().toISOString(),
      hasConsented: data.hasConsented === true || data.accepted === true,
      cookiesAccepted: data.cookiesAccepted === true || data.hasConsented === true || data.accepted === true,
      analyticsAccepted: data.analyticsAccepted === true || false,
      consentDate: data.consentDate || data.date || new Date().toISOString()
    };
  }

  /**
   * Validate current consent data structure
   */
  private isValidCurrentConsentData(data: unknown): data is CurrentConsentData {
    return (
      typeof data === 'object' &&
      data !== null &&
      'version' in data &&
      (data as Record<string, unknown>).version === CURRENT_CONSENT_VERSION &&
      'hasConsented' in data &&
      typeof (data as Record<string, unknown>).hasConsented === 'boolean' &&
      'cookiesAccepted' in data &&
      typeof (data as Record<string, unknown>).cookiesAccepted === 'boolean' &&
      'analyticsAccepted' in data &&
      typeof (data as Record<string, unknown>).analyticsAccepted === 'boolean' &&
      'marketingAccepted' in data &&
      typeof (data as Record<string, unknown>).marketingAccepted === 'boolean' &&
      'dataRetentionDays' in data &&
      typeof (data as Record<string, unknown>).dataRetentionDays === 'number' &&
      'timestamp' in data &&
      typeof (data as Record<string, unknown>).timestamp === 'string'
    );
  }

  /**
   * Check if user has given consent for data storage
   */
  public hasConsent(): boolean {
    return this.consentData?.hasConsented === true && this.consentData?.cookiesAccepted === true;
  }

  /**
   * Check if user has specifically consented to analytics
   */
  public hasAnalyticsConsent(): boolean {
    return this.hasConsent() && this.consentData?.analyticsAccepted === true;
  }

  /**
   * Check if user has consented to marketing
   */
  public hasMarketingConsent(): boolean {
    return this.hasConsent() && this.consentData?.marketingAccepted === true;
  }

  /**
   * Get current consent data
   */
  public getConsentData(): CurrentConsentData | null {
    return this.consentData;
  }

  /**
   * Set consent with current version structure
   */
  public setConsent(data: Partial<Omit<CurrentConsentData, 'version' | 'timestamp'>>): void {
    const consentData: CurrentConsentData = {
      version: CURRENT_CONSENT_VERSION,
      timestamp: new Date().toISOString(),
      hasConsented: true,
      cookiesAccepted: true,
      analyticsAccepted: false,
      marketingAccepted: false,
      dataRetentionDays: 365,
      ...data
    };

    this.consentData = consentData;
    this.saveConsentData();

    // Dispatch custom event for components to react to consent changes
    window.dispatchEvent(new CustomEvent('consent-granted', { 
      detail: { consentData } 
    }));
  }

  /**
   * Grant consent for data storage (legacy method for backward compatibility)
   */
  public grantConsent(includeAnalytics: boolean = false): void {
    this.setConsent({
      hasConsented: true,
      cookiesAccepted: true,
      analyticsAccepted: includeAnalytics,
      marketingAccepted: false
    });
  }

  /**
   * Revoke consent and clear all stored data
   */
  public revokeConsent(): void {
    // Clear all application data
    this.clearAllApplicationData();

    // Reset consent to default state
    this.consentData = {
      version: CURRENT_CONSENT_VERSION,
      timestamp: new Date().toISOString(),
      hasConsented: false,
      cookiesAccepted: false,
      analyticsAccepted: false,
      marketingAccepted: false,
      dataRetentionDays: 365
    };

    this.saveConsentData();

    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('consent-revoked'));
  }

  /**
   * Check if consent banner should be shown
   */
  public shouldShowConsentBanner(): boolean {
    return !this.hasConsent();
  }

  /**
   * Reset consent data (for debugging/migration purposes)
   */
  public resetConsent(): void {
    this.consentData = null;
    localStorage.removeItem(CONSENT_STORAGE_KEY);
    console.log('Consent data has been reset');
  }

  /**
   * Force reload consent data from storage (for testing purposes)
   */
  public reloadConsentData(): void {
    this.loadAndMigrateConsentData();
  }

  /**
   * Get consent status with version info for debugging and UI
   */
  public getConsentStatus(): ConsentStatus {
    const data = this.getConsentData();
    return {
      hasConsent: this.hasConsent(),
      version: data?.version || 0,
      isLatestVersion: data?.version === CURRENT_CONSENT_VERSION,
      data,
      requiresUpdate: data ? data.version < CURRENT_CONSENT_VERSION : false
    };
  }

  /**
   * Save consent data to storage
   */
  private saveConsentData(): void {
    try {
      if (this.consentData) {
        localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(this.consentData));
      }
    } catch (error) {
      console.error('Failed to save consent data:', error);
    }
  }

  /**
   * Clear all application data (for consent revocation)
   */
  private clearAllApplicationData(): void {
    try {
      // Clear all localStorage except consent
      const currentConsent = localStorage.getItem(CONSENT_STORAGE_KEY);
      localStorage.clear();
      if (currentConsent) {
        localStorage.setItem(CONSENT_STORAGE_KEY, currentConsent);
      }

      // Clear IndexedDB databases
      if ('indexedDB' in window) {
        // This is a simplified approach - in practice you'd want to enumerate and clear specific databases
        indexedDB.deleteDatabase('RepCueDB');
      }
    } catch (error) {
      console.error('Failed to clear application data:', error);
    }
  }
}

// Export singleton instance
export const consentService = ConsentService.getInstance();