import { StorageService } from './storageService';
import { ConsentService } from './consentService';
import { AuthService } from './authService';
import { supabase } from '../config/supabase';
import { SYNC_ENABLED } from '../config/features';

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
        ...(this.lastSyncCursor ? { since: this.lastSyncCursor } : {}),
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

      // Check if there's actually anything to sync before making the request
      const hasChanges = Object.values(syncRequest.tables).some(table => 
        table.upserts.length > 0 || table.deletes.length > 0
      );
      
      console.log('🔍 Sync request has changes:', hasChanges);
      
      // If no changes to push and no need to check for server changes, skip the sync call
      if (!hasChanges && this.lastSyncCursor) {
        console.log('📋 No local changes to sync and cursor exists, skipping sync call');
        // Just return empty response instead of making a network call
        return {
          success: true,
          tablesProcessed: SYNCABLE_TABLES.length,
          recordsPushed: 0,
          recordsPulled: 0,
          conflicts: 0,
          errors: []
        };
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
          // Remove local-only sync metadata before sending and convert field names
          const { dirty: _dirty, op: _op, syncedAt: _syncedAt, ownerId, updatedAt, version, 
                  exerciseType, defaultDuration, isFavorite, hasVideo, ...cleanRecord } = record as any;
          
          // Helper function to transform exercise type for database compatibility
          const transformExerciseType = (type: string): string => {
            switch (type) {
              case 'time-based':
                return 'TIME_BASED';
              case 'repetition-based':
                return 'REPETITION_BASED';
              default:
                return type;
            }
          };

          // Convert camelCase to snake_case for backend compatibility
          const backendRecord = {
            ...cleanRecord,
            owner_id: ownerId,
            updated_at: updatedAt,
            version: version || 1,
            // Exercise-specific field mappings
            ...(exerciseType && typeof exerciseType === 'string' ? { exercise_type: transformExerciseType(exerciseType) } : {}),
            ...(typeof defaultDuration === 'number' && { rep_duration_seconds: defaultDuration }),
            ...(typeof isFavorite === 'boolean' && { is_favorite: isFavorite }),
            ...((record as any).tags !== undefined && { 
              tags: Array.isArray((record as any).tags) 
                ? (record as any).tags  // Send as array, let Supabase handle JSONB conversion
                : typeof (record as any).tags === 'string' 
                  ? JSON.parse((record as any).tags)  // Parse string to array
                  : (record as any).tags
            }),
            // AppSettings field mappings
            ...(typeof (record as any).intervalDuration === 'number' && { interval_duration: (record as any).intervalDuration }),
            ...(typeof (record as any).soundEnabled === 'boolean' && { sound_enabled: (record as any).soundEnabled }),
            ...(typeof (record as any).beepVolume === 'number' && { beep_volume: (record as any).beepVolume }),
            ...(typeof (record as any).autoSave === 'boolean' && { auto_save: (record as any).autoSave }),
            ...((record as any).lastSelectedExerciseId !== undefined && { last_selected_exercise_id: (record as any).lastSelectedExerciseId }),
            ...(typeof (record as any).preTimerCountdown === 'number' && { pre_timer_countdown: (record as any).preTimerCountdown }),
            ...(typeof (record as any).repSpeedFactor === 'number' && { rep_speed_factor: (record as any).repSpeedFactor }),
            ...(typeof (record as any).showExerciseVideos === 'boolean' && { show_exercise_videos: (record as any).showExerciseVideos }),
            ...(typeof (record as any).defaultRestTime === 'number' && { default_rest_time: (record as any).defaultRestTime }),
            ...(typeof (record as any).autoStartNext === 'boolean' && { auto_start_next: (record as any).autoStartNext }),
            ...(typeof (record as any).reduceMotion === 'boolean' && { reduce_motion: (record as any).reduceMotion }),
            // UserPreferences field mappings
            ...(typeof (record as any).defaultIntervalDuration === 'number' && { default_interval_duration: (record as any).defaultIntervalDuration }),
            ...(typeof (record as any).darkMode === 'boolean' && { dark_mode: (record as any).darkMode }),
            ...(Array.isArray((record as any).favoriteExercises) && { favorite_exercises: (record as any).favoriteExercises }),
            // Note: hasVideo doesn't exist in database schema, so we skip it
          };
          
          // Debug logging for transformation
          if (process.env.NODE_ENV === 'development' && tableName === 'exercises' && upserts.length === 0) {
            console.log(`🔄 Field transformation for ${tableName}:`, {
              original: { exerciseType, defaultDuration, isFavorite, hasVideo },
              transformed: { 
                exercise_type: backendRecord.exercise_type,
                rep_duration_seconds: backendRecord.rep_duration_seconds,
                is_favorite: backendRecord.is_favorite
              },
              fullRecord: JSON.stringify(backendRecord, null, 2)
            });
          }
          
          upserts.push(backendRecord);
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

    try {
      // Try using supabase.functions.invoke first
      console.log('🔄 Making sync request via supabase.functions.invoke...');
      const { data, error } = await supabase.functions.invoke('sync', {
        body: syncRequest,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('🔍 Supabase invoke response:', { data: !!data, error: !!error });
      
      if (error) {
        console.error('🔴 Supabase invoke error:', error);
        
        // Check if this is an empty body error by examining the response
        if (error && typeof error === 'object' && 'context' in error) {
          const response = (error as any).context;
          if (response && response.text && typeof response.text === 'function') {
            try {
              const responseText = await response.text();
              if (responseText.includes('Empty request body') || responseText.includes('Invalid JSON in request body')) {
                console.log('🔄 Detected empty body error, retrying with direct fetch...');
                return await this.callSyncEndpointDirectFetch(syncRequest, accessToken);
              }
            } catch (textError) {
              console.error('🔴 Error reading response text for fallback check:', textError);
            }
          }
        }
        
        // Also trigger fallback for generic Edge Function errors that might be related
        if (error.message?.includes('Edge Function returned a non-2xx status code')) {
          console.log('🔄 Edge Function error detected, trying direct fetch as fallback...');
          return await this.callSyncEndpointDirectFetch(syncRequest, accessToken);
        }
      }

      if (data) {
        console.log('🔍 Sync response received:', {
          hasCursor: !!data.cursor,
          tablesInResponse: Object.keys(data.changes || {}),
          changesCounts: Object.entries(data.changes || {}).map(([table, changes]) => 
            `${table}: ${(changes as any).upserts?.length || 0} upserts, ${(changes as any).deletes?.length || 0} deletes`
          )
        });
      }

      if (error) {
        console.error('🔴 Sync endpoint error details:', error);
        throw new Error(`Sync endpoint error: ${error.message}`);
      }

      return data as SyncResponse;
    } catch (invokeError) {
      console.error('🔴 Exception during supabase.functions.invoke:', invokeError);
      throw invokeError;
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
    
    try {
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Client-Info': 'repcue-frontend@1.0.0'
        },
        body: requestBody
      });
      
      console.log('🔍 Direct fetch response status:', response.status);
      console.log('🔍 Direct fetch response headers:', Object.fromEntries(response.headers.entries()));
      
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
          // Helper function to transform exercise type from database to client format
          const transformExerciseTypeFromServer = (type: string): string => {
            switch (type) {
              case 'TIME_BASED':
                return 'time-based';
              case 'REPETITION_BASED':
                return 'repetition-based';
              default:
                return type;
            }
          };

          // Convert server record from snake_case to camelCase
          const { 
            owner_id, updated_at, exercise_type, rep_duration_seconds, is_favorite, tags,
            // AppSettings fields
            interval_duration, sound_enabled, beep_volume, auto_save, last_selected_exercise_id,
            pre_timer_countdown, rep_speed_factor, show_exercise_videos, default_rest_time,
            auto_start_next, reduce_motion,
            // UserPreferences fields
            default_interval_duration, dark_mode, favorite_exercises,
            ...rest 
          } = serverRecord;
          
          const clientRecord = {
            ...rest,
            ownerId: owner_id,
            updatedAt: updated_at,
            // Exercise-specific field mappings
            ...(exercise_type && typeof exercise_type === 'string' ? { exerciseType: transformExerciseTypeFromServer(exercise_type) } : {}),
            ...(typeof rep_duration_seconds === 'number' && { defaultDuration: rep_duration_seconds }),
            ...(typeof is_favorite === 'boolean' && { isFavorite: is_favorite }),
            ...(tags ? { tags: typeof tags === 'string' ? JSON.parse(tags) : tags } : {}),
            // AppSettings field mappings
            ...(typeof interval_duration === 'number' && { intervalDuration: interval_duration }),
            ...(typeof sound_enabled === 'boolean' && { soundEnabled: sound_enabled }),
            ...(typeof beep_volume === 'number' && { beepVolume: beep_volume }),
            ...(typeof auto_save === 'boolean' && { autoSave: auto_save }),
            ...(last_selected_exercise_id !== undefined && { lastSelectedExerciseId: last_selected_exercise_id }),
            ...(typeof pre_timer_countdown === 'number' && { preTimerCountdown: pre_timer_countdown }),
            ...(typeof rep_speed_factor === 'number' && { repSpeedFactor: rep_speed_factor }),
            ...(typeof show_exercise_videos === 'boolean' && { showExerciseVideos: show_exercise_videos }),
            ...(typeof default_rest_time === 'number' && { defaultRestTime: default_rest_time }),
            ...(typeof auto_start_next === 'boolean' && { autoStartNext: auto_start_next }),
            ...(typeof reduce_motion === 'boolean' && { reduceMotion: reduce_motion }),
            // UserPreferences field mappings
            ...(typeof default_interval_duration === 'number' && { defaultIntervalDuration: default_interval_duration }),
            ...(typeof dark_mode === 'boolean' && { darkMode: dark_mode }),
            ...(Array.isArray(favorite_exercises) && { favoriteExercises: favorite_exercises }),
          };
          
          // Get local record to check for conflicts
          const localRecord = await typedTable.get(serverRecord.id as string);
          
          if (localRecord) {
            // Handle conflict resolution
            const resolvedRecord = await this.resolveConflict(tableName, localRecord, clientRecord);
            
            // Apply resolved record with sync metadata
            await typedTable.put({
              ...resolvedRecord,
              dirty: 0,
              op: undefined,
              syncedAt: new Date().toISOString()
            });
          } else {
            // No local record - apply server record directly
            await typedTable.put({
              ...clientRecord,
              dirty: 0,
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
          dirty: 0,
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
            equals: (value: number) => {
              modify: (changes: Record<string, unknown>) => Promise<void>;
            };
          };
        }).where('dirty').equals(1).modify({
          dirty: 0,
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
    const localUpdatedAt = new Date(localRecord.updatedAt as string || 0);
    const serverUpdatedAt = new Date(serverRecord.updatedAt as string || 0);
    
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