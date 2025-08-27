import type { SyncMetadata } from '../types';

/**
 * Sync helper functions for database operations
 * These functions ensure all data operations include proper sync metadata
 */

/**
 * Get current ISO timestamp
 */
function nowISO(): string {
  return new Date().toISOString();
}

/**
 * Generate a new UUID v4 using Web API
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Create sync metadata for a new record
 */
export function createSyncMetadata(ownerId?: string | null): Omit<SyncMetadata, 'id'> {
  return {
    ownerId: ownerId || null,
    updatedAt: nowISO(),
    deleted: false,
    version: 1,
    dirty: 1,
    op: 'upsert'
  };
}

/**
 * Update sync metadata for an existing record
 */
export function updateSyncMetadata(
  currentMetadata: SyncMetadata,
  ownerId?: string | null
): Partial<SyncMetadata> {
  return {
    updatedAt: nowISO(),
    version: currentMetadata.version + 1,
    dirty: 1,
    op: 'upsert',
    ownerId: ownerId !== undefined ? ownerId : currentMetadata.ownerId
  };
}

/**
 * Mark a record as deleted (tombstone)
 */
export function markAsDeleted(
  currentMetadata: SyncMetadata,
  ownerId?: string | null
): Partial<SyncMetadata> {
  return {
    updatedAt: nowISO(),
    version: currentMetadata.version + 1,
    deleted: true,
    dirty: 1,
    op: 'delete',
    ownerId: ownerId !== undefined ? ownerId : currentMetadata.ownerId
  };
}

/**
 * Mark a record as synced (clean)
 */
export function markAsSynced(syncedAt?: string): Partial<SyncMetadata> {
  return {
    dirty: 0,
    syncedAt: syncedAt || nowISO()
  };
}

/**
 * Prepare data for upsert operation
 */
export function prepareUpsert<T extends Partial<SyncMetadata>>(
  data: T,
  existingId?: string,
  ownerId?: string | null
): T & SyncMetadata {
  const id = existingId || data.id || generateId();
  
  if (data.id && data.updatedAt) {
    // Updating existing record
    return {
      ...data,
      id,
      ...updateSyncMetadata(data as SyncMetadata, ownerId)
    } as T & SyncMetadata;
  } else {
    // Creating new record
    return {
      ...data,
      id,
      ...createSyncMetadata(ownerId)
    } as T & SyncMetadata;
  }
}

/**
 * Prepare data for soft delete operation
 */
export function prepareSoftDelete<T extends SyncMetadata>(
  data: T,
  ownerId?: string | null
): T {
  return {
    ...data,
    ...markAsDeleted(data, ownerId)
  } as T;
}

/**
 * Check if a record is dirty (needs sync)
 */
export function isDirty(data: Partial<SyncMetadata>): boolean {
  return data.dirty === 1;
}

/**
 * Check if a record is deleted
 */
export function isDeleted(data: Partial<SyncMetadata>): boolean {
  return data.deleted === true;
}

/**
 * Filter out deleted records
 */
export function filterActiveRecords<T extends Partial<SyncMetadata>>(records: T[]): T[] {
  return records.filter(record => !isDeleted(record));
}

/**
 * Get dirty records that need to be synced
 */
export function getDirtyRecords<T extends Partial<SyncMetadata>>(records: T[]): T[] {
  return records.filter(record => isDirty(record));
}

/**
 * Claim ownership of anonymous records during first sync
 */
export function claimOwnership<T extends SyncMetadata>(
  data: T,
  ownerId: string
): T {
  return {
    ...data,
    ownerId,
    ...updateSyncMetadata(data, ownerId)
  };
}

/**
 * Resolve conflict between local and server versions
 * Returns the version that should be kept locally
 */
export function resolveConflict<T extends SyncMetadata>(
  localVersion: T,
  serverVersion: T
): { winner: T; action: 'keep-local' | 'accept-server' | 'prefer-delete' } {
  const localTime = new Date(localVersion.updatedAt).getTime();
  const serverTime = new Date(serverVersion.updatedAt).getTime();
  
  // If timestamps are equal and operations differ, prefer delete for safety
  if (localTime === serverTime && localVersion.op !== serverVersion.op) {
    const deleteVersion = localVersion.op === 'delete' ? localVersion : serverVersion;
    return { winner: deleteVersion, action: 'prefer-delete' };
  }
  
  // Last writer wins based on updatedAt timestamp
  if (serverTime > localTime) {
    return { winner: serverVersion, action: 'accept-server' };
  } else {
    return { winner: localVersion, action: 'keep-local' };
  }
}
