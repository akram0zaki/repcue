import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ConsentService } from '../consentService'
import type { CurrentConsentData } from '../../types/consent'

describe('ConsentService', () => {
  let consentService: ConsentService

  beforeEach(() => {
    // Clear localStorage mock and reset state
    vi.clearAllMocks()
    
    // Reset localStorage to clean state
    localStorage.clear()
    
    // Create a fresh instance by clearing the singleton
    // @ts-expect-error - accessing private static property for testing
    ConsentService.instance = undefined
    
    consentService = ConsentService.getInstance()
  })

  describe('hasConsent', () => {
    it('should return false when no consent is stored', () => {
      expect(consentService.hasConsent()).toBe(false)
    })

    it('should return true when valid current consent is stored', () => {
      const consentData: CurrentConsentData = {
        version: 2,
        timestamp: new Date().toISOString(),
        hasConsented: true,
        cookiesAccepted: true,
        analyticsAccepted: false,
        marketingAccepted: false,
        dataRetentionDays: 365
      }
      
      localStorage.setItem('repcue_consent', JSON.stringify(consentData))
      
      // Reload data from localStorage
      consentService.reloadConsentData()
      expect(consentService.hasConsent()).toBe(true)
    })

    it('should return false when invalid consent data is stored', () => {
      localStorage.setItem('repcue_consent', 'invalid-json')
      
      // Reload data from localStorage
      consentService.reloadConsentData()
      expect(consentService.hasConsent()).toBe(false)
    })
  })

  describe('consent migration', () => {
    it('should migrate legacy consent data without version', () => {
      const legacyData = {
        hasConsented: true,
        accepted: true,
        date: '2023-01-01T00:00:00.000Z'
      }
      
      localStorage.setItem('repcue_consent', JSON.stringify(legacyData))
      
      // Reload data to trigger migration
      consentService.reloadConsentData()
      
      const status = consentService.getConsentStatus()
      expect(status.version).toBe(2)
      expect(status.isLatestVersion).toBe(true)
      expect(consentService.hasConsent()).toBe(true)
    })

    it('should migrate v1 consent data to v2', () => {
      const v1Data = {
        version: 1,
        timestamp: '2023-01-01T00:00:00.000Z',
        hasConsented: true,
        cookiesAccepted: true,
        analyticsAccepted: true,
        consentDate: '2023-01-01T00:00:00.000Z'
      }
      
      localStorage.setItem('repcue_consent', JSON.stringify(v1Data))
      
      // Reload data to trigger migration
      consentService.reloadConsentData()
      
      const data = consentService.getConsentData()
      expect(data?.version).toBe(2)
      expect(data?.marketingAccepted).toBe(false) // Should default to false
      expect(data?.dataRetentionDays).toBe(365)   // Should default to 365
      expect(consentService.hasConsent()).toBe(true)
    })

    it('should handle malformed legacy data gracefully', () => {
      const malformedData = {
        someRandomField: true,
        invalidStructure: 'test'
      }
      
      localStorage.setItem('repcue_consent', JSON.stringify(malformedData))
      
      // Create new instance to trigger migration
      // @ts-expect-error - accessing private static property for testing
      ConsentService.instance = undefined
      consentService = ConsentService.getInstance()
      
      // Should reset to no consent when migration fails
      expect(consentService.hasConsent()).toBe(false)
      expect(consentService.getConsentData()).toBeNull()
    })
  })

  describe('setConsent', () => {
    it('should store consent data with current version and dispatch event', () => {
      const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent')
      
      consentService.setConsent({
        hasConsented: true,
        cookiesAccepted: true,
        analyticsAccepted: true,
        marketingAccepted: false
      })

      const data = consentService.getConsentData()
      expect(data?.version).toBe(2)
      expect(data?.hasConsented).toBe(true)
      expect(data?.analyticsAccepted).toBe(true)
      expect(data?.marketingAccepted).toBe(false)
      expect(data?.dataRetentionDays).toBe(365) // Should use default
      
      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'consent-granted'
        })
      )
    })
  })

  describe('grantConsent (legacy method)', () => {
    it('should grant consent with proper defaults', () => {
      consentService.grantConsent(false)

      const data = consentService.getConsentData()
      expect(data?.hasConsented).toBe(true)
      expect(data?.cookiesAccepted).toBe(true)
      expect(data?.analyticsAccepted).toBe(false)
      expect(data?.marketingAccepted).toBe(false)
      expect(data?.version).toBe(2)
    })

    it('should include analytics consent when specified', () => {
      consentService.grantConsent(true)

      const data = consentService.getConsentData()
      expect(data?.analyticsAccepted).toBe(true)
    })
  })

  describe('revokeConsent', () => {
    it('should clear application data and set revoked consent state', () => {
      const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent')
      
      // First grant consent
      consentService.grantConsent(true)
      expect(consentService.hasConsent()).toBe(true)
      
      // Set up some localStorage data to be cleared
      localStorage.setItem('test_data', 'should_be_cleared')
      localStorage.setItem('user_settings', 'should_be_cleared')
      
      consentService.revokeConsent()

      // Verify consent is revoked but data structure is maintained
      expect(consentService.hasConsent()).toBe(false)
      const data = consentService.getConsentData()
      expect(data?.hasConsented).toBe(false)
      expect(data?.version).toBe(2)
      
      // Verify localStorage was cleared (except consent)
      expect(localStorage.getItem('test_data')).toBeNull()
      expect(localStorage.getItem('user_settings')).toBeNull()
      expect(localStorage.getItem('repcue_consent')).not.toBeNull()
      
      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'consent-revoked'
        })
      )
    })
  })

  describe('hasAnalyticsConsent', () => {
    it('should return false when no consent exists', () => {
      expect(consentService.hasAnalyticsConsent()).toBe(false)
    })

    it('should return true when analytics consent is granted', () => {
      consentService.grantConsent(true)
      expect(consentService.hasAnalyticsConsent()).toBe(true)
    })

    it('should return false when only basic consent is granted', () => {
      consentService.grantConsent(false)
      expect(consentService.hasAnalyticsConsent()).toBe(false)
    })
  })

  describe('hasMarketingConsent', () => {
    it('should return false when no consent exists', () => {
      expect(consentService.hasMarketingConsent()).toBe(false)
    })

    it('should return true when marketing consent is granted', () => {
      consentService.setConsent({
        hasConsented: true,
        cookiesAccepted: true,
        marketingAccepted: true
      })
      expect(consentService.hasMarketingConsent()).toBe(true)
    })

    it('should return false when marketing consent is not granted', () => {
      consentService.grantConsent(true)
      expect(consentService.hasMarketingConsent()).toBe(false)
    })
  })

  describe('shouldShowConsentBanner', () => {
    it('should return true when no consent is given', () => {
      expect(consentService.shouldShowConsentBanner()).toBe(true)
    })

    it('should return false when consent is given', () => {
      consentService.grantConsent()
      expect(consentService.shouldShowConsentBanner()).toBe(false)
    })
  })

  describe('getConsentData', () => {
    it('should return null when no consent exists', () => {
      expect(consentService.getConsentData()).toBeNull()
    })

    it('should return consent data when it exists', () => {
      consentService.grantConsent(true)
      const data = consentService.getConsentData()
      
      expect(data).toMatchObject({
        version: 2,
        hasConsented: true,
        cookiesAccepted: true,
        analyticsAccepted: true,
        marketingAccepted: false,
        dataRetentionDays: 365
      })
      expect(data?.timestamp).toBeTruthy()
    })
  })

  describe('getConsentStatus', () => {
    it('should return correct status when no consent exists', () => {
      const status = consentService.getConsentStatus()
      
      expect(status).toMatchObject({
        hasConsent: false,
        version: 0,
        isLatestVersion: false,
        data: null,
        requiresUpdate: false
      })
    })

    it('should return correct status when current consent exists', () => {
      consentService.grantConsent(true)
      const status = consentService.getConsentStatus()
      
      expect(status).toMatchObject({
        hasConsent: true,
        version: 2,
        isLatestVersion: true,
        requiresUpdate: false
      })
      expect(status.data).not.toBeNull()
    })
  })

  describe('resetConsent', () => {
    it('should clear consent data and localStorage', () => {
      // First set consent
      consentService.grantConsent(true)
      expect(consentService.hasConsent()).toBe(true)
      
      // Reset consent
      consentService.resetConsent()
      
      expect(consentService.hasConsent()).toBe(false)
      expect(consentService.getConsentData()).toBeNull()
      expect(localStorage.getItem('repcue_consent')).toBeNull()
    })
  })
}) 