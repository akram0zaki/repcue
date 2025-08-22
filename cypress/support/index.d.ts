/// <reference types="cypress" />

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare namespace Cypress {
  interface Chainable {
  acceptConsent(): Chainable
  clearAppData(): Chainable
  }
}

// Extend Window interface in Cypress test environment for feature flag override used in E2E tests
declare global {
  interface Window {
    __VIDEO_DEMOS_DISABLED__?: boolean;
  }
}

export {};
