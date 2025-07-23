// Integration test for T1.3: Exercise selection and favorites flow
describe('Exercise Flow', () => {
  beforeEach(() => {
    cy.clearAppData()
    cy.visit('/')
  })

  it('should allow user to browse exercises and mark favorites', () => {
    // Accept consent first
    cy.acceptConsent()
    
    // Navigate to exercises page
    cy.get('button').contains('Browse All Exercises').click()
    cy.url().should('include', '/exercises')
    
    // Verify exercises are displayed
    cy.get('[data-testid="exercise-card"]').should('have.length.greaterThan', 0)
    
    // Mark an exercise as favorite
    cy.get('[data-testid="exercise-card"]').first().within(() => {
      cy.get('[aria-label*="toggle favorite"]').click()
    })
    
    // Navigate back to home
    cy.get('[data-testid="nav-home"]').click()
    cy.url().should('eq', Cypress.config().baseUrl + '/')
    
    // Verify favorite exercise appears in favorites section
    cy.get('[data-testid="favorite-exercises"]').within(() => {
      cy.get('[data-testid="exercise-card"]').should('have.length', 1)
    })
  })

  it('should allow filtering exercises by category', () => {
    cy.acceptConsent()
    
    // Navigate to exercises page
    cy.visit('/exercises')
    
    // Click on Core category
    cy.get('button').contains('Core').click()
    
    // Verify only core exercises are shown
    cy.get('[data-testid="exercise-card"]').each(($card) => {
      cy.wrap($card).should('contain', 'core')
    })
    
    // Clear filter
    cy.get('button').contains('All').click()
    
    // Verify all exercises are shown again
    cy.get('[data-testid="exercise-card"]').should('have.length.greaterThan', 3)
  })

  it('should allow searching for exercises', () => {
    cy.acceptConsent()
    cy.visit('/exercises')
    
    // Search for "plank"
    cy.get('[data-testid="exercise-search"]').type('plank')
    
    // Verify only plank exercises are shown
    cy.get('[data-testid="exercise-card"]').should('have.length.lessThan', 5)
    cy.get('[data-testid="exercise-card"]').first().should('contain.text', 'Plank')
    
    // Clear search
    cy.get('[data-testid="exercise-search"]').clear()
    
    // Verify all exercises are shown again
    cy.get('[data-testid="exercise-card"]').should('have.length.greaterThan', 10)
  })

  it('should navigate to exercise details', () => {
    cy.acceptConsent()
    cy.visit('/exercises')
    
    // Click on first exercise
    cy.get('[data-testid="exercise-card"]').first().click()
    
    // Verify navigation to exercise detail page
    cy.url().should('include', '/exercises/')
    
    // Verify exercise details are displayed
    cy.get('[data-testid="exercise-title"]').should('be.visible')
    cy.get('[data-testid="exercise-description"]').should('be.visible')
    cy.get('[data-testid="exercise-duration"]').should('be.visible')
  })

  it('should maintain favorites across page reloads', () => {
    cy.acceptConsent()
    cy.visit('/exercises')
    
    // Mark first exercise as favorite
    cy.get('[data-testid="exercise-card"]').first().within(() => {
      cy.get('[aria-label*="toggle favorite"]').click()
    })
    
    // Reload page
    cy.reload()
    cy.acceptConsent()
    
    // Verify favorite is still marked
    cy.get('[data-testid="exercise-card"]').first().within(() => {
      cy.get('[aria-label*="toggle favorite"]').should('have.class', 'text-red-500')
    })
    
    // Navigate to home and verify favorite appears
    cy.visit('/')
    cy.get('[data-testid="favorite-exercises"]').within(() => {
      cy.get('[data-testid="exercise-card"]').should('have.length', 1)
    })
  })
})
