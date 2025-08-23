// Accessibility tests using axe-core for T1.6: WCAG compliance
describe('Accessibility Tests', () => {
  beforeEach(() => {
    cy.clearAppData()
    cy.visit('/')
    cy.acceptConsent()
    cy.injectAxe()
  })

  it('should meet WCAG AA standards on home page', () => {
    cy.checkA11y(undefined, {
      rules: {
        'color-contrast': { enabled: true },
        'keyboard-navigation': { enabled: true },
        'focus-management': { enabled: true }
      }
    })
  })

  it('should meet WCAG AA standards on exercise page', () => {
    cy.visit('/exercises')
    cy.checkA11y(undefined, {
      rules: {
        'button-name': { enabled: true },
        'link-name': { enabled: true },
        'aria-labels': { enabled: true }
      }
    })
  })

  it('should meet WCAG AA standards on timer page', () => {
    cy.visit('/timer')
    cy.checkA11y(undefined, {
      rules: {
        'button-name': { enabled: true },
        'aria-live': { enabled: true },
        'focus-visible': { enabled: true }
      }
    })
  })

  it('should meet WCAG AA standards on activity log page', () => {
    cy.visit('/activity')
    cy.checkA11y()
  })

  it('should meet WCAG AA standards on settings page', () => {
    cy.visit('/settings')
    cy.checkA11y(undefined, {
      rules: {
        'label': { enabled: true },
        'form-field-multiple-labels': { enabled: true },
        'aria-required-attr': { enabled: true }
      }
    })
  })

  it('should support keyboard navigation on home page', () => {
    // Use real Tab key for navigation
    cy.get('body').type('{tab}')
    cy.focused().should('have.attr', 'data-testid', 'nav-home')
    
    cy.focused().type('{tab}')
    cy.focused().should('have.attr', 'data-testid', 'nav-exercises')
    
    cy.focused().type('{tab}')
    cy.focused().should('have.attr', 'data-testid', 'nav-timer')
    
    cy.focused().type('{tab}')
    cy.focused().should('have.attr', 'data-testid', 'nav-activity')
    
    cy.focused().type('{tab}')
    cy.focused().should('have.attr', 'data-testid', 'nav-settings')
  })

  it('should support keyboard navigation on timer page', () => {
    cy.visit('/timer')
    
    // Tab to timer controls
    cy.get('body').type('{tab}{tab}{tab}{tab}{tab}') // Skip navigation
    cy.focused().should('contain', '15s')
    
    // Enter should activate quick timer
    cy.focused().type('{enter}')
    cy.get('[data-testid="timer-display"]').should('contain', '00:15')
  })

  it('should provide proper ARIA labels for interactive elements', () => {
    // Check favorite buttons have proper labels
    cy.get('[aria-label*="toggle favorite"]').should('exist')
    
    // Check navigation has proper labels
    cy.get('[data-testid="nav-home"]').should('have.attr', 'aria-label')
    cy.get('[data-testid="nav-exercises"]').should('have.attr', 'aria-label')
    
    cy.visit('/timer')
    
    // Check timer controls have proper labels
    cy.get('[data-testid="start-timer"]').should('have.attr', 'aria-label')
  })

  it('should provide proper heading hierarchy', () => {
    // Check home page heading structure
    cy.get('h1').should('have.length', 1)
    cy.get('h1').should('contain', 'RepCue')
    
    cy.get('h2').should('have.length.greaterThan', 0)
    
    cy.visit('/exercises')
    
    // Check exercises page heading structure
    cy.get('h1').should('have.length', 1)
    cy.get('h1').should('contain', 'Exercises')
  })

  it('should provide sufficient color contrast', () => {
    cy.checkA11y(undefined, {
      rules: {
        'color-contrast': { enabled: true }
      }
    })
    
    // Test dark mode
    cy.visit('/settings')
    cy.get('[data-testid="dark-mode-toggle"]').click()
    
    cy.visit('/')
    cy.checkA11y(undefined, {
      rules: {
        'color-contrast': { enabled: true }
      }
    })
  })

  it('should provide focus indicators', () => {
    // Tab through elements and verify focus is visible
    cy.get('body').type('{tab}')
    cy.focused().should('be.visible')
    
    cy.focused().type('{tab}')
    cy.focused().should('be.visible')
  })

  it('should handle screen reader announcements', () => {
    cy.visit('/timer')
    
    // Check for aria-live regions
    cy.get('[aria-live]').should('exist')
    
    // Start timer and check announcements
    cy.get('[data-testid="quick-timer-15s"]').click()
    cy.get('[data-testid="start-timer"]').click()
    
    // Verify aria-live region updates
    cy.get('[aria-live]').should('contain.text', 'Timer running')
  })

  it('should provide meaningful link text', () => {
    cy.get('a').each(($link) => {
      cy.wrap($link).should('not.have.text', 'click here')
      cy.wrap($link).should('not.have.text', 'read more')
      cy.wrap($link).should('not.have.text', 'here')
    })
  })

  it('should provide form labels and error messages', () => {
    cy.visit('/settings')
    
    // Check all form inputs have labels
    cy.get('input, select, textarea').each(($input) => {
      const id = $input.attr('id')
      if (id) {
        cy.get(`label[for="${id}"]`).should('exist')
      } else {
        cy.wrap($input).parent().should('contain', 'label')
      }
    })
  })
})
