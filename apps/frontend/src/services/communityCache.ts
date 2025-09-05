/**
 * Community Content Caching Service
 * Provides local caching for community exercises and workouts to improve performance
 */
import type { Exercise, Workout } from '../types';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expires: number;
}

interface CacheStats {
  hitCount: number;
  missCount: number;
  evictionCount: number;
}

export class CommunityCacheService {
  private static instance: CommunityCacheService;
  private exerciseCache = new Map<string, CacheEntry<Exercise>>();
  private workoutCache = new Map<string, CacheEntry<Workout>>();
  private exerciseListCache = new Map<string, CacheEntry<Exercise[]>>();
  private workoutListCache = new Map<string, CacheEntry<Workout[]>>();
  private stats: CacheStats = { hitCount: 0, missCount: 0, evictionCount: 0 };

  // Cache configuration
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly LIST_TTL = 2 * 60 * 1000; // 2 minutes for lists (they change more frequently)
  private readonly MAX_CACHE_SIZE = 1000; // Maximum entries per cache
  
  private constructor() {
    // Clean up expired entries periodically
    setInterval(() => this.cleanupExpired(), 60 * 1000); // Every minute
  }

  public static getInstance(): CommunityCacheService {
    if (!CommunityCacheService.instance) {
      CommunityCacheService.instance = new CommunityCacheService();
    }
    return CommunityCacheService.instance;
  }

  /**
   * Cache a single exercise
   */
  public cacheExercise(exercise: Exercise, ttl = this.DEFAULT_TTL): void {
    if (this.exerciseCache.size >= this.MAX_CACHE_SIZE) {
      this.evictOldest(this.exerciseCache);
    }
    
    this.exerciseCache.set(exercise.id, {
      data: exercise,
      timestamp: Date.now(),
      expires: Date.now() + ttl
    });
  }

  /**
   * Get a cached exercise
   */
  public getCachedExercise(exerciseId: string): Exercise | null {
    const entry = this.exerciseCache.get(exerciseId);
    
    if (!entry) {
      this.stats.missCount++;
      return null;
    }
    
    if (entry.expires < Date.now()) {
      this.exerciseCache.delete(exerciseId);
      this.stats.missCount++;
      return null;
    }
    
    this.stats.hitCount++;
    return entry.data;
  }

  /**
   * Cache a single workout
   */
  public cacheWorkout(workout: Workout, ttl = this.DEFAULT_TTL): void {
    if (this.workoutCache.size >= this.MAX_CACHE_SIZE) {
      this.evictOldest(this.workoutCache);
    }
    
    this.workoutCache.set(workout.id, {
      data: workout,
      timestamp: Date.now(),
      expires: Date.now() + ttl
    });
  }

  /**
   * Get a cached workout
   */
  public getCachedWorkout(workoutId: string): Workout | null {
    const entry = this.workoutCache.get(workoutId);
    
    if (!entry) {
      this.stats.missCount++;
      return null;
    }
    
    if (entry.expires < Date.now()) {
      this.workoutCache.delete(workoutId);
      this.stats.missCount++;
      return null;
    }
    
    this.stats.hitCount++;
    return entry.data;
  }

  /**
   * Cache a list of exercises with a query key
   */
  public cacheExerciseList(queryKey: string, exercises: Exercise[], ttl = this.LIST_TTL): void {
    if (this.exerciseListCache.size >= this.MAX_CACHE_SIZE) {
      this.evictOldest(this.exerciseListCache);
    }
    
    // Also cache individual exercises
    exercises.forEach(exercise => this.cacheExercise(exercise, ttl));
    
    this.exerciseListCache.set(queryKey, {
      data: exercises,
      timestamp: Date.now(),
      expires: Date.now() + ttl
    });
  }

  /**
   * Get a cached exercise list
   */
  public getCachedExerciseList(queryKey: string): Exercise[] | null {
    const entry = this.exerciseListCache.get(queryKey);
    
    if (!entry) {
      this.stats.missCount++;
      return null;
    }
    
    if (entry.expires < Date.now()) {
      this.exerciseListCache.delete(queryKey);
      this.stats.missCount++;
      return null;
    }
    
    this.stats.hitCount++;
    return entry.data;
  }

  /**
   * Cache a list of workouts with a query key
   */
  public cacheWorkoutList(queryKey: string, workouts: Workout[], ttl = this.LIST_TTL): void {
    if (this.workoutListCache.size >= this.MAX_CACHE_SIZE) {
      this.evictOldest(this.workoutListCache);
    }
    
    // Also cache individual workouts
    workouts.forEach(workout => this.cacheWorkout(workout, ttl));
    
    this.workoutListCache.set(queryKey, {
      data: workouts,
      timestamp: Date.now(),
      expires: Date.now() + ttl
    });
  }

  /**
   * Get a cached workout list
   */
  public getCachedWorkoutList(queryKey: string): Workout[] | null {
    const entry = this.workoutListCache.get(queryKey);
    
    if (!entry) {
      this.stats.missCount++;
      return null;
    }
    
    if (entry.expires < Date.now()) {
      this.workoutListCache.delete(queryKey);
      this.stats.missCount++;
      return null;
    }
    
    this.stats.hitCount++;
    return entry.data;
  }

  /**
   * Generate a cache key for community queries
   */
  public generateQueryKey(params: {
    type?: 'exercises' | 'workouts' | 'all';
    category?: string;
    difficulty?: string;
    sortBy?: string;
    searchQuery?: string;
    limit?: number;
    offset?: number;
  }): string {
    const keyParts = [
      params.type || 'all',
      params.category || 'all',
      params.difficulty || 'all',
      params.sortBy || 'recent',
      params.searchQuery ? `q:${params.searchQuery}` : '',
      params.limit ? `limit:${params.limit}` : '',
      params.offset ? `offset:${params.offset}` : ''
    ].filter(Boolean);
    
    return `community:${keyParts.join('|')}`;
  }

  /**
   * Invalidate cache entries related to a specific exercise
   */
  public invalidateExercise(exerciseId: string): void {
    this.exerciseCache.delete(exerciseId);
    
    // Also invalidate related list caches
    for (const [key] of this.exerciseListCache) {
      this.exerciseListCache.delete(key);
    }
    
    console.log(`Cache invalidated for exercise ${exerciseId}`);
  }

  /**
   * Invalidate cache entries related to a specific workout
   */
  public invalidateWorkout(workoutId: string): void {
    this.workoutCache.delete(workoutId);
    
    // Also invalidate related list caches
    for (const [key] of this.workoutListCache) {
      this.workoutListCache.delete(key);
    }
    
    console.log(`Cache invalidated for workout ${workoutId}`);
  }

  /**
   * Invalidate all community content caches
   */
  public invalidateAll(): void {
    this.exerciseCache.clear();
    this.workoutCache.clear();
    this.exerciseListCache.clear();
    this.workoutListCache.clear();
    
    console.log('All community caches invalidated');
  }

  /**
   * Get cache statistics
   */
  public getStats(): CacheStats & { 
    totalEntries: number;
    cacheSize: { exercises: number; workouts: number; exerciseLists: number; workoutLists: number }
  } {
    return {
      ...this.stats,
      totalEntries: this.exerciseCache.size + this.workoutCache.size + 
                    this.exerciseListCache.size + this.workoutListCache.size,
      cacheSize: {
        exercises: this.exerciseCache.size,
        workouts: this.workoutCache.size,
        exerciseLists: this.exerciseListCache.size,
        workoutLists: this.workoutListCache.size
      }
    };
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupExpired(): void {
    const now = Date.now();
    let cleanupCount = 0;

    // Clean exercises
    for (const [key, entry] of this.exerciseCache) {
      if (entry.expires < now) {
        this.exerciseCache.delete(key);
        cleanupCount++;
      }
    }

    // Clean workouts
    for (const [key, entry] of this.workoutCache) {
      if (entry.expires < now) {
        this.workoutCache.delete(key);
        cleanupCount++;
      }
    }

    // Clean exercise lists
    for (const [key, entry] of this.exerciseListCache) {
      if (entry.expires < now) {
        this.exerciseListCache.delete(key);
        cleanupCount++;
      }
    }

    // Clean workout lists
    for (const [key, entry] of this.workoutListCache) {
      if (entry.expires < now) {
        this.workoutListCache.delete(key);
        cleanupCount++;
      }
    }

    if (cleanupCount > 0) {
      console.log(`🧹 Cleaned up ${cleanupCount} expired cache entries`);
    }
  }

  /**
   * Evict oldest entries when cache is full
   */
  private evictOldest<T>(cache: Map<string, CacheEntry<T>>): void {
    let oldestKey: string | null = null;
    let oldestTime = Number.MAX_SAFE_INTEGER;

    for (const [key, entry] of cache) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      cache.delete(oldestKey);
      this.stats.evictionCount++;
    }
  }

  /**
   * Preload popular content into cache
   */
  public async preloadPopularContent(): Promise<void> {
    try {
      // This would typically make API calls to load popular exercises/workouts
      console.log('📦 Preloading popular community content...');
      
      // For now, just log that preloading is available
      // In a real implementation, this would fetch popular content from the server
      console.log('✅ Community content preloading ready');
    } catch (error) {
      console.error('Failed to preload community content:', error);
    }
  }
}

// Export singleton instance
export const communityCacheService = CommunityCacheService.getInstance();