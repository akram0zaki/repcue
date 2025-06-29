import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ConsentBanner } from '../ConsentBanner'
import { consentService } from '../../services/consentService'

// Mock the ConsentService
vi.mock('../../services/consentService', () => ({
  consentService: {
    grantConsent: vi.fn(),
    revokeConsent: vi.fn(),
    shouldShowConsentBanner: vi.fn(() => true),
    getPrivacyNoticeText: vi.fn(() => 'Privacy notice text'),
    getDataRetentionText: vi.fn(() => 'Data retention text')
  }
}))

describe('ConsentBanner', () => {
  let mockOnConsentGranted: any

  beforeEach(() => {
    mockOnConsentGranted = vi.fn()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('when consent banner should be shown', () => {
    beforeEach(() => {
      vi.mocked(consentService.shouldShowConsentBanner).mockReturnValue(true)
    })

    it('should render the consent banner', () => {
      render(<ConsentBanner onConsentGranted={mockOnConsentGranted} />)
      
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText(/RepCue needs your permission/i)).toBeInTheDocument()
    })

    it('should display privacy information when details are shown', async () => {
      render(<ConsentBanner onConsentGranted={mockOnConsentGranted} />)
      
      // Click to show details first
      const learnMoreButton = screen.getByRole('button', { name: /learn more/i })
      fireEvent.click(learnMoreButton)
      
      await waitFor(() => {
        expect(screen.getByText(/What data do we store/i)).toBeInTheDocument()
        expect(screen.getByText(/Your data stays private/i)).toBeInTheDocument()
      })
    })

    it('should have accept buttons', () => {
      render(<ConsentBanner onConsentGranted={mockOnConsentGranted} />)
      
      expect(screen.getByRole('button', { name: /accept all & continue/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /essential only/i })).toBeInTheDocument()
    })

    it('should call grantConsent and callback when accept all is clicked', async () => {
      render(<ConsentBanner onConsentGranted={mockOnConsentGranted} />)
      
      const acceptButton = screen.getByRole('button', { name: /accept all & continue/i })
      fireEvent.click(acceptButton)
      
      await waitFor(() => {
        expect(vi.mocked(consentService.grantConsent)).toHaveBeenCalledWith(true)
        expect(mockOnConsentGranted).toHaveBeenCalled()
      })
    })

    it('should call grantConsent with essential only when essential button is clicked', async () => {
      render(<ConsentBanner onConsentGranted={mockOnConsentGranted} />)
      
      const essentialButton = screen.getByRole('button', { name: /essential only/i })
      fireEvent.click(essentialButton)
      
      await waitFor(() => {
        expect(vi.mocked(consentService.grantConsent)).toHaveBeenCalledWith(false)
        expect(mockOnConsentGranted).toHaveBeenCalled()
      })
    })

    it('should show/hide details section when toggle is clicked', async () => {
      render(<ConsentBanner onConsentGranted={mockOnConsentGranted} />)
      
      const toggleButton = screen.getByRole('button', { name: /learn more/i })
      
      // Initially details should be hidden
      expect(screen.queryByText(/What data do we store/i)).not.toBeInTheDocument()
      
      // Click to show details
      fireEvent.click(toggleButton)
      
      await waitFor(() => {
        expect(screen.getByText(/What data do we store/i)).toBeInTheDocument()
      })
      
      // Click again to hide details
      const hideButton = screen.getByRole('button', { name: /show less/i })
      fireEvent.click(hideButton)
      
      await waitFor(() => {
        expect(screen.queryByText(/What data do we store/i)).not.toBeInTheDocument()
      })
    })

    it('should be accessible with proper ARIA attributes', () => {
      render(<ConsentBanner onConsentGranted={mockOnConsentGranted} />)
      
      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-labelledby', 'consent-title')
      expect(dialog).toHaveAttribute('aria-describedby', 'consent-description')
      
      const title = screen.getByRole('heading', { level: 2 })
      expect(title).toHaveAttribute('id', 'consent-title')
    })

    it('should focus the accept button initially', () => {
      render(<ConsentBanner onConsentGranted={mockOnConsentGranted} />)
      
      const acceptButton = screen.getByRole('button', { name: /accept all & continue/i })
      
      // Should be focused after render
      expect(acceptButton).toHaveFocus()
    })

    it('should prevent background interaction', () => {
      render(
        <div>
          <button>Background Button</button>
          <ConsentBanner onConsentGranted={mockOnConsentGranted} />
        </div>
      )
      
      const dialog = screen.getByRole('dialog')
      
      // Dialog should have backdrop that prevents interaction
      expect(dialog).toBeInTheDocument()
      expect(dialog.parentElement).toHaveClass('fixed', 'inset-0')
    })
  })

  describe('responsive design', () => {
    it('should have responsive classes for mobile and desktop', () => {
      render(<ConsentBanner onConsentGranted={mockOnConsentGranted} />)
      
      const banner = screen.getByRole('dialog')
      
      // Should have responsive positioning and sizing classes
      expect(banner).toHaveClass('max-w-md', 'w-full')
    })
  })
}) 