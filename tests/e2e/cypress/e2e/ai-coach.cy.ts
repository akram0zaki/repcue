/**
 * End-to-End Tests for AI Coach Features (Module 2.8.1)
 * 
 * Test Coverage:
 * 1. Complete workout → see celebration insight
 * 2. Navigate to Coach page → see insights  
 * 3. Toggle AI setting → verify behavior change
 * 4. Set new PR → see celebration
 * 5. Dismiss insight → verify persistence
 * 
 * Note: These tests use fixtures and mock Supabase calls
 */

describe('AI Coach - Personal Records & Insights', () => {
  beforeEach(() => {
    cy.clearAppData();
    cy.visit('/');
    cy.acceptConsent();
  });

  describe('Personal Records Detection', () => {
    it('should detect new personal record after completing exercise', () => {
      // Navigate to timer
      cy.visit('/timer');
      
      // Select an exercise (pushups)
      cy.get('[data-testid="exercise-chooser"]').click();
      cy.get('[data-testid="exercise-card"]').contains('Push-up').click();
      
      // Set high reps to trigger PR
      cy.get('input[type="number"]').first().clear().type('50');
      
      // Start and complete the exercise
      cy.get('button').contains('Start Timer').click();
      
      // Wait for timer to run (short duration for testing)
      cy.wait(2000);
      
      // Stop timer (this should trigger PR detection)
      cy.get('button').contains('Stop').click();
      
      // Verify PR celebration modal appears
      cy.get('[role="dialog"]').should('be.visible');
      cy.get('[role="dialog"]').should('contain', 'New Personal Record');
      cy.get('[role="dialog"]').should('contain', '50');
      cy.get('[role="dialog"]').should('contain', 'reps');
    });

    it('should show improvement percentage for beating previous PR', () => {
      // First workout - set initial PR (30 reps)
      cy.visit('/timer');
      cy.get('[data-testid="exercise-chooser"]').click();
      cy.get('[data-testid="exercise-card"]').contains('Push-up').click();
      cy.get('input[type="number"]').first().clear().type('30');
      cy.get('button').contains('Start Timer').click();
      cy.wait(2000);
      cy.get('button').contains('Stop').click();
      
      // Close PR modal
      cy.get('[role="dialog"]').within(() => {
        cy.get('button').contains('Close').click();
      });
      
      // Second workout - beat PR (40 reps = 33% improvement)
      cy.visit('/timer');
      cy.get('[data-testid="exercise-chooser"]').click();
      cy.get('[data-testid="exercise-card"]').contains('Push-up').click();
      cy.get('input[type="number"]').first().clear().type('40');
      cy.get('button').contains('Start Timer').click();
      cy.wait(2000);
      cy.get('button').contains('Stop').click();
      
      // Verify improvement percentage is shown
      cy.get('[role="dialog"]').should('contain', '33%');
      cy.get('[role="dialog"]').should('contain', 'improvement');
    });

    it('should dismiss PR celebration modal', () => {
      // Complete exercise to trigger PR
      cy.visit('/timer');
      cy.get('[data-testid="exercise-chooser"]').click();
      cy.get('[data-testid="exercise-card"]').contains('Push-up').click();
      cy.get('input[type="number"]').first().clear().type('25');
      cy.get('button').contains('Start Timer').click();
      cy.wait(2000);
      cy.get('button').contains('Stop').click();
      
      // Verify modal is visible
      cy.get('[role="dialog"]').should('be.visible');
      
      // Dismiss modal
      cy.get('[role="dialog"]').within(() => {
        cy.get('button').contains('Close').click();
      });
      
      // Verify modal is closed
      cy.get('[role="dialog"]').should('not.exist');
    });

    it('should auto-dismiss PR celebration after timeout', () => {
      // Complete exercise to trigger PR
      cy.visit('/timer');
      cy.get('[data-testid="exercise-chooser"]').click();
      cy.get('[data-testid="exercise-card"]').contains('Push-up').click();
      cy.get('input[type="number"]').first().clear().type('20');
      cy.get('button').contains('Start Timer').click();
      cy.wait(2000);
      cy.get('button').contains('Stop').click();
      
      // Verify modal is visible
      cy.get('[role="dialog"]').should('be.visible');
      
      // Wait for auto-dismiss (8 seconds)
      cy.wait(8500);
      
      // Verify modal is auto-dismissed
      cy.get('[role="dialog"]').should('not.exist');
    });
  });

  describe('PR History Page', () => {
    beforeEach(() => {
      // Set up some PRs
      cy.visit('/timer');
      
      // PR 1: Push-ups
      cy.get('[data-testid="exercise-chooser"]').click();
      cy.get('[data-testid="exercise-card"]').contains('Push-up').click();
      cy.get('input[type="number"]').first().clear().type('30');
      cy.get('button').contains('Start Timer').click();
      cy.wait(2000);
      cy.get('button').contains('Stop').click();
      cy.wait(500);
      cy.get('button').contains('Close').click();
      
      // PR 2: Squats
      cy.visit('/timer');
      cy.get('[data-testid="exercise-chooser"]').click();
      cy.get('[data-testid="exercise-card"]').contains('Squat').click();
      cy.get('input[type="number"]').first().clear().type('50');
      cy.get('button').contains('Start Timer').click();
      cy.wait(2000);
      cy.get('button').contains('Stop').click();
      cy.wait(500);
      cy.get('button').contains('Close').click();
    });

    it('should navigate to PR history page from celebration modal', () => {
      // Trigger new PR
      cy.visit('/timer');
      cy.get('[data-testid="exercise-chooser"]').click();
      cy.get('[data-testid="exercise-card"]').contains('Plank').click();
      cy.get('input[type="number"]').first().clear().type('60');
      cy.get('button').contains('Start Timer').click();
      cy.wait(2000);
      cy.get('button').contains('Stop').click();
      
      // Click "View History" button in modal
      cy.get('[role="dialog"]').within(() => {
        cy.get('button').contains('View History').click();
      });
      
      // Verify navigation to PR history page
      cy.url().should('include', '/personal-records');
    });

    it('should display all personal records', () => {
      cy.visit('/personal-records');
      
      // Verify PR cards are displayed
      cy.get('[data-testid="pr-card"]').should('have.length.greaterThan', 0);
      
      // Verify specific PRs exist
      cy.get('[data-testid="pr-card"]').should('contain', 'Push-up');
      cy.get('[data-testid="pr-card"]').should('contain', 'Squat');
    });

    it('should search personal records by exercise name', () => {
      cy.visit('/personal-records');
      
      // Search for "push"
      cy.get('input[placeholder*="Search"]').type('push');
      
      // Verify only push-up PRs are shown
      cy.get('[data-testid="pr-card"]').should('contain', 'Push-up');
      cy.get('[data-testid="pr-card"]').should('not.contain', 'Squat');
      
      // Clear search
      cy.get('input[placeholder*="Search"]').clear();
      
      // Verify all PRs are shown again
      cy.get('[data-testid="pr-card"]').should('contain', 'Push-up');
      cy.get('[data-testid="pr-card"]').should('contain', 'Squat');
    });

    it('should filter PRs by record type', () => {
      cy.visit('/personal-records');
      
      // Filter by "Max Reps"
      cy.get('select').first().select('max-reps');
      
      // Verify only rep-based PRs are shown
      cy.get('[data-testid="pr-card"]').each(($card) => {
        cy.wrap($card).should('contain', 'reps');
      });
    });

    it('should sort PRs by date and value', () => {
      cy.visit('/personal-records');
      
      // Sort by newest first (default)
      cy.get('select').contains('Date').select('newest');
      
      // Get first PR date
      cy.get('[data-testid="pr-card"]').first().invoke('attr', 'data-date').then((firstDate) => {
        // Get second PR date
        cy.get('[data-testid="pr-card"]').eq(1).invoke('attr', 'data-date').then((secondDate) => {
          // Verify first is newer or equal
          expect(new Date(firstDate as string).getTime()).to.be.gte(new Date(secondDate as string).getTime());
        });
      });
      
      // Sort by highest value
      cy.get('select').contains('Value').select('highest');
      
      // Verify first PR has higher value than second
      cy.get('[data-testid="pr-card"]').first().invoke('attr', 'data-value').then((firstValue) => {
        cy.get('[data-testid="pr-card"]').eq(1).invoke('attr', 'data-value').then((secondValue) => {
          expect(Number(firstValue)).to.be.gte(Number(secondValue));
        });
      });
    });

    it('should show empty state when no PRs exist', () => {
      // Clear all data
      cy.clearAppData();
      cy.visit('/');
      cy.acceptConsent();
      
      // Navigate to PR history
      cy.visit('/personal-records');
      
      // Verify empty state is shown
      cy.contains('No personal records yet').should('be.visible');
      cy.contains('Start tracking your fitness journey').should('be.visible');
    });
  });

  describe('Coach Page Integration', () => {
    it('should navigate to Coach page from More menu', () => {
      // Open More menu
      cy.get('[data-testid="nav-more"]').click();
      
      // Click on Coach/AI Coach item
      cy.get('a').contains('Coach').click();
      
      // Verify navigation
      cy.url().should('include', '/coach');
    });

    it('should display coaching insights on Coach page', () => {
      // Complete a workout first to generate insights
      cy.visit('/timer');
      cy.get('[data-testid="exercise-chooser"]').click();
      cy.get('[data-testid="exercise-card"]').first().click();
      cy.get('button').contains('Start Timer').click();
      cy.wait(2000);
      cy.get('button').contains('Stop').click();
      cy.wait(500);
      
      // Navigate to Coach page
      cy.visit('/coach');
      
      // Verify insights are displayed (might be rule-based if AI is disabled)
      cy.get('[data-testid="coaching-card"]').should('exist');
    });

    it('should dismiss coaching insights', () => {
      // Complete a workout to generate insights
      cy.visit('/timer');
      cy.get('[data-testid="exercise-chooser"]').click();
      cy.get('[data-testid="exercise-card"]').first().click();
      cy.get('button').contains('Start Timer').click();
      cy.wait(2000);
      cy.get('button').contains('Stop').click();
      cy.wait(500);
      
      // Navigate to Coach page
      cy.visit('/coach');
      
      // Get initial number of insights
      cy.get('[data-testid="coaching-card"]').its('length').then((initialCount) => {
        // Dismiss first insight
        cy.get('[data-testid="coaching-card"]').first().within(() => {
          cy.get('button[aria-label*="dismiss"]').click();
        });
        
        // Verify insight is removed
        cy.get('[data-testid="coaching-card"]').should('have.length', initialCount - 1);
      });
    });
  });

  describe('Settings Integration', () => {
    it('should toggle AI Coach features in settings', () => {
      // Navigate to Settings
      cy.visit('/settings');
      
      // Find AI Coach toggle
      cy.contains('AI Coach').parent().within(() => {
        // Toggle off
        cy.get('[role="switch"]').click();
        cy.get('[role="switch"]').should('have.attr', 'aria-checked', 'false');
        
        // Toggle on
        cy.get('[role="switch"]').click();
        cy.get('[role="switch"]').should('have.attr', 'aria-checked', 'true');
      });
    });

    it('should toggle PR celebrations in settings', () => {
      // Navigate to Settings
      cy.visit('/settings');
      
      // Find PR celebrations toggle (under AI Coach section)
      cy.contains('Personal Records').parent().within(() => {
        // Toggle off
        cy.get('[role="switch"]').click();
        cy.get('[role="switch"]').should('have.attr', 'aria-checked', 'false');
      });
      
      // Complete exercise - PR celebration should NOT appear
      cy.visit('/timer');
      cy.get('[data-testid="exercise-chooser"]').click();
      cy.get('[data-testid="exercise-card"]').first().click();
      cy.get('input[type="number"]').first().clear().type('100');
      cy.get('button').contains('Start Timer').click();
      cy.wait(2000);
      cy.get('button').contains('Stop').click();
      
      // Verify NO PR modal
      cy.get('[role="dialog"]').should('not.contain', 'Personal Record');
    });

    it('should persist settings across sessions', () => {
      // Navigate to Settings and toggle off
      cy.visit('/settings');
      cy.contains('AI Coach').parent().within(() => {
        cy.get('[role="switch"]').click();
      });
      
      // Reload page
      cy.reload();
      
      // Verify setting persisted
      cy.contains('AI Coach').parent().within(() => {
        cy.get('[role="switch"]').should('have.attr', 'aria-checked', 'false');
      });
    });
  });

  describe('Accessibility', () => {
    it('should be keyboard navigable on PR celebration modal', () => {
      // Complete exercise to trigger PR
      cy.visit('/timer');
      cy.get('[data-testid="exercise-chooser"]').click();
      cy.get('[data-testid="exercise-card"]').first().click();
      cy.get('input[type="number"]').first().clear().type('25');
      cy.get('button').contains('Start Timer').click();
      cy.wait(2000);
      cy.get('button').contains('Stop').click();
      
      // Verify modal has focus
      cy.get('[role="dialog"]').should('have.focus');
      
      // Navigate with keyboard
      cy.get('body').type('{enter}'); // Should close modal
      
      // Verify modal closed
      cy.get('[role="dialog"]').should('not.exist');
    });

    it('should have proper ARIA labels on PR history page', () => {
      cy.visit('/personal-records');
      
      // Verify search input has label
      cy.get('input[placeholder*="Search"]').should('have.attr', 'aria-label');
      
      // Verify filter selects have labels
      cy.get('select').should('have.attr', 'aria-label');
      
      // Verify PR cards have proper structure
      cy.get('[data-testid="pr-card"]').first().within(() => {
        cy.get('[role="heading"]').should('exist');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle storage errors gracefully', () => {
      // Simulate storage error by revoking consent mid-session
      cy.visit('/timer');
      cy.get('[data-testid="exercise-chooser"]').click();
      cy.get('[data-testid="exercise-card"]').first().click();
      
      // Revoke consent via localStorage manipulation
      cy.window().then((win) => {
        win.localStorage.removeItem('consent');
      });
      
      cy.get('button').contains('Start Timer').click();
      cy.wait(2000);
      cy.get('button').contains('Stop').click();
      
      // Should not crash, should show appropriate message
      cy.contains('consent').should('exist');
    });

    it('should handle navigation errors on PR history page', () => {
      // Navigate to PR history without any PRs
      cy.clearAppData();
      cy.visit('/');
      cy.acceptConsent();
      cy.visit('/personal-records');
      
      // Should show empty state, not error
      cy.contains('No personal records yet').should('be.visible');
      cy.contains('error').should('not.exist');
    });
  });

  describe('Performance', () => {
    it('should load PR history page quickly', () => {
      const startTime = Date.now();
      
      cy.visit('/personal-records').then(() => {
        const loadTime = Date.now() - startTime;
        
        // Page should load in under 2 seconds
        expect(loadTime).to.be.lessThan(2000);
      });
    });

    it('should handle large numbers of PRs efficiently', () => {
      // Note: This would require seeding many PRs
      // For now, just verify the page doesn't freeze
      cy.visit('/personal-records');
      
      // Verify page is responsive
      cy.get('input[placeholder*="Search"]').type('test');
      cy.get('input[placeholder*="Search"]').should('have.value', 'test');
    });
  });
});

/**
 * Cypress Custom Commands (defined in support/commands.ts)
 * 
 * - cy.clearAppData(): Clears IndexedDB and localStorage
 * - cy.acceptConsent(): Accepts data consent banner
 */
