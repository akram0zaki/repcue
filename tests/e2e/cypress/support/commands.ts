// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Custom command to accept consent banner
Cypress.Commands.add('acceptConsent', () => {
  cy.get('body').then(($body) => {
    const banner = $body.find('[data-testid="consent-banner"]');
    if (!banner.length) {
      return;
    }
    cy.wrap(banner).should('be.visible').within(() => {
      cy.contains('button', /accept all/i).click();
    });
  });
  // Ensure banner gone
  cy.get('[data-testid="consent-banner"]', { timeout: 10000 }).should('not.exist');
  // Wait for loading phase then navigation
  cy.contains('Loading RepCue...', { timeout: 8000 }).should('exist');
  cy.contains('Loading RepCue...', { timeout: 15000 }).should('not.exist');
  cy.get('[data-testid="nav-exercises"]', { timeout: 15000 }).should('be.visible');
});

// Custom command to clear all app data
Cypress.Commands.add('clearAppData', () => {
  cy.window().then((win) => {
    // Clear localStorage
    win.localStorage.clear()
    
    // Clear IndexedDB
    const indexedDB = win.indexedDB
    if (indexedDB) {
      const deleteRequest = indexedDB.deleteDatabase('RepCueDB')
      return new Promise((resolve) => {
        deleteRequest.onsuccess = () => resolve(undefined)
        deleteRequest.onerror = () => resolve(undefined)
      })
    }
  })
})

// (Type declarations moved to cypress/support/index.d.ts)
