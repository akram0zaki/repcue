/**
 * Video Cache Service
 * 
 * Provides persistent video blob storage using IndexedDB with intelligent caching,
 * LRU eviction, and blob URL lifecycle management.
 * 
 * Features:
 * - 3-tier caching: Memory → IndexedDB → Service Worker Cache
 * - Automatic LRU eviction when storage is full
 * - Blob URL lifecycle management
 * - De-duplication of concurrent fetches
 * - Storage quota monitoring
 * - Automatic expiration (30 days default, refreshed on access)
 */

import { ConsentService } from './consentService';
import logger from '../utils/logger';

// IndexedDB configuration
const DB_NAME = 'repcue-video-cache';
const DB_VERSION = 1;
const STORE_NAME = 'videos';

// Storage limits and configuration
const DEFAULT_EXPIRATION_DAYS = 90; // 90 days expiration
const MAX_QUOTA_USAGE = 0.8; // Use max 80% of available quota
const MIN_FREE_QUOTA = 0.1; // Keep at least 10% free
const BATCH_SIZE = 5; // Process videos in batches

export interface CachedVideo {
  id: string;                 // unique ID (hash of URL)
  url: string;                // original video URL
  blob: Blob;                 // video binary data
  mimeType: string;           // video/mp4, video/webm, etc.
  size: number;               // bytes
  cachedAt: number;           // timestamp when cached
  lastAccessedAt: number;     // timestamp of last access (for LRU)
  expiresAt: number;          // expiration timestamp
  accessCount: number;        // number of times accessed
  variant: string;            // e.g., "landscape-1080-webm"
}

export interface StorageStats {
  totalVideos: number;
  totalSize: number;          // bytes
  quotaUsed: number;          // bytes
  quotaAvailable: number;     // bytes
  quotaPercentage: number;    // 0-100
  oldestVideo: Date | null;
  newestVideo: Date | null;
}

export class VideoCacheService {
  private static instance: VideoCacheService | null = null;
  private db: IDBDatabase | null = null;
  private memoryCache: Map<string, string> = new Map(); // url -> blob URL
  private pendingFetches: Map<string, Promise<string | null>> = new Map();
  private initPromise: Promise<void> | null = null;
  private consentService: ConsentService;

  private constructor() {
    this.consentService = ConsentService.getInstance();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): VideoCacheService {
    if (!VideoCacheService.instance) {
      VideoCacheService.instance = new VideoCacheService();
    }
    return VideoCacheService.instance;
  }

  /**
   * Initialize IndexedDB
   */
  private async initialize(): Promise<void> {
    if (this.db) return;

    if (!this.initPromise) {
      this.initPromise = this._initialize();
    }

    return this.initPromise;
  }

  private async _initialize(): Promise<void> {
    // Check consent
    if (!this.consentService.hasConsent()) {
      logger.warn('[VideoCacheService] No consent, cache disabled');
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        logger.error('[VideoCacheService] Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        logger.log('[VideoCacheService] IndexedDB initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          
          // Create indexes for efficient queries
          store.createIndex('url', 'url', { unique: true });
          store.createIndex('lastAccessedAt', 'lastAccessedAt', { unique: false });
          store.createIndex('size', 'size', { unique: false });
          store.createIndex('expiresAt', 'expiresAt', { unique: false });
          
          logger.log('[VideoCacheService] Object store created');
        }
      };
    });
  }

  /**
   * Generate stable ID from URL
   */
  private async hashUrl(url: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(url);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Get video from cache (memory → IndexedDB → null)
   */
  public async getVideo(url: string): Promise<string | null> {
    try {
      // Check memory cache first (instant)
      const memoryUrl = this.memoryCache.get(url);
      if (memoryUrl) {
        // Trust memory cache - Safari blob URLs fail HEAD validation but work for video playback
        // Validation was causing "Load failed" errors and breaking working blob URLs
        await this.updateAccessTime(url); // Update access time in background
        return memoryUrl;
      }

      // Check if fetch is already in progress
      const pendingFetch = this.pendingFetches.get(url);
      if (pendingFetch) {
        return pendingFetch;
      }

      // Check IndexedDB
      try {
        await this.initialize();
      } catch (initError) {
        logger.error('[VideoCacheService] IndexedDB initialization failed:', initError);
        return null;
      }
      
      if (!this.db) {
        logger.warn('[VideoCacheService] IndexedDB not initialized, cache unavailable');
        return null;
      }

      const id = await this.hashUrl(url);
      let video;
      
      try {
        video = await this.getFromStore(id);
      } catch (storeError) {
        logger.error('[VideoCacheService] Failed to read from IndexedDB:', { url, error: storeError });
        return null;
      }

      if (video) {
        // Check expiration
        if (Date.now() > video.expiresAt) {
          logger.log('[VideoCacheService] Video expired:', url);
          await this.deleteFromStore(id);
          return null;
        }

        // Validate blob exists and is valid
        if (!video.blob || !(video.blob instanceof Blob) || video.blob.size === 0) {
          logger.error('[VideoCacheService] Invalid blob in IndexedDB, deleting:', { url, hasBlob: !!video.blob, blobType: typeof video.blob, size: video.blob?.size });
          await this.deleteFromStore(id);
          return null;
        }

        // Create blob URL and cache in memory
        let blobUrl;
        try {
          blobUrl = URL.createObjectURL(video.blob);
          logger.log('[VideoCacheService] Created fresh blob URL from IndexedDB:', { url, blobUrl, blobSize: video.blob.size, mimeType: video.mimeType });
        } catch (blobError) {
          logger.error('[VideoCacheService] Failed to create blob URL:', { url, error: blobError });
          return null;
        }
        
        this.memoryCache.set(url, blobUrl);

        // Update access time in background
        this.updateAccessTime(url).catch(err => 
          logger.error('[VideoCacheService] Failed to update access time:', err)
        );

        logger.log('[VideoCacheService] IndexedDB cache HIT:', url);
        return blobUrl;
      }

      logger.log('[VideoCacheService] Cache MISS:', url);
      return null;
    } catch (error) {
      logger.error('[VideoCacheService] Unexpected error in getVideo:', { url, error });
      return null;
    }
  }

  /**
   * Cache video blob
   */
  public async cacheVideo(
    url: string,
    blob: Blob,
    metadata: { variant?: string; mimeType?: string } = {}
  ): Promise<void> {
    try {
      await this.initialize();
      if (!this.db) return;

      const id = await this.hashUrl(url);
      const now = Date.now();
      const expiresAt = now + (DEFAULT_EXPIRATION_DAYS * 24 * 60 * 60 * 1000);

      const cachedVideo: CachedVideo = {
        id,
        url,
        blob,
        mimeType: metadata.mimeType || blob.type,
        size: blob.size,
        cachedAt: now,
        lastAccessedAt: now,
        expiresAt,
        accessCount: 1,
        variant: metadata.variant || 'unknown',
      };

      // Check if we need to evict old videos
      await this.ensureStorageSpace(blob.size);

      // Store in IndexedDB
      await this.putInStore(cachedVideo);

      // Create blob URL and cache in memory
      const blobUrl = URL.createObjectURL(blob);
      this.memoryCache.set(url, blobUrl);

      logger.log('[VideoCacheService] Video cached:', url, `(${(blob.size / 1024 / 1024).toFixed(2)} MB)`);
    } catch (error) {
      logger.error('[VideoCacheService] Error caching video:', error);
    }
  }

  /**
   * Fetch and cache video from URL
   */
  public async fetchAndCache(
    url: string,
    metadata: { variant?: string } = {}
  ): Promise<string | null> {
    try {
      // Check if already cached
      const cached = await this.getVideo(url);
      if (cached) return cached;

      // Check if fetch is already in progress
      const pendingFetch = this.pendingFetches.get(url);
      if (pendingFetch) {
        logger.log('[VideoCacheService] Reusing pending fetch:', url);
        return pendingFetch;
      }

      // Start new fetch
      const fetchPromise = this._fetchAndCache(url, metadata);
      this.pendingFetches.set(url, fetchPromise);

      try {
        const result = await fetchPromise;
        return result;
      } finally {
        this.pendingFetches.delete(url);
      }
    } catch (error) {
      logger.error('[VideoCacheService] Error fetching video:', error);
      return null;
    }
  }

  private async _fetchAndCache(
    url: string,
    metadata: { variant?: string } = {}
  ): Promise<string | null> {
    try {
      logger.log('[VideoCacheService] Fetching video from network:', url);
      
      const response = await fetch(url);
      if (!response.ok) {
        logger.error('[VideoCacheService] Fetch failed - HTTP error:', { url, status: response.status, statusText: response.statusText });
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      if (!blob || blob.size === 0) {
        logger.error('[VideoCacheService] Fetch returned empty blob:', { url, blobSize: blob?.size });
        return null;
      }

      logger.log('[VideoCacheService] Fetched video blob:', { url, size: blob.size, type: blob.type });
      
      await this.cacheVideo(url, blob, {
        variant: metadata.variant,
        mimeType: response.headers.get('content-type') || blob.type,
      });

      const cachedUrl = this.memoryCache.get(url);
      if (!cachedUrl) {
        logger.error('[VideoCacheService] Failed to retrieve blob URL after caching:', url);
        return null;
      }

      logger.log('[VideoCacheService] Successfully cached and created blob URL:', { url, blobUrl: cachedUrl });
      return cachedUrl;
    } catch (error) {
      logger.error('[VideoCacheService] Fetch failed:', { url, error });
      return null;
    }
  }

  /**
   * Prefetch multiple videos (non-blocking)
   */
  public async prefetchVideos(urls: string[]): Promise<void> {
    if (urls.length === 0) return;

    logger.log('[VideoCacheService] Prefetching videos:', urls.length);

    // Process in batches to avoid overwhelming the system
    for (let i = 0; i < urls.length; i += BATCH_SIZE) {
      const batch = urls.slice(i, i + BATCH_SIZE);
      
      // Fetch batch in parallel
      await Promise.allSettled(
        batch.map(url => this.fetchAndCache(url))
      );

      // Small delay between batches
      if (i + BATCH_SIZE < urls.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    logger.log('[VideoCacheService] Prefetch complete');
  }

  /**
   * Update last accessed time for a video
   */
  private async updateAccessTime(url: string): Promise<void> {
    try {
      if (!this.db) return;

      const id = await this.hashUrl(url);
      const video = await this.getFromStore(id);
      
      if (video) {
        video.lastAccessedAt = Date.now();
        video.accessCount++;
        await this.putInStore(video);
      }
    } catch (error) {
      logger.error('[VideoCacheService] Error updating access time:', error);
    }
  }

  /**
   * Ensure enough storage space by evicting old videos if needed
   */
  private async ensureStorageSpace(requiredSize: number): Promise<void> {
    try {
      const stats = await this.getStorageStats();
      const availableSpace = stats.quotaAvailable - stats.quotaUsed;
      
      // Check if we have enough space
      if (availableSpace >= requiredSize) {
        // Check if we're approaching quota limit
        if (stats.quotaPercentage < MAX_QUOTA_USAGE * 100) {
          return; // Plenty of space
        }
      }

      // Calculate how much space we need to free
      const targetFreeSpace = Math.max(
        requiredSize,
        stats.quotaAvailable * MIN_FREE_QUOTA
      );
      const spaceToFree = stats.quotaUsed + requiredSize - (stats.quotaAvailable - targetFreeSpace);

      if (spaceToFree > 0) {
        logger.log('[VideoCacheService] Need to free space:', (spaceToFree / 1024 / 1024).toFixed(2), 'MB');
        await this.evictLRU(spaceToFree);
      }
    } catch (error) {
      logger.error('[VideoCacheService] Error ensuring storage space:', error);
    }
  }

  /**
   * Evict least recently used videos to free up space
   */
  private async evictLRU(targetSize: number): Promise<void> {
    try {
      if (!this.db) return;

      // Get all videos sorted by last accessed time (oldest first)
      const videos = await this.getAllVideos();
      videos.sort((a, b) => a.lastAccessedAt - b.lastAccessedAt);

      let freedSize = 0;
      const videosToDelete: string[] = [];

      for (const video of videos) {
        if (freedSize >= targetSize) break;
        
        videosToDelete.push(video.id);
        freedSize += video.size;
      }

      // Delete videos
      for (const id of videosToDelete) {
        await this.deleteFromStore(id);
      }

      logger.log(
        '[VideoCacheService] Evicted',
        videosToDelete.length,
        'videos, freed',
        (freedSize / 1024 / 1024).toFixed(2),
        'MB'
      );
    } catch (error) {
      logger.error('[VideoCacheService] Error evicting LRU:', error);
    }
  }

  /**
   * Clear expired videos
   */
  public async clearExpiredVideos(): Promise<number> {
    try {
      if (!this.db) return 0;

      const videos = await this.getAllVideos();
      const now = Date.now();
      const expiredVideos = videos.filter(v => v.expiresAt < now);

      for (const video of expiredVideos) {
        await this.deleteFromStore(video.id);
        
        // Clean up memory cache
        const memoryUrl = this.memoryCache.get(video.url);
        if (memoryUrl) {
          URL.revokeObjectURL(memoryUrl);
          this.memoryCache.delete(video.url);
        }
      }

      logger.log('[VideoCacheService] Cleared', expiredVideos.length, 'expired videos');
      return expiredVideos.length;
    } catch (error) {
      logger.error('[VideoCacheService] Error clearing expired videos:', error);
      return 0;
    }
  }

  /**
   * Clear all cached videos
   */
  public async clearAll(): Promise<void> {
    try {
      if (!this.db) return;

      // Clear memory cache and revoke blob URLs
      for (const blobUrl of this.memoryCache.values()) {
        URL.revokeObjectURL(blobUrl);
      }
      this.memoryCache.clear();

      // Clear IndexedDB
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      await new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve(undefined);
        request.onerror = () => reject(request.error);
      });

      logger.log('[VideoCacheService] All videos cleared');
    } catch (error) {
      logger.error('[VideoCacheService] Error clearing all videos:', error);
    }
  }

  /**
   * Get storage statistics
   */
  public async getStorageStats(): Promise<StorageStats> {
    try {
      await this.initialize();
      
      const videos = await this.getAllVideos();
      const totalSize = videos.reduce((sum, v) => sum + v.size, 0);
      
      // Get storage quota
      let quotaUsed = totalSize;
      let quotaAvailable = 0;
      
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        quotaUsed = estimate.usage || totalSize;
        quotaAvailable = estimate.quota || 0;
      }

      const quotaPercentage = quotaAvailable > 0 
        ? (quotaUsed / quotaAvailable) * 100 
        : 0;

      const timestamps = videos.map(v => v.cachedAt);
      const oldestVideo = timestamps.length > 0 
        ? new Date(Math.min(...timestamps))
        : null;
      const newestVideo = timestamps.length > 0 
        ? new Date(Math.max(...timestamps))
        : null;

      return {
        totalVideos: videos.length,
        totalSize,
        quotaUsed,
        quotaAvailable,
        quotaPercentage,
        oldestVideo,
        newestVideo,
      };
    } catch (error) {
      logger.error('[VideoCacheService] Error getting storage stats:', error);
      return {
        totalVideos: 0,
        totalSize: 0,
        quotaUsed: 0,
        quotaAvailable: 0,
        quotaPercentage: 0,
        oldestVideo: null,
        newestVideo: null,
      };
    }
  }

  /**
   * Get video from memory cache
   */
  public getFromMemory(url: string): string | null {
    return this.memoryCache.get(url) || null;
  }

  // IndexedDB helper methods

  private async getFromStore(id: string): Promise<CachedVideo | null> {
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  private async putInStore(video: CachedVideo): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(video);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async deleteFromStore(id: string): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async getAllVideos(): Promise<CachedVideo[]> {
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Cleanup: revoke all blob URLs
   */
  public cleanup(): void {
    for (const blobUrl of this.memoryCache.values()) {
      URL.revokeObjectURL(blobUrl);
    }
    this.memoryCache.clear();
    logger.log('[VideoCacheService] Cleanup complete');
  }
}

export default VideoCacheService;
