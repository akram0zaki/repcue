/**
 * Simple script to test app initialization doesn't hang
 */

// Simulate browser environment
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

async function testInitialization() {
  console.log('Testing app initialization...');
  
  try {
    // Set timeout to detect hangs
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Initialization timed out')), 5000)
    );
    
    // Try to import and create sync service
    const initPromise = (async () => {
      const { syncService } = await import('./src/services/syncService.js');
      
      // Test that sync service can be called without hanging
      const status = syncService.getSyncStatus();
      console.log('✅ syncService.getSyncStatus() returned:', {
        isOnline: status.isOnline,
        isSyncing: status.isSyncing,
        hasChangesToSync: status.hasChangesToSync
      });
      
      return true;
    })();
    
    await Promise.race([initPromise, timeout]);
    console.log('✅ App initialization test passed - no hanging detected');
    
  } catch (error) {
    console.error('❌ App initialization test failed:', error.message);
    process.exit(1);
  }
}

testInitialization();