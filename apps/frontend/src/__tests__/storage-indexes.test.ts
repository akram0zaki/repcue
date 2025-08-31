import { describe, it, expect } from 'vitest';
import { storageService } from '../services/storageService';

describe('IndexedDB indexes', () => {
  it('supports activity_logs.where("workout_id") without schema error', async () => {
    // Skip if IndexedDB is not available (e.g., certain test environments)
    const hasIndexedDb = typeof indexedDB !== 'undefined' && !!indexedDB;
    if (!hasIndexedDb) {
      expect(true).toBe(true);
      return;
    }
    const db = storageService.getDatabase();
    // Should not throw: index must exist from v8 migration
    await db.activity_logs.where('workout_id').equals('test').toArray();
    expect(true).toBe(true);
  });
});
