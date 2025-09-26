import { describe, it, expect, beforeEach, vi } from 'vitest';
import { storageService } from '../services/storageService';
import { ActivityLog } from '../types';

// Mock services and dependencies
vi.mock('../services/authService', () => ({
  authService: {
    getInstance: () => ({
      signOut: vi.fn(),
      signIn: vi.fn(),
      onAuthStateChange: vi.fn(),
      getCurrentUser: vi.fn(() => null),
      checkAuth: vi.fn(() => Promise.resolve(null)),
      isAuthenticated: vi.fn(() => false)
    }),
    getCurrentUser: vi.fn(() => null),
    getAuthState: vi.fn(() => ({ isAuthenticated: false, user: null }))
  }
}));

vi.mock('../services/consentService', () => ({
  consentService: {
    getInstance: () => ({
      hasConsent: vi.fn(() => true),
      setConsent: vi.fn(),
      getConsent: vi.fn(() => ({ hasConsented: true, cookiesAccepted: true, analyticsAccepted: true })),
      onConsentChange: vi.fn(),
      revokeConsent: vi.fn()
    }),
    hasConsent: vi.fn(() => true)
  }
}));

describe('Activity Log Catalog ID Database Schema', () => {
  beforeEach(async () => {
    // Clear any existing data
    await storageService.clearAllData();
  });

  it('should save activity log with catalog_id field', async () => {
    // Create a test activity log with catalog_id
    const testActivityLog: ActivityLog = {
      id: crypto.randomUUID(),
      exercise_id: 'push-ups',
      exercise_name: 'Push-ups',
      catalog_id: 'general-fitness',
      duration: 30,
      timestamp: new Date().toISOString(),
      notes: 'Test exercise completed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted: false,
      version: 1
    };

    // Save the activity log
    await storageService.saveActivityLog(testActivityLog);

    // Retrieve the activity log
    const savedLogs = await storageService.getActivityLogs();
    expect(savedLogs).toHaveLength(1);

    const savedLog = savedLogs[0];
    expect(savedLog.exercise_id).toBe('push-ups');
    expect(savedLog.exercise_name).toBe('Push-ups');
    expect(savedLog.catalog_id).toBe('general-fitness');
    expect(savedLog.duration).toBe(30);
    expect(savedLog.notes).toBe('Test exercise completed');
  });

  it('should handle activity logs without catalog_id (optional field)', async () => {
    // Create a test activity log without catalog_id
    const testActivityLog: ActivityLog = {
      id: crypto.randomUUID(),
      exercise_id: 'jumping-jacks',
      exercise_name: 'Jumping Jacks',
      // catalog_id is optional, so we don't include it
      duration: 45,
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted: false,
      version: 1
    };

    // Save the activity log
    await storageService.saveActivityLog(testActivityLog);

    // Retrieve the activity log
    const savedLogs = await storageService.getActivityLogs();
    expect(savedLogs).toHaveLength(1);

    const savedLog = savedLogs[0];
    expect(savedLog.exercise_id).toBe('jumping-jacks');
    expect(savedLog.exercise_name).toBe('Jumping Jacks');
    expect(savedLog.catalog_id).toBeUndefined();
    expect(savedLog.duration).toBe(45);
  });

  it('should verify database migration to version 19 includes catalog_id field', async () => {
    // This test verifies that the database schema migration worked correctly
    // by checking that we can store and retrieve the catalog_id field

    const testLogs = [
      {
        id: crypto.randomUUID(),
        exercise_id: 'burpees',
        exercise_name: 'Burpees',
        catalog_id: 'general-fitness',
        duration: 60,
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted: false,
        version: 1
      },
      {
        id: crypto.randomUUID(),
        exercise_id: 'meditation',
        exercise_name: 'Meditation',
        catalog_id: 'tai-chi',
        duration: 300,
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted: false,
        version: 1
      }
    ];

    // Save multiple activity logs with different catalog_ids
    for (const log of testLogs) {
      await storageService.saveActivityLog(log as ActivityLog);
    }

    // Retrieve all logs
    const savedLogs = await storageService.getActivityLogs();
    expect(savedLogs).toHaveLength(2);

    // Verify catalog_id is preserved for each log
    const burpeesLog = savedLogs.find(log => log.exercise_id === 'burpees');
    expect(burpeesLog?.catalog_id).toBe('general-fitness');

    const meditationLog = savedLogs.find(log => log.exercise_id === 'meditation');
    expect(meditationLog?.catalog_id).toBe('tai-chi');
  });
});