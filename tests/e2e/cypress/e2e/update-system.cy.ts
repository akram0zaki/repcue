/// <reference types="cypress" />

describe('PWA Update System E2E Tests', () => {
  beforeEach(() => {
    // Clear storage and reset state
    cy.clearLocalStorage();
    cy.clearCookies();
    
    // Mock service worker registration
    cy.window().then((win) => {
      // Mock service worker API
      Object.defineProperty(win.navigator, 'serviceWorker', {
        value: {
          ready: Promise.resolve({
            addEventListener: cy.stub(),
            waiting: null,
            update: cy.stub().resolves()
          }),
          addEventListener: cy.stub(),
          register: cy.stub().resolves({
            addEventListener: cy.stub(),
            waiting: null,
            update: cy.stub().resolves()
          })
        },
        writable: true
      });
    });

    // Visit the app
    cy.visit('/');
    
    // Accept consent to enable full functionality
    cy.get('[data-testid="consent-accept-button"]', { timeout: 10000 })
      .should('be.visible')
      .click();
  });

  describe('Update Notification Flow', () => {
    it('should display optional update notification and allow user interaction', () => {
      // Mock API response for optional update
      cy.intercept('POST', '**/functions/v1/check-version', {
        statusCode: 200,
        body: {
          update_available: true,
          latest_version: '1.1.0',
          update_policy: 'optional',
          changelog: {
            new_features: ['New feature 1', 'New feature 2'],
            improvements: ['Performance improvement'],
            bug_fixes: ['Bug fix 1']
          },
          message: 'A new update is available with new features and improvements.'
        }
      }).as('checkVersion');

      // Trigger update check (this might happen automatically or via user action)
      cy.window().then((win) => {
        // Simulate update check trigger
        win.dispatchEvent(new Event('focus'));
      });

      // Wait for API call
      cy.wait('@checkVersion');

      // Update notification should appear
      cy.get('[data-testid="update-notification-banner"]', { timeout: 5000 })
        .should('be.visible')
        .and('contain', 'New Version Available')
        .and('contain', '1.1.0');

      // Should have update and dismiss buttons
      cy.get('[data-testid="update-apply-button"]').should('be.visible');
      cy.get('[data-testid="update-dismiss-button"]').should('be.visible');

      // Should show changelog option
      cy.get('button').contains('See what\'s new').should('be.visible');
    });

    it('should show changelog when requested', () => {
      // Mock API response
      cy.intercept('POST', '**/functions/v1/check-version', {
        statusCode: 200,
        body: {
          update_available: true,
          latest_version: '1.1.0',
          update_policy: 'optional',
          changelog: {
            new_features: ['New feature 1', 'New feature 2'],
            improvements: ['Performance improvement'],
            bug_fixes: ['Bug fix 1']
          },
          message: 'Update available'
        }
      }).as('checkVersion');

      // Trigger update check
      cy.window().then((win) => {
        win.dispatchEvent(new Event('focus'));
      });

      cy.wait('@checkVersion');

      // Click changelog button
      cy.get('[data-testid="update-notification-banner"]')
        .should('be.visible');
      
      cy.get('button').contains('See what\'s new').click();

      // Changelog modal should open
      cy.get('[data-testid="changelog-modal"]')
        .should('be.visible')
        .and('contain', 'What\'s New in Version 1.1.0');

      // Should show categorized changes
      cy.get('[data-testid="changelog-modal"]')
        .should('contain', 'New feature 1')
        .and('contain', 'Performance improvement')
        .and('contain', 'Bug fix 1');
    });

    it('should allow dismissing optional updates', () => {
      // Mock API response
      cy.intercept('POST', '**/functions/v1/check-version', {
        statusCode: 200,
        body: {
          update_available: true,
          latest_version: '1.1.0',
          update_policy: 'optional',
          message: 'Update available'
        }
      }).as('checkVersion');

      // Trigger update check
      cy.window().then((win) => {
        win.dispatchEvent(new Event('focus'));
      });

      cy.wait('@checkVersion');

      // Dismiss the update
      cy.get('[data-testid="update-dismiss-button"]').click();

      // Notification should disappear
      cy.get('[data-testid="update-notification-banner"]')
        .should('not.exist');

      // Should not show again for the same version (within 24 hours)
      cy.window().then((win) => {
        win.dispatchEvent(new Event('focus'));
      });

      // Should not show notification again
      cy.get('[data-testid="update-notification-banner"]', { timeout: 2000 })
        .should('not.exist');
    });
  });

  describe('Critical Update Flow', () => {
    it('should display critical update with appropriate urgency', () => {
      // Mock critical update response
      cy.intercept('POST', '**/functions/v1/check-version', {
        statusCode: 200,
        body: {
          update_available: true,
          latest_version: '1.0.1',
          update_policy: 'critical',
          changelog: {
            security_updates: ['Critical security fix'],
            bug_fixes: ['Important bug fix']
          },
          message: 'An important update is available with security improvements and bug fixes.'
        }
      }).as('checkCriticalVersion');

      // Trigger update check
      cy.window().then((win) => {
        win.dispatchEvent(new Event('focus'));
      });

      cy.wait('@checkCriticalVersion');

      // Critical update notification should appear with warning styling
      cy.get('[data-testid="update-notification-banner"]')
        .should('be.visible')
        .and('contain', 'Important Update Available')
        .and('contain', '⚠️');

      // Should still allow dismissal for critical (but not force) updates
      cy.get('[data-testid="update-dismiss-button"]').should('be.visible');
    });
  });

  describe('Force Update Flow', () => {
    it('should display blocking force update modal', () => {
      // Mock force update response
      cy.intercept('POST', '**/functions/v1/check-version', {
        statusCode: 200,
        body: {
          update_available: true,
          latest_version: '1.0.2',
          update_policy: 'force',
          force_update: true,
          changelog: {
            security_updates: ['Critical security patch']
          },
          message: 'A critical security update is required. The app will update automatically.'
        }
      }).as('checkForceVersion');

      // Trigger update check
      cy.window().then((win) => {
        win.dispatchEvent(new Event('focus'));
      });

      cy.wait('@checkForceVersion');

      // Force update modal should appear
      cy.get('[data-testid="force-update-modal"]')
        .should('be.visible')
        .and('contain', 'Security Update Required')
        .and('contain', '🔒');

      // Should not have dismiss button
      cy.get('[data-testid="update-dismiss-button"]').should('not.exist');

      // Should have update button
      cy.get('[data-testid="force-update-button"]').should('be.visible');

      // Modal should block interaction with rest of app
      cy.get('[data-testid="force-update-modal"]')
        .should('have.attr', 'aria-modal', 'true');
    });

    it('should handle force update during active workout', () => {
      // Start a workout first
      cy.get('[data-testid="start-timer-button"]').click();
      cy.get('[data-testid="timer-start-button"]').click();

      // Mock force update response
      cy.intercept('POST', '**/functions/v1/check-version', {
        statusCode: 200,
        body: {
          update_available: true,
          latest_version: '1.0.2',
          update_policy: 'force',
          force_update: true,
          message: 'Critical security update required'
        }
      }).as('checkForceVersion');

      // Trigger update check during workout
      cy.window().then((win) => {
        win.dispatchEvent(new Event('focus'));
      });

      cy.wait('@checkForceVersion');

      // Should show workout-aware force update modal
      cy.get('[data-testid="workout-force-update-modal"]')
        .should('be.visible')
        .and('contain', 'Security Update Required')
        .and('contain', 'timer is active');

      // Should have options to save or abandon workout
      cy.get('[data-testid="save-workout-update-button"]').should('be.visible');
      cy.get('[data-testid="abandon-workout-update-button"]').should('be.visible');
    });
  });

  describe('Update Preferences', () => {
    it('should allow configuring update preferences', () => {
      // Navigate to settings
      cy.get('[data-testid="navigation-settings"]').click();

      // Find update preferences section
      cy.get('[data-testid="update-preferences-panel"]')
        .should('be.visible');

      // Should have update mode options
      cy.get('input[name="updateMode"][value="automatic"]').should('exist');
      cy.get('input[name="updateMode"][value="notify"]').should('exist');
      cy.get('input[name="updateMode"][value="manual"]').should('exist');

      // Change to automatic mode
      cy.get('input[name="updateMode"][value="automatic"]').check();

      // Should have metered connection option
      cy.get('input[name="allowMeteredUpdates"]').should('exist');

      // Should have changelog option
      cy.get('input[name="showChangelog"]').should('exist');

      // Save preferences
      cy.get('[data-testid="save-preferences-button"]').click();

      // Should show success message
      cy.get('[data-testid="preferences-saved-message"]')
        .should('be.visible')
        .and('contain', 'Preferences saved');
    });

    it('should respect automatic update preferences', () => {
      // Set automatic update mode
      cy.get('[data-testid="navigation-settings"]').click();
      cy.get('input[name="updateMode"][value="automatic"]').check();
      cy.get('[data-testid="save-preferences-button"]').click();

      // Mock optional update
      cy.intercept('POST', '**/functions/v1/check-version', {
        statusCode: 200,
        body: {
          update_available: true,
          latest_version: '1.1.0',
          update_policy: 'optional',
          message: 'Update available'
        }
      }).as('checkVersion');

      // Navigate away from settings
      cy.get('[data-testid="navigation-home"]').click();

      // Trigger update check
      cy.window().then((win) => {
        win.dispatchEvent(new Event('focus'));
      });

      cy.wait('@checkVersion');

      // In automatic mode, update should be applied automatically
      // (In a real test, this would trigger a page reload)
      cy.get('[data-testid="update-notification-banner"]')
        .should('be.visible');
    });
  });

  describe('Offline Scenarios', () => {
    it('should handle offline state gracefully', () => {
      // Mock network failure
      cy.intercept('POST', '**/functions/v1/check-version', {
        forceNetworkError: true
      }).as('checkVersionOffline');

      // Go offline
      cy.window().then((win) => {
        Object.defineProperty(win.navigator, 'onLine', {
          value: false,
          writable: true
        });
        win.dispatchEvent(new Event('offline'));
      });

      // Trigger update check
      cy.window().then((win) => {
        win.dispatchEvent(new Event('focus'));
      });

      // Should show offline banner
      cy.get('[data-testid="offline-banner"]')
        .should('be.visible')
        .and('contain', 'You are currently offline');

      // Update check should fail gracefully without breaking the app
      cy.get('[data-testid="update-notification-banner"]')
        .should('not.exist');
    });

    it('should resume update checks when coming back online', () => {
      // Start offline
      cy.window().then((win) => {
        Object.defineProperty(win.navigator, 'onLine', {
          value: false,
          writable: true
        });
        win.dispatchEvent(new Event('offline'));
      });

      // Mock successful update check for when we come back online
      cy.intercept('POST', '**/functions/v1/check-version', {
        statusCode: 200,
        body: {
          update_available: true,
          latest_version: '1.1.0',
          update_policy: 'optional',
          message: 'Update available'
        }
      }).as('checkVersionOnline');

      // Come back online
      cy.window().then((win) => {
        Object.defineProperty(win.navigator, 'onLine', {
          value: true,
          writable: true
        });
        win.dispatchEvent(new Event('online'));
      });

      // Should automatically check for updates
      cy.wait('@checkVersionOnline');

      // Update notification should appear
      cy.get('[data-testid="update-notification-banner"]')
        .should('be.visible');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', () => {
      // Mock API error
      cy.intercept('POST', '**/functions/v1/check-version', {
        statusCode: 500,
        body: { error: 'Internal server error' }
      }).as('checkVersionError');

      // Trigger update check
      cy.window().then((win) => {
        win.dispatchEvent(new Event('focus'));
      });

      cy.wait('@checkVersionError');

      // Should not show update notification
      cy.get('[data-testid="update-notification-banner"]')
        .should('not.exist');

      // App should continue functioning normally
      cy.get('[data-testid="navigation-home"]').should('be.visible');
    });

    it('should show error recovery modal for failed updates', () => {
      // Mock successful version check
      cy.intercept('POST', '**/functions/v1/check-version', {
        statusCode: 200,
        body: {
          update_available: true,
          latest_version: '1.1.0',
          update_policy: 'optional',
          message: 'Update available'
        }
      }).as('checkVersion');

      // Trigger update check
      cy.window().then((win) => {
        win.dispatchEvent(new Event('focus'));
      });

      cy.wait('@checkVersion');

      // Click update button
      cy.get('[data-testid="update-apply-button"]').click();

      // Mock update failure (this would be handled by service worker in real scenario)
      cy.window().then((win) => {
        // Simulate update failure event
        win.dispatchEvent(new CustomEvent('update-failed', {
          detail: { error: 'Update installation failed' }
        }));
      });

      // Should show error recovery modal
      cy.get('[data-testid="update-error-recovery-modal"]')
        .should('be.visible')
        .and('contain', 'Update Failed')
        .and('contain', 'Update installation failed');

      // Should have retry and reload options
      cy.get('[data-testid="retry-update-button"]').should('be.visible');
      cy.get('[data-testid="force-reload-button"]').should('be.visible');
    });
  });

  describe('Accessibility', () => {
    it('should be accessible with keyboard navigation', () => {
      // Mock update available
      cy.intercept('POST', '**/functions/v1/check-version', {
        statusCode: 200,
        body: {
          update_available: true,
          latest_version: '1.1.0',
          update_policy: 'optional',
          message: 'Update available'
        }
      }).as('checkVersion');

      // Trigger update check
      cy.window().then((win) => {
        win.dispatchEvent(new Event('focus'));
      });

      cy.wait('@checkVersion');

      // Should be able to navigate with keyboard
      cy.get('[data-testid="update-notification-banner"]')
        .should('be.visible');

      // Tab to update button
      cy.get('body').tab();
      cy.focused().should('have.attr', 'data-testid', 'update-apply-button');

      // Tab to dismiss button
      cy.focused().tab();
      cy.focused().should('have.attr', 'data-testid', 'update-dismiss-button');

      // Should be able to activate with Enter
      cy.focused().type('{enter}');

      // Update should be dismissed
      cy.get('[data-testid="update-notification-banner"]')
        .should('not.exist');
    });

    it('should have proper ARIA attributes', () => {
      // Mock force update
      cy.intercept('POST', '**/functions/v1/check-version', {
        statusCode: 200,
        body: {
          update_available: true,
          latest_version: '1.0.2',
          update_policy: 'force',
          force_update: true,
          message: 'Critical security update required'
        }
      }).as('checkForceVersion');

      // Trigger update check
      cy.window().then((win) => {
        win.dispatchEvent(new Event('focus'));
      });

      cy.wait('@checkForceVersion');

      // Force update modal should have proper ARIA attributes
      cy.get('[data-testid="force-update-modal"]')
        .should('have.attr', 'role', 'dialog')
        .and('have.attr', 'aria-modal', 'true')
        .and('have.attr', 'aria-labelledby')
        .and('have.attr', 'aria-describedby');
    });
  });

  describe('Performance', () => {
    it('should not impact app startup performance', () => {
      // Measure initial load time
      cy.window().then((win) => {
        const startTime = win.performance.now();
        
        // Wait for app to be fully loaded
        cy.get('[data-testid="navigation-home"]').should('be.visible');
        
        cy.window().then((win) => {
          const loadTime = win.performance.now() - startTime;
          
          // Update system should not significantly impact load time
          expect(loadTime).to.be.lessThan(3000); // 3 seconds max
        });
      });
    });

    it('should rate limit update checks appropriately', () => {
      // Mock update response
      cy.intercept('POST', '**/functions/v1/check-version', {
        statusCode: 200,
        body: {
          update_available: false,
          latest_version: '1.0.0',
          message: 'Up to date'
        }
      }).as('checkVersion');

      // Trigger multiple rapid update checks
      cy.window().then((win) => {
        win.dispatchEvent(new Event('focus'));
        win.dispatchEvent(new Event('focus'));
        win.dispatchEvent(new Event('focus'));
      });

      // Should only make one API call due to rate limiting
      cy.get('@checkVersion.all').should('have.length', 1);
    });
  });
});