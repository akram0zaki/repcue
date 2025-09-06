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
  // Pre-grant consent via localStorage to bypass the banner entirely
  cy.window().then((win) => {
    // Set consent in localStorage using the correct structure (ConsentDataV2)
    win.localStorage.setItem('repcue_consent', JSON.stringify({
      version: 2,
      timestamp: new Date().toISOString(),
      hasConsented: true,
      cookiesAccepted: true,
      analyticsAccepted: true,
      marketingAccepted: false,
      dataRetentionDays: 365,
      consentDate: new Date().toISOString()
    }));
  });
  
  // Reload page to apply the consent settings
  cy.reload();
  
  // Wait for app to load without consent banner
  cy.get('body').should('be.visible');
  
  // Check if loading text appears and wait for it to complete
  cy.get('body').then(($body) => {
    if ($body.text().includes('Loading RepCue...')) {
      cy.contains('Loading RepCue...', { timeout: 15000 }).should('not.exist');
    }
  });
  
  // Ensure we reach the main app with navigation (no consent banner should appear)
  cy.get('[data-testid="nav-exercises"]', { timeout: 20000 }).should('be.visible');
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
