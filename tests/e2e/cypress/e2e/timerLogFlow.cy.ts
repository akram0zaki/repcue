// Integration test for T1.2 & T1.4: Timer functionality and activity logging flow
describe('Timer and Log Flow', () => {
  beforeEach(() => {
    cy.clearAppData()
    cy.visit('/')
    cy.acceptConsent()
  })

  it('should complete full timer workflow and create activity log', () => {
    // Start with quick timer (15s for faster testing)
    cy.get('[data-testid="quick-timer-15s"]').click()
    
    // Should navigate to timer page
    cy.url().should('include', '/timer')
    
    // Verify timer is displayed
    cy.get('[data-testid="timer-display"]').should('be.visible')
    cy.get('[data-testid="timer-display"]').should('contain', '00:15')
    
    // Start timer
    cy.get('[data-testid="start-timer"]').click()
    
    // Verify timer is running
    cy.get('[data-testid="timer-display"]').should('not.contain', '00:15')
    cy.get('[data-testid="stop-timer"]').should('be.visible')
    
    // Wait for timer to complete (short wait for testing)
    cy.wait(16000) // Wait slightly longer than 15s
    
    // Verify timer completion
    cy.get('[data-testid="timer-complete"]', { timeout: 20000 }).should('be.visible')
    
    // Navigate to activity log
    cy.get('[data-testid="nav-activity"]').click()
    cy.url().should('include', '/activity')
    
    // Verify activity log entry was created
    cy.get('[data-testid="activity-log-entry"]').should('have.length', 1)
    cy.get('[data-testid="activity-log-entry"]').first().within(() => {
      cy.should('contain', '15s')
      cy.should('contain', 'just now')
    })
  })

  it('should allow stopping timer before completion', () => {
    // Navigate to timer page
    cy.get('[data-testid="quick-timer-30s"]').click()
    
    // Start timer
    cy.get('[data-testid="start-timer"]').click()
    
    // Wait a few seconds then stop
    cy.wait(3000)
    cy.get('[data-testid="stop-timer"]').click()
    
    // Verify timer stopped
    cy.get('[data-testid="start-timer"]').should('be.visible')
    
    // Navigate to activity log
    cy.get('[data-testid="nav-activity"]').click()
    
    // Verify no activity log entry was created (timer didn't complete)
    cy.get('[data-testid="activity-log-entry"]').should('have.length', 0)
    cy.get('[data-testid="no-workouts"]').should('be.visible')
  })

  it('should allow timer reset and restart', () => {
    cy.get('[data-testid="quick-timer-30s"]').click()
    
    // Start timer
    cy.get('[data-testid="start-timer"]').click()
    
    // Wait then reset
    cy.wait(3000)
    cy.get('[data-testid="reset-timer"]').click()
    
    // Verify timer reset
    cy.get('[data-testid="timer-display"]').should('contain', '00:30')
    cy.get('[data-testid="start-timer"]').should('be.visible')
    
    // Start again
    cy.get('[data-testid="start-timer"]').click()
    cy.get('[data-testid="stop-timer"]').should('be.visible')
  })

  it('should work with exercise selection', () => {
    // Navigate to exercises and select one
    cy.get('button').contains('Browse All Exercises').click()
    cy.get('[data-testid="exercise-card"]').first().within(() => {
      cy.get('[data-testid="start-exercise-timer"]').click()
    })
    
    // Should navigate to timer with exercise pre-selected
    cy.url().should('include', '/timer')
    cy.get('[data-testid="selected-exercise"]').should('be.visible')
    
    // Start and complete timer (using shorter time for testing)
    cy.get('[data-testid="timer-duration-select"]').select('15')
    cy.get('[data-testid="start-timer"]').click()
    
    // Wait for completion
    cy.wait(16000)
    
    // Navigate to activity log
    cy.get('[data-testid="nav-activity"]').click()
    
    // Verify activity log shows exercise name
    cy.get('[data-testid="activity-log-entry"]').first().within(() => {
      cy.get('[data-testid="exercise-name"]').should('be.visible')
      cy.should('contain', '15s')
    })
  })

  it('should maintain timer state during page navigation', () => {
    cy.get('[data-testid="quick-timer-60s"]').click()
    
    // Start timer
    cy.get('[data-testid="start-timer"]').click()
    
    // Navigate away
    cy.get('[data-testid="nav-home"]').click()
    
    // Navigate back to timer
    cy.get('[data-testid="nav-timer"]').click()
    
    // Verify timer is still running
    cy.get('[data-testid="stop-timer"]').should('be.visible')
    cy.get('[data-testid="timer-display"]').should('not.contain', '01:00')
  })

  it('should show proper timer controls based on state', () => {
    cy.get('[data-testid="quick-timer-30s"]').click()
    
    // Initial state - only start button visible
    cy.get('[data-testid="start-timer"]').should('be.visible')
    cy.get('[data-testid="stop-timer"]').should('not.exist')
    cy.get('[data-testid="reset-timer"]').should('not.exist')
    
    // Running state - stop and reset buttons visible
    cy.get('[data-testid="start-timer"]').click()
    cy.get('[data-testid="start-timer"]').should('not.exist')
    cy.get('[data-testid="stop-timer"]').should('be.visible')
    cy.get('[data-testid="reset-timer"]').should('be.visible')
    
    // Stopped state - start and reset buttons visible
    cy.get('[data-testid="stop-timer"]').click()
    cy.get('[data-testid="start-timer"]').should('be.visible')
    cy.get('[data-testid="stop-timer"]').should('not.exist')
    cy.get('[data-testid="reset-timer"]').should('be.visible')
  })
})
