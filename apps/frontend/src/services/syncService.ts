import { StorageService } from './storageService';
import { ConsentService } from './consentService';
import { AuthService } from './authService';
import { supabase } from '../config/supabase';

export interface SyncResult {
  success: boolean;
  tablesProcessed: number;
  recordsPushed: number;
  recordsPulled: number;
  conflicts: number;
  errors: string[];
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncAttempt?: number;
  lastSuccessfulSync?: number;
  hasChangesToSync: boolean;
  errors: string[];
}

export interface SyncRequest {
  since?: string;
  tables: {
    [tableName: string]: {
      upserts: Record<string, unknown>[];
      deletes: string[];
    };
  };
  clientInfo?: {
    appVersion: string;
    deviceId: string;
  };
}

export interface SyncResponse {
  changes: {
    [tableName: string]: {
      upserts: Record<string, unknown>[];
      deletes: string[];
    };
  };
  cursor: string;
}

// List of syncable tables in the order they should be processed
const SYNCABLE_TABLES = [
  'user_preferences',
  'app_settings', 
  'exercises',
  'workouts',
  'activity_logs',
  'workout_sessions'
] as const;

export class SyncService {
  private static instance: SyncService;
  private storageService: StorageService;
  private consentService: ConsentService;
  private authService: AuthService;
  private isOnline: boolean = navigator.onLine;
  private isSyncing: boolean = false;
  private syncInProgress: Promise<SyncResult> | null = null;
  private lastSyncAttempt?: number;
  private lastSuccessfulSync?: number;
  private lastSyncCursor?: string;
  private syncErrors: string[] = [];
  private listeners: ((status: SyncStatus) => void)[] = [];

  private constructor() {
    this.storageService = StorageService.getInstance();
    this.consentService = ConsentService.getInstance();
    this.authService = AuthService.getInstance();

    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));

    // Load last sync cursor from localStorage
    this.loadSyncCursor();
  }

  public static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  /**
   * Load last sync cursor from localStorage
   */
  private loadSyncCursor(): void {
    try {
      const stored = localStorage.getItem('repcue_last_sync_cursor');
      if (stored) {
        this.lastSyncCursor = stored;
      }
    } catch (error) {
      console.warn('Failed to load sync cursor:', error);
    }
  }

  /**
   * Save sync cursor to localStorage
   */
  private saveSyncCursor(cursor: string): void {
    try {
      localStorage.setItem('repcue_last_sync_cursor', cursor);
      this.lastSyncCursor = cursor;
    } catch (error) {
      console.warn('Failed to save sync cursor:', error);
    }
  }

  /**
   * Handle network coming back online
   */
  private handleOnline(): void {
    console.log('📶 Network connected - scheduling sync');
    this.isOnline = true;
    this.notifyListeners();

    // Trigger sync when network comes back if authenticated
    if (this.authService?.getAuthState()?.isAuthenticated) {
      this.sync().catch(error => {
        console.error('Auto-sync on network restore failed:', error);
      });
    }
  }

  /**
   * Handle network going offline
   */
  private handleOffline(): void {
    console.log('📵 Network disconnected');
    this.isOnline = false;
    this.notifyListeners();
  }

  /**
   * Add a listener for sync status changes
   */
  onSyncStatusChange(listener: (status: SyncStatus) => void): () => void {
    this.listeners.push(listener);
    
    // Immediately call with current status
    listener(this.getSyncStatus());
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Get current sync status
   */
  getSyncStatus(): SyncStatus {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      lastSyncAttempt: this.lastSyncAttempt,
      lastSuccessfulSync: this.lastSuccessfulSync,
      hasChangesToSync: false, // Will be updated by notifyListeners when needed
      errors: this.syncErrors
    };
  }

  /**
   * Get sync status with up-to-date hasChangesToSync calculation
   */
  async getSyncStatusWithChanges(): Promise<SyncStatus> {
    const baseStatus = this.getSyncStatus();
    
    let hasChangesToSync = false;
    try {
      hasChangesToSync = await this.hasChangesToSync();
    } catch (error) {
      console.error('Error getting sync status with changes:', error);
      hasChangesToSync = false;
    }
    
    return {
      ...baseStatus,
      hasChangesToSync
    };
  }

  /**
   * Notify all listeners of status change
   */
  private notifyListeners(): void {
    // Use async method to get accurate hasChangesToSync status
    this.getSyncStatusWithChanges().then(status => {
      this.listeners.forEach(listener => {
        try {
          listener(status);
        } catch (error) {
          console.error('Error in sync status listener:', error);
        }
      });
    }).catch(error => {
      console.error('Error getting sync status with changes:', error);
      // Fallback to basic status
      const status = this.getSyncStatus();
      this.listeners.forEach(listener => {
        try {
          listener(status);
        } catch (error) {
          console.error('Error in sync status listener:', error);
        }
      });
    });
  }

  /**
   * Main sync function - implements the full sync protocol
   */
  async sync(force: boolean = false): Promise<SyncResult> {
    // Check consent
    if (!this.consentService.hasConsent()) {
      console.log('🚫 Sync skipped: no storage consent');
      return this.createEmptyResult();
    }

    // Check authentication
    const authState = this.authService.getAuthState();
    if (!authState.isAuthenticated || !authState.accessToken) {
      console.log('🚫 Sync skipped: not authenticated');
      return this.createEmptyResult();
    }

    // Prevent concurrent syncs
    if (this.isSyncing && !force) {
      console.log('🔄 Sync already in progress');
      return this.syncInProgress || this.createEmptyResult();
    }

    // Check network
    if (!this.isOnline) {
      console.log('📴 Sync skipped: device offline');
      return {
        success: true,
        tablesProcessed: 0,
        recordsPushed: 0,
        recordsPulled: 0,
        conflicts: 0,
        errors: ['Device is offline']
      };
    }

    this.isSyncing = true;
    this.lastSyncAttempt = Date.now();
    this.syncErrors = [];
    this.notifyListeners();

    const syncPromise = this.performSync(authState.accessToken);
    this.syncInProgress = syncPromise;

    try {
      const result = await syncPromise;
      
      if (result.success) {
        this.lastSuccessfulSync = Date.now();
        console.log(`✅ Sync completed: ${result.tablesProcessed} tables, ${result.recordsPushed} pushed, ${result.recordsPulled} pulled`);
      } else {
        console.warn(`⚠️ Sync completed with errors:`, result.errors);
        this.syncErrors = result.errors;
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
      console.error('❌ Sync failed:', errorMessage);
      this.syncErrors = [errorMessage];
      
      return {
        success: false,
        tablesProcessed: 0,
        recordsPushed: 0,
        recordsPulled: 0,
        conflicts: 0,
        errors: [errorMessage]
      };
    } finally {
      this.isSyncing = false;
      this.syncInProgress = null;
      this.notifyListeners();
    }
  }

  /**
   * Perform the actual sync operation
   */
  private async performSync(accessToken: string): Promise<SyncResult> {
    const result: SyncResult = {
        success: true,
      tablesProcessed: 0,
      recordsPushed: 0,
      recordsPulled: 0,
      conflicts: 0,
        errors: []
    };

    try {
      // Step 1: Gather dirty records from all tables
      const syncRequest: SyncRequest = {
        since: this.lastSyncCursor,
        tables: {},
        clientInfo: {
          appVersion: '1.0.0', // TODO: get from package.json
          deviceId: this.getDeviceId()
        }
      };

      for (const tableName of SYNCABLE_TABLES) {
        try {
          const dirtyRecords = await this.getDirtyRecords(tableName);
          syncRequest.tables[tableName] = dirtyRecords;
          
          if (dirtyRecords.upserts.length > 0 || dirtyRecords.deletes.length > 0) {
            result.recordsPushed += dirtyRecords.upserts.length + dirtyRecords.deletes.length;
          }
        } catch (error) {
          console.error(`Error gathering dirty records for ${tableName}:`, error);
          result.errors.push(`Failed to gather dirty records for ${tableName}`);
        }
      }

      // Step 2: Call sync endpoint
      const syncResponse = await this.callSyncEndpoint(syncRequest, accessToken);

      // Step 3: Apply server changes locally
      for (const tableName of SYNCABLE_TABLES) {
        try {
          const changes = syncResponse.changes[tableName];
          if (changes) {
            await this.applyServerChanges(tableName, changes);
            result.recordsPulled += changes.upserts.length + changes.deletes.length;
          }
          result.tablesProcessed++;
        } catch (error) {
          console.error(`Error applying server changes for ${tableName}:`, error);
          result.errors.push(`Failed to apply server changes for ${tableName}`);
        }
      }

      // Step 4: Mark local records as clean
      await this.markRecordsAsClean();

      // Step 5: Update sync cursor
      this.saveSyncCursor(syncResponse.cursor);

      if (result.errors.length > 0) {
        result.success = false;
      }

      return result;
    } catch (error) {
      console.error('Sync operation failed:', error);
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      return result;
    }
  }

  /**
   * Get dirty records for a table
   */
  private async getDirtyRecords(tableName: string): Promise<{ upserts: Record<string, unknown>[]; deletes: string[] }> {
    const db = this.storageService.getDatabase();
    const table = (db as unknown as Record<string, unknown>)[tableName];
    
    if (!table || typeof table !== 'object') {
      return { upserts: [], deletes: [] };
    }

    try {
      // Get all dirty records
      const dirtyRecords = await (table as {
        where: (field: string) => {
          equals: (value: boolean) => {
            toArray: () => Promise<Record<string, unknown>[]>;
          };
        };
      }).where('dirty').equals(true).toArray();
      
      const upserts: Record<string, unknown>[] = [];
      const deletes: string[] = [];

      for (const record of dirtyRecords) {
        if (record.op === 'delete' || record.deleted) {
          deletes.push(record.id as string);
        } else {
          // Remove local-only sync metadata before sending
          const { dirty: _dirty, op: _op, syncedAt: _syncedAt, ...cleanRecord } = record;
          upserts.push(cleanRecord);
        }
      }

      return { upserts, deletes };
    } catch (error) {
      console.error(`Error getting dirty records for ${tableName}:`, error);
      return { upserts: [], deletes: [] };
    }
  }

  /**
   * Call the sync endpoint
   */
  private async callSyncEndpoint(syncRequest: SyncRequest, accessToken: string): Promise<SyncResponse> {
    const { data, error } = await supabase.functions.invoke('sync', {
      body: syncRequest,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (error) {
      throw new Error(`Sync endpoint error: ${error.message}`);
    }

    return data as SyncResponse;
  }

  /**
   * Apply server changes to local database
   */
  private async applyServerChanges(tableName: string, changes: { upserts: Record<string, unknown>[]; deletes: string[] }): Promise<void> {
    const db = this.storageService.getDatabase();
    const table = (db as unknown as Record<string, unknown>)[tableName];
    
    if (!table || typeof table !== 'object') {
      return;
    }

    try {
      const typedTable = table as {
        get: (id: string) => Promise<Record<string, unknown> | undefined>;
        put: (record: Record<string, unknown>) => Promise<void>;
        update: (id: string, changes: Record<string, unknown>) => Promise<void>;
      };

      // Apply upserts with enhanced conflict resolution
      for (const serverRecord of changes.upserts) {
        try {
          // Get local record to check for conflicts
          const localRecord = await typedTable.get(serverRecord.id as string);
          
          if (localRecord) {
            // Handle conflict resolution
            const resolvedRecord = await this.resolveConflict(tableName, localRecord, serverRecord);
            
            // Apply resolved record with sync metadata
            await typedTable.put({
              ...resolvedRecord,
              dirty: false,
              op: undefined,
              syncedAt: new Date().toISOString()
            });
          } else {
            // No local record - apply server record directly
            await typedTable.put({
              ...serverRecord,
              dirty: false,
              op: undefined,
              syncedAt: new Date().toISOString()
            });
          }
        } catch (error) {
          console.error(`Error applying upsert for ${tableName}:${serverRecord.id}:`, error);
          // Continue with other records
        }
      }

      // Apply deletes
      for (const recordId of changes.deletes) {
        await typedTable.update(recordId, {
          deleted: true,
          dirty: false,
          op: undefined,
          syncedAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error(`Error applying server changes for ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Mark all dirty records as clean
   */
  private async markRecordsAsClean(): Promise<void> {
    const db = this.storageService.getDatabase();
    
    for (const tableName of SYNCABLE_TABLES) {
      try {
        const table = (db as unknown as Record<string, unknown>)[tableName];
        if (!table || typeof table !== 'object') continue;

        await (table as {
          where: (field: string) => {
            equals: (value: boolean) => {
              modify: (changes: Record<string, unknown>) => Promise<void>;
            };
          };
        }).where('dirty').equals(true).modify({
          dirty: false,
          op: undefined,
          syncedAt: new Date().toISOString()
        });
      } catch (error) {
        console.error(`Error marking records as clean for ${tableName}:`, error);
      }
    }
  }

  /**
   * Get or generate device ID
   */
  private getDeviceId(): string {
    try {
      let deviceId = localStorage.getItem('repcue_device_id');
      if (!deviceId) {
        deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('repcue_device_id', deviceId);
      }
      return deviceId;
    } catch {
      return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  }

  /**
   * Create empty sync result
   */
  private createEmptyResult(errors: string[] = []): SyncResult {
    return {
      success: errors.length === 0,
      tablesProcessed: 0,
      recordsPushed: 0,
      recordsPulled: 0,
      conflicts: 0,
      errors
    };
  }

  /**
   * Check if there are changes to sync
   */
  async hasChangesToSync(): Promise<boolean> {
    if (!this.consentService?.hasConsent()) {
      return false;
    }

    const db = this.storageService?.getDatabase();
    if (!db) {
      return false;
    }
    
    for (const tableName of SYNCABLE_TABLES) {
      try {
        const table = (db as unknown as Record<string, unknown>)[tableName];
        if (!table || typeof table !== 'object') continue;

        const dirtyCount = await (table as {
          where: (field: string) => {
            equals: (value: boolean) => {
              count: () => Promise<number>;
            };
          };
        }).where('dirty').equals(true).count();
        if (dirtyCount > 0) {
          return true;
        }
      } catch (error) {
        console.error(`Error checking dirty records for ${tableName}:`, error);
      }
    }

    return false;
  }

  /**
   * Force sync for testing/development
   */
  async forcSync(): Promise<SyncResult> {
    return this.sync(true);
  }

  /**
   * Resolve conflicts between local and server records
   */
  private async resolveConflict(
    tableName: string, 
    localRecord: Record<string, unknown>, 
    serverRecord: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const localUpdatedAt = new Date(localRecord.updatedAt as string || 0);
    const serverUpdatedAt = new Date(serverRecord.updated_at as string || 0);
    
    // Enhanced conflict resolution rules
    if (localRecord.dirty) {
      if (serverUpdatedAt > localUpdatedAt) {
        // Server is newer - accept server version
        console.log(`🔄 Conflict resolved for ${tableName}:${serverRecord.id} - server wins (newer timestamp)`);
        return serverRecord;
      } else if (localUpdatedAt > serverUpdatedAt) {
        // Local is newer - keep local changes (will be pushed to server in next sync)
        console.log(`🔄 Conflict resolved for ${tableName}:${serverRecord.id} - local wins (newer timestamp)`);
        return localRecord;
      } else {
        // Same timestamp - handle special cases
        return this.resolveTimestampTie(tableName, localRecord, serverRecord);
      }
    } else {
      // Local record is clean - accept server version
      console.log(`📥 Updating clean local record ${tableName}:${serverRecord.id} with server version`);
      return serverRecord;
    }
  }

  /**
   * Handle cases where timestamps are equal
   */
  private resolveTimestampTie(
    tableName: string,
    localRecord: Record<string, unknown>,
    serverRecord: Record<string, unknown>
  ): Record<string, unknown> {
    // Special rule: prefer deletes for safety
    if (localRecord.deleted !== serverRecord.deleted) {
      const result = localRecord.deleted || serverRecord.deleted ? 
        { ...serverRecord, deleted: true } : 
        serverRecord;
      
      console.log(`🔄 Conflict resolved for ${tableName}:${serverRecord.id} - preferring delete operation`);
      return result;
    }

    // For other conflicts with equal timestamps, prefer server version
    console.log(`🔄 Conflict resolved for ${tableName}:${serverRecord.id} - server wins (timestamp tie)`);
    return serverRecord;
  }
}

// Export singleton instance
export const syncService = SyncService.getInstance();