import type { ConsentData } from '../types';

const CONSENT_STORAGE_KEY = 'repcue_consent';
const CONSENT_VERSION = '1.0';

/**
 * GDPR-compliant consent management service
 * Handles cookie consent and data storage permissions
 */
export class ConsentService {
  private static instance: ConsentService;
  private consentData: ConsentData | null = null;

  private constructor() {
    this.loadConsentData();
  }

  public static getInstance(): ConsentService {
    if (!ConsentService.instance) {
      ConsentService.instance = new ConsentService();
    }
    return ConsentService.instance;
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
   * Get current consent data
   */
  public getConsentData(): ConsentData | null {
    return this.consentData;
  }

  /**
   * Grant consent for data storage
   */
  public grantConsent(includeAnalytics: boolean = false): void {
    const consentData: ConsentData = {
      hasConsented: true,
      consentDate: new Date(),
      cookiesAccepted: true,
      analyticsAccepted: includeAnalytics
    };

    this.consentData = consentData;
    this.saveConsentData();

    // Dispatch custom event for components to react to consent changes
    window.dispatchEvent(new CustomEvent('consent-granted', { 
      detail: { consentData } 
    }));
  }

  /**
   * Revoke consent and clear all stored data
   */
  public revokeConsent(): void {
    // Clear all application data
    this.clearAllApplicationData();

    // Reset consent
    this.consentData = {
      hasConsented: false,
      cookiesAccepted: false,
      analyticsAccepted: false
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
   * Load consent data from storage
   */
  private loadConsentData(): void {
    try {
      // We can only read basic consent data without user permission
      const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Validate the data structure and version
        if (this.isValidConsentData(parsed)) {
          this.consentData = {
            ...parsed,
            consentDate: parsed.consentDate ? new Date(parsed.consentDate) : undefined
          };
        }
      }
    } catch (error) {
      console.warn('Failed to load consent data:', error);
      this.consentData = null;
    }
  }

  /**
   * Save consent data to storage
   */
  private saveConsentData(): void {
    try {
      if (this.consentData) {
        const dataToStore = {
          ...this.consentData,
          version: CONSENT_VERSION
        };
        localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(dataToStore));
      }
    } catch (error) {
      console.error('Failed to save consent data:', error);
    }
  }

  /**
   * Validate consent data structure
   */
  private isValidConsentData(data: unknown): data is ConsentData {
    return (
      typeof data === 'object' &&
      data !== null &&
      'hasConsented' in data &&
      'cookiesAccepted' in data &&
      'analyticsAccepted' in data &&
      typeof (data as ConsentData).hasConsented === 'boolean' &&
      typeof (data as ConsentData).cookiesAccepted === 'boolean' &&
      typeof (data as ConsentData).analyticsAccepted === 'boolean'
    );
  }

  /**
   * Clear all application data (for consent revocation)
   */
  private clearAllApplicationData(): void {
    try {
      // Clear localStorage except for consent data
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key !== CONSENT_STORAGE_KEY) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));

      // Clear sessionStorage
      sessionStorage.clear();

      // Clear IndexedDB if it exists (for future use)
      if ('indexedDB' in window) {
        // We'll implement IndexedDB clearing when we add Dexie
        console.log('IndexedDB clearing will be implemented with database service');
      }
    } catch (error) {
      console.error('Failed to clear application data:', error);
    }
  }

  /**
   * Generate user-friendly privacy notice text
   */
  public getPrivacyNoticeText(): string {
    return `
      RepCue uses cookies and local storage to save your exercise preferences, 
      activity logs, and app settings on your device. This data never leaves 
      your device unless you explicitly choose to sync with our cloud service.
      
      We respect your privacy and comply with GDPR regulations. You can export 
      or delete your data at any time from the Settings page.
    `.trim();
  }

  /**
   * Get data retention policy text
   */
  public getDataRetentionText(): string {
    return `
      Your data is stored locally on your device and is automatically deleted 
      if you revoke consent. If you choose to sync with our cloud service in 
      the future, you can delete your cloud data at any time.
    `.trim();
  }
}

// Export singleton instance
export const consentService = ConsentService.getInstance(); 