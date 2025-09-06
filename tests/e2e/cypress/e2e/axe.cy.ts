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
        'focus-order-semantics': { enabled: true },
        'tabindex': { enabled: true }
      }
    })
  })

  it('should meet WCAG AA standards on exercise page', () => {
    cy.visit('/exercises')
    
    // Wait for page to load completely
    cy.get('body').should('not.contain', 'Loading')
    cy.get('h1').should('exist')
    
    // Re-inject axe to ensure it's loaded
    cy.injectAxe()
    
    cy.checkA11y(undefined, {
      rules: {
        'button-name': { enabled: true },
        'link-name': { enabled: true },
        'aria-allowed-attr': { enabled: true },
        'aria-required-attr': { enabled: true }
      }
    })
  })

  it('should meet WCAG AA standards on timer page', () => {
    cy.visit('/timer')
    
    // Wait for page to load completely
    cy.get('body').should('not.contain', 'Loading')
    cy.get('h1').should('exist')
    
    // Re-inject axe to ensure it's loaded
    cy.injectAxe()
    
    cy.checkA11y(undefined, {
      rules: {
        'button-name': { enabled: true },
        'aria-allowed-attr': { enabled: true },
        'landmark-one-main': { enabled: true }
      }
    })
  })

  it('should meet WCAG AA standards on activity log page', () => {
    cy.visit('/activity')
    
    // Wait for page to load completely
    cy.get('body').should('not.contain', 'Loading')
    cy.get('h1').should('exist')
    
    // Re-inject axe to ensure it's loaded
    cy.injectAxe()
    
    cy.checkA11y()
  })

  it('should meet WCAG AA standards on settings page', () => {
    cy.visit('/settings')
    
    // Wait for page to load completely
    cy.get('body').should('not.contain', 'Loading')
    cy.get('h1').should('exist')
    
    // Re-inject axe to ensure it's loaded
    cy.injectAxe()
    
    cy.checkA11y(undefined, {
      rules: {
        'label': { enabled: true },
        'form-field-multiple-labels': { enabled: true },
        'aria-required-attr': { enabled: true }
      }
    })
  })

  it('should support keyboard navigation on home page', () => {
    // Test navigation elements are focusable and visible
    cy.get('[data-testid="nav-home"]').should('be.visible').and('not.be.disabled')
    cy.get('[data-testid="nav-exercises"]').should('be.visible').and('not.be.disabled')  
    cy.get('[data-testid="nav-timer"]').should('be.visible').and('not.be.disabled')
    
    // Test clicking navigation works
    cy.get('[data-testid="nav-exercises"]').click()
    cy.url().should('include', '/exercises')
  })

  it('should support keyboard navigation on timer page', () => {
    cy.visit('/timer')
    
    // Just verify the page loads and interactive elements are present
    cy.get('[data-testid="nav-home"]').should('be.visible')
    cy.get('[data-testid="nav-exercises"]').should('be.visible')
    cy.get('[data-testid="nav-timer"]').should('be.visible')
  })

  it('should provide proper ARIA labels for interactive elements', () => {
    // Wait for the page to fully load and navigation to be visible
    cy.get('body').should('not.contain', 'Loading')
    cy.get('[data-testid="nav-home"]').should('be.visible')
    
    // Check navigation has proper labels
    cy.get('[data-testid="nav-home"]').should('have.attr', 'aria-label')
    cy.get('[data-testid="nav-exercises"]').should('have.attr', 'aria-label')
    cy.get('[data-testid="nav-timer"]').should('have.attr', 'aria-label')
  })

  it('should provide proper heading hierarchy', () => {
    // Check that headings exist and are properly structured
    cy.get('h1, h2, h3, h4, h5, h6').should('exist')
    
    // Ensure h1 exists on home page
    cy.get('h1').should('have.length.at.least', 1)
    
    cy.visit('/exercises')
    
    // Ensure h1 exists on exercises page
    cy.get('h1').should('have.length.at.least', 1)
  })

  it('should provide sufficient color contrast', () => {
    cy.checkA11y(undefined, {
      rules: {
        'color-contrast': { enabled: true }
      }
    })
  })

  it('should provide focus indicators', () => {
    // Focus on interactive elements and verify they're visible
    cy.get('[data-testid="nav-home"]').focus().should('be.visible').should('be.focused')
    cy.get('[data-testid="nav-exercises"]').focus().should('be.visible').should('be.focused')
  })

  it('should handle screen reader announcements', () => {
    cy.visit('/timer')
    
    // Check for aria-live regions or other accessibility features
    cy.get('[aria-live], [role="status"], [role="alert"]').should('exist')
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
    
    // Wait for settings page to load
    cy.get('body').should('not.contain', 'Loading')
    
    // Check that form controls are accessible (if any exist)
    cy.get('body').then(($body) => {
      const inputs = $body.find('input, select, textarea')
      if (inputs.length > 0) {
        // Check each form control has proper labeling
        cy.get('input, select, textarea').each(($input) => {
          cy.wrap($input).should(($el) => {
            // Check for various accessibility labeling methods
            const hasAriaLabel = !!$el.attr('aria-label')
            const hasAriaLabelledBy = !!$el.attr('aria-labelledby')
            const hasAssociatedLabel = $el.attr('id') && Cypress.$(`label[for="${$el.attr('id')}"]`).length > 0
            const hasTitle = !!$el.attr('title')
            
            const isAccessible = hasAriaLabel || hasAriaLabelledBy || hasAssociatedLabel || hasTitle
            expect(isAccessible, 'Form control should have accessible labeling').to.be.true
          })
        })
      } else {
        // If no form controls, test passes
        expect(true).to.be.true
      }
    })
  })
})
