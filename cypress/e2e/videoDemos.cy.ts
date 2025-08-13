// E2E tests for Exercise Demo Video feature
// Covers: playback rendering, settings toggle, reduced motion, and fallback when disabled

describe('Exercise Demo Videos', () => {
  beforeEach(() => {
    cy.clearAppData();
    // Seed consent before app scripts execute so Router mounts immediately
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.setItem('repcue_consent', JSON.stringify({
          version: 2,
          timestamp: new Date().toISOString(),
          hasConsented: true,
            cookiesAccepted: true,
          analyticsAccepted: false,
          marketingAccepted: false,
          dataRetentionDays: 365
        }));
      }
    });
    // Wait for navigation to appear
    cy.get('[data-testid="nav-exercises"]', { timeout: 20000 }).should('be.visible');
  });

  const goToExerciseWithVideo = () => {
    // Open exercises via bottom navigation
    cy.get('[data-testid="nav-exercises"]', { timeout: 15000 }).should('be.visible').click();
    cy.url({ timeout: 10000 }).should('include', '/exercises');
    cy.get('[data-testid="exercise-card"]', { timeout: 15000 }).should('exist');
    // Pick the Bicycle Crunches exercise (only one with video in seed data)
    cy.contains('[data-testid="exercise-card"] *', /bicycle crunches/i, { timeout: 10000 })
      .closest('[data-testid="exercise-card"]').within(() => {
        cy.get('[data-testid="start-exercise-timer"]').click();
      });
    cy.url({ timeout: 10000 }).should('include', '/timer');
  };

  it('renders video inside timer when enabled', () => {
    goToExerciseWithVideo();
    // Start timer to enable playback gating
    cy.get('[data-testid="start-timer"]').click();
    // Wait for countdown to complete if present
    cy.get('body').then($b => {
      if ($b.text().toLowerCase().includes('get ready')) {
        cy.contains(/get ready/i, { timeout: 5000 }).should('exist');
        cy.contains(/get ready/i, { timeout: 10000 }).should('not.exist');
      }
    });
    // Wait shortly for media index to load and video element to appear
    cy.get('[data-testid="exercise-video"]', { timeout: 10000 }).should('exist');
    cy.get('[data-testid="exercise-video-wrapper"]').should('be.visible');
  });

  it('hides video when user toggles setting off then on again', () => {
    goToExerciseWithVideo();
    cy.get('[data-testid="start-timer"]').click();
    cy.get('body').then($b => {
      if ($b.text().toLowerCase().includes('get ready')) {
        cy.contains(/get ready/i, { timeout: 5000 }).should('exist');
        cy.contains(/get ready/i, { timeout: 10000 }).should('not.exist');
      }
    });
    cy.get('[data-testid="exercise-video"]').should('exist');

  // Open settings via menu
  cy.get('[data-testid="nav-more"]').click();
  cy.get('[data-testid="nav-settings"]', { timeout: 4000 }).click();
  cy.get('[data-testid="toggle-exercise-videos"]').click();

  // Return to timer (nav-timer)
  cy.get('[data-testid="nav-timer"]').click();
  cy.get('[data-testid="exercise-video"]').should('not.exist');

  // Re-enable
  cy.get('[data-testid="nav-more"]').click();
  cy.get('[data-testid="nav-settings"]', { timeout: 4000 }).click();
  cy.get('[data-testid="toggle-exercise-videos"]').click();
  cy.get('[data-testid="nav-timer"]').click();

  // Video should appear again eventually
  cy.get('[data-testid="exercise-video"]', { timeout: 10000 }).should('exist');
  });

  it('does not render video when prefers-reduced-motion is reduce', () => {
    // Simulate reduced motion by setting matchMedia stub before app scripts run
    cy.visit('/', {
      onBeforeLoad(win) {
        win.matchMedia = (query) => ({
          matches: query.includes('prefers-reduced-motion') ? true : false,
          media: query,
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => false
        });
      }
    });
    cy.acceptConsent();
    goToExerciseWithVideo();
    cy.get('[data-testid="start-timer"]').click();
    cy.get('[data-testid="exercise-video"]').should('not.exist');
  });
  it('does not render video when feature flag globally disabled', () => {
    cy.clearAppData();
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.setItem('repcue_consent', JSON.stringify({
          version: 2,
          timestamp: new Date().toISOString(),
          hasConsented: true,
          cookiesAccepted: true,
          analyticsAccepted: false,
          marketingAccepted: false,
          dataRetentionDays: 365
        }));
        (win as any).__VIDEO_DEMOS_DISABLED__ = true;
      }
    });
    cy.get('[data-testid="nav-exercises"]', { timeout: 15000 }).click();
    cy.contains('[data-testid="exercise-card"] *', /bicycle crunches/i, { timeout: 10000 })
      .closest('[data-testid="exercise-card"]').within(() => {
        cy.get('[data-testid="start-exercise-timer"]').click();
      });
    cy.get('[data-testid="start-timer"]').click();
    cy.get('[data-testid="exercise-video"]').should('not.exist');
  });
});
