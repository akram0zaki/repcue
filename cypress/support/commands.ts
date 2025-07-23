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
  cy.get('[data-testid="consent-banner"]', { timeout: 5000 })
    .should('be.visible')
    .within(() => {
      cy.get('button').contains('Accept All').click()
    })
  
  // Wait for consent banner to disappear
  cy.get('[data-testid="consent-banner"]', { timeout: 5000 }).should('not.exist')
})

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
