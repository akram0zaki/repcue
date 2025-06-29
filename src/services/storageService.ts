import Dexie from 'dexie';
import type { Table } from 'dexie';
import type { Exercise, ActivityLog, UserPreferences, AppSettings } from '../types';
import { consentService } from './consentService';

// Database schema interfaces
interface StoredActivityLog extends Omit<ActivityLog, 'timestamp'> {
  timestamp: string; // ISO string for IndexedDB storage
}

interface StoredUserPreferences extends UserPreferences {
  id?: number;
  updatedAt: string;
}

interface StoredAppSettings extends AppSettings {
  id?: number;
  updatedAt: string;
}

interface StoredExercise extends Exercise {
  updatedAt: string;
}



/**
 * IndexedDB-based storage service using Dexie
 * Handles all persistent data storage with consent checking
 */
class RepCueDatabase extends Dexie {
  exercises!: Table<StoredExercise>;
  activityLogs!: Table<StoredActivityLog>;
  userPreferences!: Table<StoredUserPreferences>;
  appSettings!: Table<StoredAppSettings>;

  constructor() {
    super('RepCueDB');
    
    this.version(1).stores({
      exercises: 'id, name, category, isFavorite, updatedAt',
      activityLogs: '++id, exerciseId, timestamp, duration',
      userPreferences: '++id, updatedAt',
      appSettings: '++id, updatedAt'
    });
  }
}

export class StorageService {
  private static instance: StorageService;
  private db: RepCueDatabase;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private fallbackStorage = new Map<string, any>();

  private constructor() {
    this.db = new RepCueDatabase();
    this.initializeDatabase();
  }

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  /**
   * Initialize database and handle errors gracefully
   */
  private async initializeDatabase(): Promise<void> {
    try {
      await this.db.open();
    } catch (error) {
      console.warn('IndexedDB not available, falling back to memory storage:', error);
    }
  }

  /**
   * Check if we can store data (consent required)
   */
  private canStoreData(): boolean {
    return consentService.hasConsent();
  }

  /**
   * Store exercise data
   */
  public async saveExercise(exercise: Exercise): Promise<void> {
    if (!this.canStoreData()) {
      throw new Error('Cannot store data without user consent');
    }

    const storedExercise: StoredExercise = {
      ...exercise,
      updatedAt: new Date().toISOString()
    };

    try {
      await this.db.exercises.put(storedExercise);
    } catch (error) {
      console.warn('Failed to save exercise to IndexedDB:', error);
      this.fallbackStorage.set(`exercise_${exercise.id}`, storedExercise);
    }
  }

  /**
   * Get all exercises
   */
  public async getExercises(): Promise<Exercise[]> {
    if (!this.canStoreData()) {
      return [];
    }

    try {
      const storedExercises = await this.db.exercises.toArray();
      return storedExercises.map(this.convertStoredExercise);
    } catch (error) {
      console.warn('Failed to load exercises from IndexedDB:', error);
      // Try fallback storage
      const exercises: Exercise[] = [];
      this.fallbackStorage.forEach((value, key) => {
        if (key.startsWith('exercise_')) {
          exercises.push(this.convertStoredExercise(value));
        }
      });
      return exercises;
    }
  }

  /**
   * Update exercise favorite status
   */
  public async toggleExerciseFavorite(exerciseId: string): Promise<void> {
    if (!this.canStoreData()) {
      throw new Error('Cannot store data without user consent');
    }

    try {
      const exercise = await this.db.exercises.get(exerciseId);
      if (exercise) {
        await this.db.exercises.update(exerciseId, {
          isFavorite: !exercise.isFavorite,
          updatedAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.warn('Failed to update exercise favorite:', error);
      // Try fallback storage
      const key = `exercise_${exerciseId}`;
      const exercise = this.fallbackStorage.get(key);
      if (exercise) {
        exercise.isFavorite = !exercise.isFavorite;
        exercise.updatedAt = new Date().toISOString();
        this.fallbackStorage.set(key, exercise);
      }
    }
  }

  /**
   * Save activity log
   */
  public async saveActivityLog(log: ActivityLog): Promise<void> {
    if (!this.canStoreData()) {
      throw new Error('Cannot store data without user consent');
    }

    const storedLog: StoredActivityLog = {
      ...log,
      timestamp: log.timestamp.toISOString()
    };

    try {
      await this.db.activityLogs.add(storedLog);
    } catch (error) {
      console.warn('Failed to save activity log to IndexedDB:', error);
      this.fallbackStorage.set(`log_${log.id}`, storedLog);
    }
  }

  /**
   * Get activity logs with optional filtering
   */
  public async getActivityLogs(
    limit?: number,
    exerciseId?: string,
    fromDate?: Date
  ): Promise<ActivityLog[]> {
    if (!this.canStoreData()) {
      return [];
    }

    try {
      let query = this.db.activityLogs.orderBy('timestamp').reverse();

      if (fromDate) {
        query = query.filter(log => log.timestamp >= fromDate.toISOString());
      }

      if (exerciseId) {
        query = query.filter(log => log.exerciseId === exerciseId);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const storedLogs = await query.toArray();
      return storedLogs.map(this.convertStoredActivityLog);
    } catch (error) {
      console.warn('Failed to load activity logs from IndexedDB:', error);
      // Try fallback storage
      const logs: ActivityLog[] = [];
      this.fallbackStorage.forEach((value, key) => {
        if (key.startsWith('log_')) {
          logs.push(this.convertStoredActivityLog(value));
        }
      });
      return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, limit);
    }
  }

  /**
   * Save user preferences
   */
  public async saveUserPreferences(preferences: UserPreferences): Promise<void> {
    if (!this.canStoreData()) {
      throw new Error('Cannot store data without user consent');
    }

    const storedPreferences: StoredUserPreferences = {
      ...preferences,
      updatedAt: new Date().toISOString()
    };

    try {
      // Clear existing preferences and save new ones
      await this.db.userPreferences.clear();
      await this.db.userPreferences.add(storedPreferences);
    } catch (error) {
      console.warn('Failed to save user preferences to IndexedDB:', error);
      this.fallbackStorage.set('userPreferences', storedPreferences);
    }
  }

  /**
   * Get user preferences
   */
  public async getUserPreferences(): Promise<UserPreferences | null> {
    if (!this.canStoreData()) {
      return null;
    }

    try {
      const storedPreferences = await this.db.userPreferences.orderBy('updatedAt').last();
      if (storedPreferences) {
        const { id: _id, updatedAt: _updatedAt, ...preferences } = storedPreferences;
        return preferences;
      }
      return null;
    } catch (error) {
      console.warn('Failed to load user preferences from IndexedDB:', error);
      const fallback = this.fallbackStorage.get('userPreferences');
      if (fallback) {
        const { id: _id, updatedAt: _updatedAt, ...preferences } = fallback;
        return preferences;
      }
      return null;
    }
  }

  /**
   * Save app settings
   */
  public async saveAppSettings(settings: AppSettings): Promise<void> {
    if (!this.canStoreData()) {
      throw new Error('Cannot store data without user consent');
    }

    const storedSettings: StoredAppSettings = {
      ...settings,
      updatedAt: new Date().toISOString()
    };

    try {
      // Clear existing settings and save new ones
      await this.db.appSettings.clear();
      await this.db.appSettings.add(storedSettings);
    } catch (error) {
      console.warn('Failed to save app settings to IndexedDB:', error);
      this.fallbackStorage.set('appSettings', storedSettings);
    }
  }

  /**
   * Get app settings
   */
  public async getAppSettings(): Promise<AppSettings | null> {
    if (!this.canStoreData()) {
      return null;
    }

    try {
      const storedSettings = await this.db.appSettings.orderBy('updatedAt').last();
      if (storedSettings) {
        const { id: _id, updatedAt: _updatedAt, ...settings } = storedSettings;
        return settings;
      }
      return null;
    } catch (error) {
      console.warn('Failed to load app settings from IndexedDB:', error);
      const fallback = this.fallbackStorage.get('appSettings');
      if (fallback) {
        const { id: _id, updatedAt: _updatedAt, ...settings } = fallback;
        return settings;
      }
      return null;
    }
  }

  /**
   * Export all user data for GDPR compliance
   */
  public async exportAllData(): Promise<{
    exercises: Exercise[];
    activityLogs: ActivityLog[];
    userPreferences: UserPreferences | null;
    appSettings: AppSettings | null;
    exportDate: string;
    version: string;
  }> {
    if (!this.canStoreData()) {
      throw new Error('Cannot export data without user consent');
    }

    try {
      const [exercises, logs, preferences, settings] = await Promise.all([
        this.getExercises(),
        this.getActivityLogs(),
        this.getUserPreferences(),
        this.getAppSettings()
      ]);

      return {
        exercises,
        activityLogs: logs,
        userPreferences: preferences,
        appSettings: settings,
        exportDate: new Date().toISOString(),
        version: '1.0'
      };
    } catch (error) {
      console.error('Failed to export data:', error);
      throw error;
    }
  }

  /**
   * Clear all user data for GDPR compliance
   */
  public async clearAllData(): Promise<void> {
    try {
      await Promise.all([
        this.db.exercises.clear(),
        this.db.activityLogs.clear(),
        this.db.userPreferences.clear(),
        this.db.appSettings.clear()
      ]);
      
      // Clear fallback storage
      this.fallbackStorage.clear();
    } catch (error) {
      console.error('Failed to clear all data:', error);
      throw error;
    }
  }

  /**
   * Get storage statistics
   */
  public async getStorageStats(): Promise<{
    exerciseCount: number;
    logCount: number;
    hasPreferences: boolean;
    hasSettings: boolean;
  }> {
    if (!this.canStoreData()) {
      return {
        exerciseCount: 0,
        logCount: 0,
        hasPreferences: false,
        hasSettings: false
      };
    }

    try {
      const [exerciseCount, logCount, preferences, settings] = await Promise.all([
        this.db.exercises.count(),
        this.db.activityLogs.count(),
        this.getUserPreferences(),
        this.getAppSettings()
      ]);

      return {
        exerciseCount,
        logCount,
        hasPreferences: preferences !== null,
        hasSettings: settings !== null
      };
    } catch (error) {
      console.warn('Failed to get storage stats:', error);
      return {
        exerciseCount: 0,
        logCount: 0,
        hasPreferences: false,
        hasSettings: false
      };
    }
  }

  /**
   * Convert stored exercise to runtime format
   */
  private convertStoredExercise(stored: StoredExercise): Exercise {
    const { updatedAt: _updatedAt, ...exercise } = stored;
    return exercise;
  }

  /**
   * Convert stored activity log to runtime format
   */
  private convertStoredActivityLog(stored: StoredActivityLog): ActivityLog {
    return {
      ...stored,
      timestamp: new Date(stored.timestamp)
    };
  }

  /**
   * Close database connection
   */
  public async close(): Promise<void> {
    await this.db.close();
  }
}

// Export singleton instance
export const storageService = StorageService.getInstance(); 