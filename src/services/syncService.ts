import { QueueService, type QueueOperation } from './queueService';
import { StorageService } from './storageService';
import { ConsentService } from './consentService';
import type { Exercise, ActivityLog, AppSettings } from '../types';

export interface SyncResult {
  success: boolean;
  processedOperations: number;
  failedOperations: number;
  errors: string[];
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncAttempt?: number;
  lastSuccessfulSync?: number;
  pendingOperations: number;
  errors: string[];
}

export class SyncService {
  private static instance: SyncService;
  private queueService: QueueService;
  private storageService: StorageService;
  private consentService: ConsentService;
  private isOnline: boolean = navigator.onLine;
  private isSyncing: boolean = false;
  private syncInProgress: Promise<SyncResult> | null = null;
  private lastSyncAttempt?: number;
  private lastSuccessfulSync?: number;
  private syncErrors: string[] = [];
  private listeners: ((status: SyncStatus) => void)[] = [];

  private constructor() {
    this.queueService = QueueService.getInstance();
    this.storageService = StorageService.getInstance();
    this.consentService = ConsentService.getInstance();

    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));

    // Register service worker for background sync if available
    this.registerBackgroundSync();
  }

  public static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  /**
   * Register service worker background sync
   */
  private async registerBackgroundSync(): Promise<void> {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        console.log('🔄 Background sync capability detected');
        
        // Register for background sync event (requires proper service worker setup)
        if ('sync' in registration && (registration as ServiceWorkerRegistration & { sync?: { register: (tag: string) => Promise<void> } }).sync) {
          await (registration as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register('background-sync');
          console.log('📱 Background sync registered');
        }
      } catch (error) {
        console.warn('Background sync registration failed:', error);
      }
    } else {
      console.log('📱 Background sync not supported, using manual sync');
    }
  }

  /**
   * Handle coming online
   */
  private async handleOnline(): Promise<void> {
    console.log('🌐 Device came online');
    this.isOnline = true;
    this.notifyListeners();

    // Automatically sync when coming online
    await this.sync();
  }

  /**
   * Handle going offline
   */
  private handleOffline(): void {
    console.log('📴 Device went offline');
    this.isOnline = false;
    this.notifyListeners();
  }

  /**
   * Add operation to sync queue
   */
  async queueOperation(
    type: QueueOperation['type'],
    endpoint: string,
  data?: unknown,
    options?: {
      priority?: 'high' | 'medium' | 'low';
      maxRetries?: number;
      metadata?: QueueOperation['metadata'];
    }
  ): Promise<number> {
    const operation: Omit<QueueOperation, 'id' | 'timestamp' | 'retryCount' | 'nextRetryAt' | 'maxRetries'> & { maxRetries?: number } = {
      type,
      endpoint,
      data,
      priority: options?.priority || 'medium',
      maxRetries: options?.maxRetries,
      metadata: options?.metadata
    };

    const operationId = await this.queueService.enqueue(operation);
    console.log(`📋 Operation queued for sync: ${type} ${endpoint}`, { operationId });

    this.notifyListeners();

    // Try immediate sync if online
    if (this.isOnline && !this.isSyncing) {
      this.sync().catch(error => {
        console.warn('Immediate sync failed:', error);
      });
    }

    return operationId;
  }

  /**
   * Process sync operations
   */
  async sync(force: boolean = false): Promise<SyncResult> {
    if (!this.consentService.hasConsent()) {
      console.log('🚫 Sync skipped: no storage consent');
      return {
        success: true,
        processedOperations: 0,
        failedOperations: 0,
        errors: []
      };
    }

    if (this.isSyncing && !force) {
      console.log('🔄 Sync already in progress, returning existing promise');
      return this.syncInProgress || this.createEmptyResult();
    }

    if (!this.isOnline) {
      console.log('📴 Sync skipped: device offline');
      return this.createEmptyResult(['Device is offline']);
    }

    this.isSyncing = true;
    this.lastSyncAttempt = Date.now();
    this.syncErrors = [];
    this.notifyListeners();

    try {
      console.log('🔄 Starting sync process...');
      
      const result = await this.processSyncQueue();
      
      if (result.success && result.failedOperations === 0) {
        this.lastSuccessfulSync = Date.now();
        console.log(`✅ Sync completed successfully: ${result.processedOperations} operations processed`);
      } else {
        console.warn(`⚠️ Sync completed with issues: ${result.processedOperations} processed, ${result.failedOperations} failed`);
        this.syncErrors = result.errors;
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
      console.error('❌ Sync failed:', errorMessage);
      this.syncErrors = [errorMessage];
      
      return {
        success: false,
        processedOperations: 0,
        failedOperations: 0,
        errors: [errorMessage]
      };
    } finally {
      this.isSyncing = false;
      this.syncInProgress = null;
      this.notifyListeners();
    }
  }

  /**
   * Process the sync queue
   */
  private async processSyncQueue(): Promise<SyncResult> {
    const operations = await this.queueService.getNextOperations(50); // Process in batches
    
    if (operations.length === 0) {
      return {
        success: true,
        processedOperations: 0,
        failedOperations: 0,
        errors: []
      };
    }

    console.log(`📊 Processing ${operations.length} queued operations`);

    let processedOperations = 0;
    let failedOperations = 0;
    const errors: string[] = [];

    for (const operation of operations) {
      try {
        const result = await this.processOperation(operation);
        
        if (result.success) {
          await this.queueService.markSuccess(operation.id!);
          processedOperations++;
          console.log(`✅ Operation ${operation.id} processed successfully`);
        } else {
          await this.queueService.markFailure(operation.id!, result.error || 'Operation processing failed');
          failedOperations++;
          errors.push(`Operation ${operation.id} failed: ${result.error || 'Unknown error'}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await this.queueService.markFailure(operation.id!, errorMessage);
        failedOperations++;
        errors.push(`Operation ${operation.id} error: ${errorMessage}`);
        console.error(`❌ Operation ${operation.id} failed:`, errorMessage);
      }

      // Add small delay between operations to prevent overwhelming
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return {
      success: failedOperations === 0,
      processedOperations,
      failedOperations,
      errors
    };
  }

  /**
   * Process individual operation
   */
  private async processOperation(operation: QueueOperation): Promise<{ success: boolean; error?: string }> {
    console.log(`🔄 Processing operation: ${operation.type} ${operation.endpoint}`, operation.data);

    try {
      let success: boolean;
      switch (operation.type) {
        case 'POST':
          success = await this.handlePostOperation(operation);
          break;
        case 'PUT':
          success = await this.handlePutOperation(operation);
          break;
        case 'DELETE':
          success = await this.handleDeleteOperation(operation);
          break;
        default:
          console.warn(`Unknown operation type: ${operation.type}`);
          return { success: false, error: `Unknown operation type: ${operation.type}` };
      }
      return { success };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Operation processing error:`, error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Handle POST operations (create new items)
   */
  private async handlePostOperation(operation: QueueOperation): Promise<boolean> {
    const { endpoint, data, metadata } = operation;

    switch (metadata?.entityType) {
      case 'exercise':
        if (endpoint === '/api/exercises' && data) {
          await this.storageService.saveExercise(data as Exercise);
          return true;
        }
        break;

      case 'activityLog':
        if (endpoint === '/api/activity-logs' && data) {
          await this.storageService.saveActivityLog(data as ActivityLog);
          return true;
        }
        break;

      default:
        console.warn(`Unhandled POST operation for ${metadata?.entityType}`);
    }

    return false;
  }

  /**
   * Handle PUT operations (update existing items)
   */
  private async handlePutOperation(operation: QueueOperation): Promise<boolean> {
    const { endpoint, data, metadata } = operation;

    switch (metadata?.entityType) {
      case 'exercise':
        if (endpoint.startsWith('/api/exercises/') && data) {
          await this.storageService.saveExercise(data as Exercise);
          return true;
        }
        break;

      case 'activityLog':
        if (endpoint.startsWith('/api/activity-logs/') && data) {
          await this.storageService.saveActivityLog(data as ActivityLog);
          return true;
        }
        break;

      case 'settings':
        if (endpoint === '/api/settings' && data) {
          await this.storageService.saveAppSettings(data as AppSettings);
          return true;
        }
        break;

      default:
        console.warn(`Unhandled PUT operation for ${metadata?.entityType}`);
    }

    return false;
  }

  /**
   * Handle DELETE operations (remove items)
   */
  private async handleDeleteOperation(operation: QueueOperation): Promise<boolean> {
    const { endpoint, metadata } = operation;

    switch (metadata?.entityType) {
      case 'exercise':
        if (endpoint.startsWith('/api/exercises/') && metadata.entityId) {
          await this.storageService.deleteExercise(metadata.entityId);
          return true;
        }
        break;

      case 'activityLog':
        if (endpoint.startsWith('/api/activity-logs/') && metadata.entityId) {
          await this.storageService.deleteActivityLog(metadata.entityId);
          return true;
        }
        break;

      default:
        console.warn(`Unhandled DELETE operation for ${metadata?.entityType}`);
    }

    return false;
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
      pendingOperations: 0, // Will be updated by listeners
      errors: this.syncErrors
    };
  }

  /**
   * Add status change listener
   */
  addStatusListener(listener: (status: SyncStatus) => void): () => void {
    this.listeners.push(listener);
    
    // Immediately call listener with current status
    this.updateAndNotifyStatus(listener);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Update status with current pending operations and notify listener
   */
  private async updateAndNotifyStatus(listener: (status: SyncStatus) => void): Promise<void> {
    try {
      const stats = await this.queueService.getStats();
      const status = {
        ...this.getSyncStatus(),
        pendingOperations: stats.pendingOperations
      };
      listener(status);
    } catch (error) {
      console.error('Failed to update sync status:', error);
      listener(this.getSyncStatus());
    }
  }

  /**
   * Notify all status listeners
   */
  private async notifyListeners(): Promise<void> {
    for (const listener of this.listeners) {
      await this.updateAndNotifyStatus(listener);
    }
  }

  /**
   * Clear all sync data
   */
  async clearSyncData(): Promise<void> {
    await this.queueService.clear();
    this.lastSyncAttempt = undefined;
    this.lastSuccessfulSync = undefined;
    this.syncErrors = [];
    this.notifyListeners();
    console.log('🧹 Sync data cleared');
  }

  /**
   * Force immediate sync
   */
  async forcSync(): Promise<SyncResult> {
    return this.sync(true);
  }

  /**
   * Get next retry time for pending operations
   */
  async getNextRetryTime(): Promise<number | null> {
    return this.queueService.getNextRetryTime();
  }

  /**
   * Helper to create empty result
   */
  private createEmptyResult(errors: string[] = []): SyncResult {
    return {
      success: errors.length === 0,
      processedOperations: 0,
      failedOperations: 0,
      errors
    };
  }
}

// Export singleton instance
export const syncService = SyncService.getInstance();
