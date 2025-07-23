import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Web Audio API
global.AudioContext = class MockAudioContext {
  currentTime = 0;
  destination = {};
  
  createOscillator() {
    return {
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      frequency: { value: 0 },
      type: 'sine'
    }
  }
  createGain() {
    return {
      connect: vi.fn(),
      gain: { 
        value: 0,
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn()
      }
    }
  }
} as any

// Mock Vibration API
Object.defineProperty(navigator, 'vibrate', {
  value: vi.fn(),
  writable: true,
})

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  writable: true,
})

// Mock IndexedDB
global.indexedDB = {
  open: vi.fn(),
  deleteDatabase: vi.fn(),
} as any

// Mock IndexedDB
global.indexedDB = {
  open: vi.fn(),
  deleteDatabase: vi.fn(),
} as any 