import { StorageService } from './storageService';
import { ConsentService } from './consentService';
import { AuthService } from './authService';
import { supabase } from '../config/supabase';
import { SYNC_ENABLED, SYNC_USE_INVOKE } from '../config/features';

export interface SyncResult {
  success: boolean;
  tablesProcessed: number;
  recordsPushed: number;
  recordsPulled: number;
  conflicts: number;
  errors: SyncError[];
}

export interface SyncError {
  type: 'network' | 'validation' | 'conflict' | 'storage' | 'auth' | 'unknown';
  message: string;
  table?: string;
  recordId?: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncAttempt?: number;
  lastSuccessfulSync?: number;
  hasChangesToSync: boolean;
  errors: SyncError[];
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
  private syncErrors: SyncError[] = [];
  private listeners: ((status: SyncStatus) => void)[] = [];
  // Internal: multi-pass hydration guard
  private maxHydrationPasses = 3;

  /**
   * Create a structured sync error
   */
  private createSyncError(
    type: SyncError['type'],
    message: string,
    table?: string,
    recordId?: string,
    details?: Record<string, unknown>
  ): SyncError {
    return {
      type,
      message,
      table,
      recordId,
      timestamp: new Date().toISOString(),
      details
    };
  }

  /**
   * Validate a record before syncing
   */
  private validateRecord(record: Record<string, unknown>, tableName: string): SyncError | null {
    // Check required fields
    if (!record.id) {
      return this.createSyncError(
        'validation',
        'Record missing required id field',
        tableName,
        record.id as string,
        { record }
      );
    }

    // Validate timestamp fields
    if (record.updated_at && typeof record.updated_at === 'string') {
      try {
        new Date(record.updated_at);
      } catch {
        return this.createSyncError(
          'validation',
          'Invalid updated_at timestamp format',
          tableName,
          record.id as string,
          { updated_at: record.updated_at }
        );
      }
    }

    // Validate version field
    if (record.version && (typeof record.version !== 'number' || record.version < 1)) {
      return this.createSyncError(
        'validation',
        'Invalid version field - must be a positive number',
        tableName,
        record.id as string,
        { version: record.version }
      );
    }

    // Table-specific validation
    switch (tableName) {
      case 'exercises':
        if (!record.name || typeof record.name !== 'string') {
          return this.createSyncError(
            'validation',
            'Exercise missing required name field',
            tableName,
            record.id as string,
            { name: record.name }
          );
        }
        if (!record.exercise_type || !['time_based', 'repetition_based'].includes(record.exercise_type as string)) {
          return this.createSyncError(
            'validation',
            'Exercise has invalid exercise_type',
            tableName,
            record.id as string,
            { exercise_type: record.exercise_type }
          );
        }
        break;

      case 'workouts':
        if (!record.name || typeof record.name !== 'string') {
          return this.createSyncError(
            'validation',
            'Workout missing required name field',
            tableName,
            record.id as string,
            { name: record.name }
          );
        }
        if (!Array.isArray(record.exercises)) {
          return this.createSyncError(
            'validation',
            'Workout exercises field must be an array',
            tableName,
            record.id as string,
            { exercises: record.exercises }
          );
        }
        break;

      case 'activity_logs':
        if (!record.exercise_name || typeof record.exercise_name !== 'string') {
          return this.createSyncError(
            'validation',
            'Activity log missing required exercise_name field',
            tableName,
            record.id as string,
            { exercise_name: record.exercise_name }
          );
        }
        if (typeof record.duration !== 'number' || record.duration < 0) {
          return this.createSyncError(
            'validation',
            'Activity log duration must be a positive number',
            tableName,
            record.id as string,
            { duration: record.duration }
          );
        }
        break;
    }

    return null; // Validation passed
  }


  private constructor() {
    this.storageService = StorageService.getInstance();
    this.consentService = ConsentService.getInstance();
    this.authService = AuthService.getInstance();

    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
    document.addEventListener('visibilitychange', () => {
      try {
        if (document.visibilityState === 'visible' && this.authService?.getAuthState()?.isAuthenticated) {
          this.scheduleSync();
        }
      } catch (e) {
        // Non-fatal
      }
    });

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
      this.scheduleSync();
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
   * Debounced sync scheduler to coalesce rapid triggers (online/visibility/etc.)
   */
  private debounceTimer: number | null = null;
  private scheduleWindowMs = 500;
  private scheduleSync(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = window.setTimeout(() => {
  // Avoid piling up if already syncing
  if (this.isSyncing) return;
  this.sync().catch(err => console.warn('Scheduled sync failed:', err));
    }, this.scheduleWindowMs);
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
    // Check if sync is enabled
    if (!SYNC_ENABLED) {
      console.log('🚫 Sync skipped: feature disabled');
      return this.createEmptyResult();
    }

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
        errors: [this.createSyncError('network', 'Device is offline')]
      };
    }

    this.isSyncing = true;
    this.lastSyncAttempt = Date.now();
    this.syncErrors = [];
    this.notifyListeners();

    const syncPromise = this.performSync(authState.accessToken, force);
    this.syncInProgress = syncPromise;

    try {
      const result = await syncPromise;
      
      if (result.success) {
        this.lastSuccessfulSync = Date.now();
        console.log(`✅ Sync completed: ${result.tablesProcessed} tables, ${result.recordsPushed} pushed, ${result.recordsPulled} pulled`);
        // Broadcast a sync completion event so UI can refresh dependent views (workouts, activity logs, etc.)
        if (typeof window !== 'undefined' && result.recordsPulled > 0) {
          try {
            window.dispatchEvent(new CustomEvent('sync:applied', { detail: { result } }));
          } catch (e) {
            // Non-fatal
            console.debug('sync:applied event dispatch failed (ignored):', e);
          }
        }
      } else {
        console.warn(`⚠️ Sync completed with errors:`, result.errors);
        this.syncErrors = result.errors;
      }

      return result;
    } catch (error) {
      const syncError = this.createSyncError(
        error instanceof Error && error.message.includes('network') ? 'network' : 'unknown',
        error instanceof Error ? error.message : 'Unknown sync error',
        undefined,
        undefined,
        { originalError: error }
      );
      
      console.error('❌ Sync failed:', syncError);
      this.syncErrors = [syncError];
      
      return {
        success: false,
        tablesProcessed: 0,
        recordsPushed: 0,
        recordsPulled: 0,
        conflicts: 0,
        errors: [syncError]
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
  private async performSync(accessToken: string, force: boolean = false): Promise<SyncResult> {
    const result: SyncResult = {
        success: true,
      tablesProcessed: 0,
      recordsPushed: 0,
      recordsPulled: 0,
      conflicts: 0,
        errors: []
    };

    try {
      // Detect initial hydration scenario: brand-new device (no cursor) and no local user data
      const initialHydration = await this.isInitialHydration();
      if (initialHydration) {
        console.log('🆕 Initial hydration detected: forcing a full pull');
      }

      // Step 1: Gather dirty records from all tables
      const syncRequest: SyncRequest = {
        // For initial hydration, omit since cursor to request full server state
        ...(!initialHydration && this.lastSyncCursor ? { since: this.lastSyncCursor } : {}),
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
          const syncError = this.createSyncError(
            'storage',
            `Failed to gather dirty records for ${tableName}`,
            tableName,
            undefined,
            { originalError: error }
          );
          console.error(`Error gathering dirty records for ${tableName}:`, syncError);
          result.errors.push(syncError);
        }
      }

      // Check if there's actually anything to sync before making the request
      const hasChanges = Object.values(syncRequest.tables).some(table => 
        table.upserts.length > 0 || table.deletes.length > 0
      );
      
      console.log('🔍 Sync request has changes:', hasChanges);
      
      // Only skip sync if we have no local changes AND we're certain we don't need server data
      // We should always sync on first login (when lastSuccessfulSync is undefined)
      // or when force sync is requested
  const shouldSkipSync = !initialHydration && !hasChanges && 
                           this.lastSyncCursor && 
                           this.lastSuccessfulSync && 
                           !force &&
                           (Date.now() - this.lastSuccessfulSync) < 30000; // Only skip if synced within last 30 seconds
                           
      if (shouldSkipSync) {
        console.log('📋 No local changes to sync and recent successful sync exists, skipping sync call');
        return {
          success: true,
          tablesProcessed: SYNCABLE_TABLES.length,
          recordsPushed: 0,
          recordsPulled: 0,
          conflicts: 0,
          errors: []
        };
      }
      
      console.log('🔄 Proceeding with sync - hasChanges:', hasChanges, 'lastSuccessfulSync:', this.lastSuccessfulSync, 'force:', force);

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
          const syncError = this.createSyncError(
            'storage',
            `Failed to apply server changes for ${tableName}`,
            tableName,
            undefined,
            { originalError: error }
          );
          console.error(`Error applying server changes for ${tableName}:`, syncError);
          result.errors.push(syncError);
        }
      }

      // Step 4: Mark local records as clean
      await this.markRecordsAsClean();

      // Step 5: Update sync cursor
      this.saveSyncCursor(syncResponse.cursor);

      // Optional multi-pass hydration: if initial hydration or server returned changes
      // and there are still dirty records to push (batch-limited) or we just pulled data,
      // run a few more passes to finish hydration.
      let passes = 0;
      while (passes < this.maxHydrationPasses) {
        passes++;
        const stillDirty = await this.hasChangesToSync();
        // Only continue if we still have dirty records to push;
        // we'll also continue if this pass pulls new records from server.
        if (!stillDirty && this.lastSyncCursor) {
          // Probe once more only if we had no cursor before (first pass handled above)
          // If nothing dirty and we already have a cursor, break.
          break;
        }

        const followUpReq: SyncRequest = {
          ...(this.lastSyncCursor ? { since: this.lastSyncCursor } : {}),
          tables: {},
          clientInfo: {
            appVersion: '1.0.0',
            deviceId: this.getDeviceId()
          }
        };
        // Re-gather dirty (next batch)
        for (const tableName of SYNCABLE_TABLES) {
          try {
            const dirty = await this.getDirtyRecords(tableName);
            followUpReq.tables[tableName] = dirty;
            if (dirty.upserts.length > 0 || dirty.deletes.length > 0) {
              result.recordsPushed += dirty.upserts.length + dirty.deletes.length;
            }
          } catch (e) {
            // continue
          }
        }

        const followResp = await this.callSyncEndpoint(followUpReq, accessToken);
        let pulledThisPass = 0;
        for (const tableName of SYNCABLE_TABLES) {
          const changes = followResp.changes[tableName];
          if (changes) {
            await this.applyServerChanges(tableName, changes);
            const pulled = changes.upserts.length + changes.deletes.length;
            result.recordsPulled += pulled;
            pulledThisPass += pulled;
          }
          result.tablesProcessed++;
        }
        await this.markRecordsAsClean();
        this.saveSyncCursor(followResp.cursor);
        // If we didn't pull anything and have no more dirty records, stop early
        if (pulledThisPass === 0) {
          const anyDirty = await this.hasChangesToSync();
          if (!anyDirty) break;
        }
      }

      if (result.errors.length > 0) {
        result.success = false;
      }

      return result;
    } catch (error) {
      console.error('Sync operation failed:', error);
      result.success = false;
      result.errors.push(this.createSyncError(
        'unknown',
        error instanceof Error ? error.message : 'Unknown error',
        undefined,
        undefined,
        { originalError: error }
      ));
      return result;
    }
  }

  /**
   * Map database table names to IndexedDB table names
   * Phase 2: No mapping needed - table names are consistent
   */
  private getIndexedDBTableName(tableName: string): string {
    // With Phase 2 complete, IndexedDB and server table names match exactly
    return tableName;
  }

  /**
   * Get dirty records for a table
   */
  private async getDirtyRecords(tableName: string): Promise<{ upserts: Record<string, unknown>[]; deletes: string[] }> {
    const db = this.storageService.getDatabase();
    const indexedDBTableName = this.getIndexedDBTableName(tableName);
    const table = (db as unknown as Record<string, unknown>)[indexedDBTableName];
    
    if (!table || typeof table !== 'object') {
      return { upserts: [], deletes: [] };
    }

    try {
      // Get all dirty records (dirty field is stored as number: 0 = clean, 1 = dirty)
      // Limit to 5 records per sync to avoid overwhelming the edge function
      const dirtyRecords = await (table as {
        where: (field: string) => {
          equals: (value: number) => {
            limit: (count: number) => {
              toArray: () => Promise<Record<string, unknown>[]>;
            };
          };
        };
      }).where('dirty').equals(1).limit(5).toArray();
      
      const upserts: Record<string, unknown>[] = [];
      const deletes: string[] = [];

      for (const record of dirtyRecords) {
        try {
          if (record.op === 'delete' || record.deleted) {
            deletes.push(record.id as string);
          } else {
          // Activity log hygiene: backfill missing exercise_name defensively
          const shouldReplaceGenericName = (name?: unknown) => !name || typeof name !== 'string' || name.trim() === '' || name === 'Unknown Exercise' || name === 'Workout';
          if (tableName === 'activity_logs' && shouldReplaceGenericName(record.exercise_name)) {
            try {
              if (record.is_workout && record.workout_id) {
                const workout = await (db.workouts as unknown as { get: (id: string) => Promise<Record<string, unknown> | undefined> }).get(record.workout_id as string);
                record.exercise_name = (workout?.workout_name as string) || (workout?.name as string) || 'Workout';
              } else if (record.exercise_id) {
                const ex = await (db.exercises as unknown as { get: (id: string) => Promise<Record<string, unknown> | undefined> }).get(record.exercise_id as string);
                record.exercise_name = (ex?.name as string) || 'Unknown Exercise';
              } else {
                record.exercise_name = 'Unknown Exercise';
              }
            } catch {
              record.exercise_name = record.is_workout ? 'Workout' : 'Unknown Exercise';
            }
          }

          // Remove local-only sync metadata before sending
          // With Phase 2 complete, no field mapping needed - direct assignment
          const { dirty: _dirty, op: _op, synced_at: _synced_at, ...cleanRecord } = record as Record<string, unknown>;
          
          // Validate record before adding to sync
          const validationError = this.validateRecord(cleanRecord, tableName);
          if (validationError) {
            console.error(`Validation failed for record ${cleanRecord.id}:`, validationError);
            // Skip invalid records to prevent sync failures
            continue;
          }
          
          upserts.push(cleanRecord);
        }
        } catch (recordError) {
          console.error(`Error processing record ${record.id} for table ${tableName}:`, recordError);
          // Skip this problematic record and continue with others
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
    // Debug logging to see what's being sent
    console.log('🔄 Sync request being sent:', {
      tables: Object.keys(syncRequest.tables),
      recordCounts: Object.entries(syncRequest.tables).map(([table, data]) => 
        `${table}: ${data.upserts.length} upserts, ${data.deletes.length} deletes`
      ),
      since: syncRequest.since,
      clientInfo: syncRequest.clientInfo
    });
    
    // Log the full request body to debug empty body issue
    const requestBodyString = JSON.stringify(syncRequest);
    console.log('🔍 Sync request body size (bytes):', requestBodyString.length);
    console.log('🔍 Full sync request body:', requestBodyString.substring(0, 1000) + (requestBodyString.length > 1000 ? '...[truncated]' : ''));
    
    // Verify the request is not empty
    const hasContent = Object.values(syncRequest.tables).some(table => 
      table.upserts.length > 0 || table.deletes.length > 0
    );
    console.log('🔍 Has content to sync:', hasContent);
    
    // Add extra validation to ensure we never send truly empty requests
    if (!syncRequest.tables || Object.keys(syncRequest.tables).length === 0) {
      console.error('🚨 Attempting to send sync request with empty tables object!');
      throw new Error('Invalid sync request: empty tables object');
    }
    
    // Log detailed structure of non-empty tables
    Object.entries(syncRequest.tables).forEach(([tableName, tableData]) => {
      if (tableData.upserts.length > 0 || tableData.deletes.length > 0) {
        console.log(`🔍 ${tableName} details:`, {
          upsertsCount: tableData.upserts.length,
          deletesCount: tableData.deletes.length,
          firstUpsert: tableData.upserts[0] || null,
          firstUpsertKeys: tableData.upserts[0] ? Object.keys(tableData.upserts[0]) : []
        });
        
        // Log first few records in detail
        if (tableData.upserts.length > 0) {
          console.log(`🔍 ${tableName} first record:`, JSON.stringify(tableData.upserts[0], null, 2));
        }
      }
    });

    // Choose path based on feature flag. Prefer direct fetch by default for reliability.
    if (SYNC_USE_INVOKE) {
      try {
        return await this.callSyncEndpointInvoke(syncRequest, accessToken);
      } catch (e) {
        console.warn('Invoke path failed, falling back to direct fetch:', e);
        return await this.callSyncEndpointDirectFetch(syncRequest, accessToken);
      }
    }
    return await this.callSyncEndpointDirectFetch(syncRequest, accessToken);
  }

  /**
   * Call sync endpoint using supabase.functions.invoke with enhanced diagnostics
   */
  private async callSyncEndpointInvoke(syncRequest: SyncRequest, _accessToken: string): Promise<SyncResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('sync', {
        body: syncRequest
      });
      if (error) {
        console.error('🟥 Invoke error:', {
          name: (error as any).name,
          message: error.message,
          status: (error as any).status,
          cause: (error as any).cause
        });
        throw error;
      }
      if (!data || typeof data !== 'object' || !('changes' in data)) {
        throw new Error('Invalid response from invoke: missing changes');
      }
      return data as SyncResponse;
    } catch (err) {
      console.error('🔴 callSyncEndpointInvoke failed:', err);
      throw err;
    }
  }

  /**
   * Fallback sync endpoint call using direct fetch
   */
  private async callSyncEndpointDirectFetch(syncRequest: SyncRequest, accessToken: string): Promise<SyncResponse> {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zumzzuvfsuzvvymhpymk.supabase.co';
    const functionUrl = `${supabaseUrl}/functions/v1/sync`;
    
    console.log('🔄 Using direct fetch to:', functionUrl);
    
    const requestBody = JSON.stringify(syncRequest);
    console.log('🔍 Direct fetch request body size:', requestBody.length);
    
    const attempt = async (token: string) => {
      return fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Client-Info': 'repcue-frontend@1.0.0'
        },
        body: requestBody
      });
    };

    try {
      let response = await attempt(accessToken);

      console.log('🔍 Direct fetch response status:', response.status);
      console.log('🔍 Direct fetch response headers:', Object.fromEntries(response.headers.entries()));

      // If token invalid/expired, try a one-time refresh then retry
      if (response.status === 401) {
        try {
          // Attempt our service refresh; ignore result
          await this.authService.refreshSession();
        } catch {}

        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const refreshedToken = sessionData?.session?.access_token;
          if (refreshedToken) {
            console.log('🔁 Retrying sync after token refresh');
            response = await attempt(refreshedToken);
            console.log('🔍 Direct fetch (retry) status:', response.status);
          }
        } catch (e) {
          console.warn('Token refresh check failed:', e);
        }
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('🔴 Direct fetch error response:', errorText);
        throw new Error(`Direct fetch error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('🔍 Direct fetch success, data received');
      return data;
    } catch (error) {
      console.error('🔴 Direct fetch failed:', error);
      throw error;
    }
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
          // With Phase 2 complete, no field mapping needed - direct assignment
          // serverRecord is already defined by the for loop
          
          // Get local record to check for conflicts
          const localRecord = await typedTable.get(serverRecord.id as string);
          
          if (localRecord) {
            // Handle conflict resolution
            const resolvedRecord = await this.resolveConflict(tableName, localRecord, serverRecord);
            
            // Apply resolved record with sync metadata
            await typedTable.put({
              ...resolvedRecord,
              dirty: 0,
              op: undefined,
              synced_at: new Date().toISOString()
            });
          } else {
            // No local record - apply server record directly
            await typedTable.put({
              ...serverRecord,
              dirty: 0,
              op: undefined,
              synced_at: new Date().toISOString()
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
          dirty: 0,
          op: undefined,
          synced_at: new Date().toISOString()
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
            equals: (value: number) => {
              modify: (changes: Record<string, unknown>) => Promise<void>;
            };
          };
        }).where('dirty').equals(1).modify({
          dirty: 0,
          op: undefined,
          synced_at: new Date().toISOString()
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
  private createEmptyResult(errors: SyncError[] = []): SyncResult {
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
   * Determine if this device likely needs an initial full hydration from server.
   * Criteria: no existing cursor AND key user tables empty (ignoring seeded exercises).
   */
  private async isInitialHydration(): Promise<boolean> {
    if (this.lastSyncCursor) return false;
    try {
      const db = this.storageService.getDatabase();
      const getCount = async (name: string): Promise<number> => {
        const table = (db as unknown as Record<string, unknown>)[name];
        if (!table || typeof table !== 'object') return 0;
        return await (table as { count: () => Promise<number> }).count();
      };
      // Workouts, activity logs, and sessions indicate meaningful user data
      const [w, a, s] = await Promise.all([
        getCount('workouts'),
        getCount('activity_logs'),
        getCount('workout_sessions')
      ]);
      return (w + a + s) === 0;
    } catch {
      return false;
    }
  }

  /**
   * Check if there are changes to sync
   */
  async hasChangesToSync(): Promise<boolean> {
    if (!SYNC_ENABLED) {
      return false;
    }

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
            equals: (value: number) => {
              count: () => Promise<number>;
            };
          };
        }).where('dirty').equals(1).count();
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
   * Clear sync errors
   */
  clearErrors(): void {
    this.syncErrors = [];
    this.notifyListeners();
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
  // Use snake_case updated_at consistently across records
  const localUpdatedAt = new Date((localRecord.updated_at as string) || 0);
  const serverUpdatedAt = new Date((serverRecord.updated_at as string) || 0);
    
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