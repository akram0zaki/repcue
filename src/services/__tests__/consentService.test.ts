import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ConsentService } from '../consentService'

describe('ConsentService', () => {
  let consentService: ConsentService

  beforeEach(() => {
    // Clear localStorage mock and reset state
    vi.clearAllMocks()
    
    // Reset localStorage to clean state
    localStorage.clear()
    
    // Create a fresh instance by clearing the singleton
    // @ts-ignore - accessing private static property for testing
    ConsentService.instance = undefined
    
    consentService = ConsentService.getInstance()
  })

  describe('hasConsent', () => {
    it('should return false when no consent is stored', () => {
      vi.mocked(localStorage.getItem).mockReturnValue(null)
      expect(consentService.hasConsent()).toBe(false)
    })

    it('should return true when valid consent is stored', () => {
      const consentData = {
        hasConsented: true,
        cookiesAccepted: true,
        analyticsAccepted: false,
        consentDate: new Date().toISOString(),
        version: '1.0'
      }
      
      // Mock localStorage.getItem before creating new instance
      localStorage.setItem('repcue_consent', JSON.stringify(consentData))
      
      // Create new instance to reload data
      // @ts-ignore - accessing private static property for testing
      ConsentService.instance = undefined
      consentService = ConsentService.getInstance()
      expect(consentService.hasConsent()).toBe(true)
    })

    it('should return false when invalid consent data is stored', () => {
      vi.mocked(localStorage.getItem).mockReturnValue('invalid-json')
      expect(consentService.hasConsent()).toBe(false)
    })
  })

  describe('grantConsent', () => {
    it('should store consent data and dispatch event', () => {
      const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent')
      
      consentService.grantConsent(false)

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'repcue_consent',
        expect.stringContaining('"hasConsented":true')
      )
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'repcue_consent',
        expect.stringContaining('"cookiesAccepted":true')
      )
      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'consent-granted'
        })
      )
    })

    it('should include analytics consent when specified', () => {
      consentService.grantConsent(true)

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'repcue_consent',
        expect.stringContaining('"analyticsAccepted":true')
      )
    })

    it('should exclude analytics consent by default', () => {
      consentService.grantConsent()

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'repcue_consent',
        expect.stringContaining('"analyticsAccepted":false')
      )
    })
  })

  describe('revokeConsent', () => {
    it('should clear application data and dispatch event', () => {
      const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent')
      
      // Set up some localStorage data to be cleared
      localStorage.setItem('test_data', 'should_be_cleared')
      localStorage.setItem('user_settings', 'should_be_cleared')
      
      consentService.revokeConsent()

      // Verify data was actually cleared
      expect(localStorage.getItem('test_data')).toBeNull()
      expect(localStorage.getItem('user_settings')).toBeNull()
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
        hasConsented: true,
        cookiesAccepted: true,
        analyticsAccepted: true
      })
      expect(data?.consentDate).toBeInstanceOf(Date)
    })
  })

  describe('getPrivacyNoticeText', () => {
    it('should return privacy notice text', () => {
      const text = consentService.getPrivacyNoticeText()
      expect(text).toContain('RepCue uses cookies')
      expect(text).toContain('GDPR')
    })
  })

  describe('getDataRetentionText', () => {
    it('should return data retention policy text', () => {
      const text = consentService.getDataRetentionText()
      expect(text).toContain('stored locally')
      expect(text).toContain('automatically deleted')
    })
  })
}) 