import Dexie from 'dexie';
import type { Table, Transaction } from 'dexie';
import type { 
  Exercise, 
  ActivityLog, 
  UserPreferences, 
  AppSettings,
  Workout,
  WorkoutSession
} from '../types';
import { consentService } from './consentService';
import { 
  prepareUpsert, 
  prepareSoftDelete, 
  filterActiveRecords 
} from './syncHelpers';

// Database schema interfaces with sync metadata
interface StoredActivityLog extends Omit<ActivityLog, 'timestamp'> {
  timestamp: string; // ISO string for IndexedDB storage
}

type StoredUserPreferences = UserPreferences;

type StoredAppSettings = AppSettings;

type StoredExercise = Exercise;

// Workout-related data interfaces
interface StoredWorkout extends Omit<Workout, 'createdAt'> {
  createdAt: string; // Store as ISO string for IndexedDB
}

interface StoredWorkoutSession extends Omit<WorkoutSession, 'startTime' | 'endTime'> {
  startTime: string;
  endTime?: string;
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
  workouts!: Table<StoredWorkout>;
  workoutSessions!: Table<StoredWorkoutSession>;

  constructor() {
    super('RepCueDB');
    
    // Version 3: Original schema (kept for historical reference)
    this.version(3).stores({
      exercises: 'id, name, category, exerciseType, isFavorite, updatedAt',
      activityLogs: '++id, exerciseId, timestamp, duration',
      userPreferences: '++id, updatedAt',
      appSettings: '++id, updatedAt',
      workouts: 'id, name, createdAt, updatedAt',
      workoutSessions: 'id, workoutId, startTime, endTime, isCompleted'
    });

    // Version 4: FAILED - Primary key changes not supported by Dexie
    // This version caused migration failures due to changing ++id to id
    this.version(4).stores({
      exercises: 'id, name, category, exerciseType, isFavorite, updatedAt, ownerId, deleted, version, dirty',
      activityLogs: '++id, exerciseId, timestamp, duration, updatedAt, ownerId, deleted, version, dirty',
      userPreferences: '++id, updatedAt, ownerId, deleted, version, dirty', // Fixed: Keep ++id
      appSettings: '++id, updatedAt, ownerId, deleted, version, dirty', // Fixed: Keep ++id
      workouts: 'id, name, createdAt, updatedAt, ownerId, deleted, version, dirty',
      workoutSessions: 'id, workoutId, startTime, endTime, isCompleted, updatedAt, ownerId, deleted, version, dirty'
    });

    // Version 5: Fixed schema with consistent primary keys and proper sync metadata
    this.version(5).stores({
      exercises: 'id, name, category, exerciseType, isFavorite, updatedAt, ownerId, deleted, version, dirty',
      activityLogs: '++id, exerciseId, timestamp, duration, updatedAt, ownerId, deleted, version, dirty',
      userPreferences: '++id, updatedAt, ownerId, deleted, version, dirty',
      appSettings: '++id, updatedAt, ownerId, deleted, version, dirty',
      workouts: 'id, name, createdAt, updatedAt, ownerId, deleted, version, dirty',
      workoutSessions: 'id, workoutId, startTime, endTime, isCompleted, updatedAt, ownerId, deleted, version, dirty'
    }).upgrade(trans => {
      // Migration function to add sync metadata to existing records
      return this.migrateToSyncMetadata(trans);
    });
  }

  /**
   * Migration function to add sync metadata to existing records
   */
  private async migrateToSyncMetadata(trans: Transaction): Promise<void> {
    const now = new Date().toISOString();
    
    // Migrate exercises
    await trans.table('exercises').toCollection().modify((exercise: Record<string, unknown>) => {
      if (!exercise.ownerId) exercise.ownerId = null;
      if (!exercise.deleted) exercise.deleted = false;
      if (!exercise.version) exercise.version = 1;
      if (!exercise.dirty) exercise.dirty = 0;
      if (!exercise.op) exercise.op = 'upsert';
    });

    // Migrate activity logs
    await trans.table('activityLogs').toCollection().modify((log: Record<string, unknown>) => {
      if (!log.id) log.id = crypto.randomUUID();
      if (!log.updatedAt) log.updatedAt = now;
      if (!log.ownerId) log.ownerId = null;
      if (!log.deleted) log.deleted = false;
      if (!log.version) log.version = 1;
      if (!log.dirty) log.dirty = 0;
      if (!log.op) log.op = 'upsert';
    });

    // Migrate user preferences
    await trans.table('userPreferences').toCollection().modify((prefs: Record<string, unknown>) => {
      if (!prefs.id) prefs.id = crypto.randomUUID();
      if (!prefs.ownerId) prefs.ownerId = null;
      if (!prefs.deleted) prefs.deleted = false;
      if (!prefs.version) prefs.version = 1;
      if (!prefs.dirty) prefs.dirty = 0;
      if (!prefs.op) prefs.op = 'upsert';
    });

    // Migrate app settings
    await trans.table('appSettings').toCollection().modify((settings: Record<string, unknown>) => {
      if (!settings.id) settings.id = crypto.randomUUID();
      if (!settings.ownerId) settings.ownerId = null;
      if (!settings.deleted) settings.deleted = false;
      if (!settings.version) settings.version = 1;
      if (!settings.dirty) settings.dirty = 0;
      if (!settings.op) settings.op = 'upsert';
    });

    // Migrate workouts
    await trans.table('workouts').toCollection().modify((workout: Record<string, unknown>) => {
      if (!workout.ownerId) workout.ownerId = null;
      if (!workout.deleted) workout.deleted = false;
      if (!workout.version) workout.version = 1;
      if (!workout.dirty) workout.dirty = 0;
      if (!workout.op) workout.op = 'upsert';
    });

    // Migrate workout sessions
    await trans.table('workoutSessions').toCollection().modify((session: Record<string, unknown>) => {
      if (!session.updatedAt) session.updatedAt = now;
      if (!session.ownerId) session.ownerId = null;
      if (!session.deleted) session.deleted = false;
      if (!session.version) session.version = 1;
      if (!session.dirty) session.dirty = 0;
      if (!session.op) session.op = 'upsert';
    });
  }
}

export class StorageService {
  private static instance: StorageService;
  private db: RepCueDatabase;
  private fallbackStorage = new Map<string, unknown>();

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
      
      // Check database health after opening
      const healthCheck = await this.checkAndRepairDatabase();
      if (healthCheck.repaired) {
        console.log('🔧 Database was automatically repaired during initialization');
      } else if (!healthCheck.healthy) {
        console.warn('⚠️ Database health check failed but could not be repaired:', healthCheck.error);
      }
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
   * Get the database instance for sync operations
   */
  public getDatabase(): RepCueDatabase {
    return this.db;
  }

  /**
   * Store exercise data
   */
  public async saveExercise(exercise: Exercise): Promise<void> {
    if (!this.canStoreData()) {
      throw new Error('Cannot store data without user consent');
    }

    const storedExercise: StoredExercise = prepareUpsert(exercise, exercise.id);

    try {
      await this.db.exercises.put(storedExercise);
    } catch (error) {
      console.warn('Failed to save exercise to IndexedDB:', error);
      this.fallbackStorage.set(`exercise_${exercise.id}`, storedExercise);
    }
  }

  /**
   * Get all exercises (filtered to exclude deleted records)
   */
  public async getExercises(): Promise<Exercise[]> {
    if (!this.canStoreData()) {
      return [];
    }

    try {
      const storedExercises = await this.db.exercises.toArray();
      const allExercises = storedExercises.map(this.convertStoredExercise);
      return filterActiveRecords(allExercises);
    } catch (error) {
      console.warn('Failed to load exercises from IndexedDB:', error);
      // Try fallback storage
      const exercises: Exercise[] = [];
      this.fallbackStorage.forEach((value, key) => {
        if (key.startsWith('exercise_')) {
          exercises.push(this.convertStoredExercise(value as StoredExercise));
        }
      });
      return filterActiveRecords(exercises);
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
        const updatedExercise = prepareUpsert({
          ...exercise,
          isFavorite: !exercise.isFavorite
        }, exerciseId);
        await this.db.exercises.put(updatedExercise);
      }
    } catch (error) {
      console.warn('Failed to update exercise favorite:', error);
      // Try fallback storage
      const key = `exercise_${exerciseId}`;
      const exercise = this.fallbackStorage.get(key) as StoredExercise | undefined;
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

    const logWithSync = prepareUpsert(log, log.id);
    const storedLog: StoredActivityLog = {
      ...logWithSync,
      timestamp: log.timestamp.toISOString()
    };

    try {
      await this.db.activityLogs.put(storedLog);
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
          logs.push(this.convertStoredActivityLog(value as StoredActivityLog));
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
      // Use put() to handle both insert and update operations
      await this.db.userPreferences.put(storedPreferences);
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
        return storedPreferences;
      }
      return null;
    } catch (error) {
      console.warn('Failed to load user preferences from IndexedDB:', error);
      const fallback = this.fallbackStorage.get('userPreferences') as UserPreferences | undefined;
      if (fallback) {
        return fallback;
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
      // Use put() to handle both insert and update operations
      await this.db.appSettings.put(storedSettings);
    } catch (error) {
      console.warn('Failed to save app settings to IndexedDB:', error);
      this.fallbackStorage.set('appSettings', storedSettings);
    }
  }

  /**
   * Get app settings with enhanced error handling and fallback
   */
  public async getAppSettings(): Promise<AppSettings | null> {
    // Allow reading app settings even without consent to preserve theme and basic preferences
    // This is acceptable as these are non-personal UI preferences
    const skipConsentCheck = true;
    
    if (!skipConsentCheck && !this.canStoreData()) {
      return null;
    }

    try {
      const storedSettings = await this.db.appSettings.orderBy('updatedAt').last();
      if (storedSettings) {
        return storedSettings;
      }
      return null;
    } catch (error) {
      console.warn('Failed to load app settings from IndexedDB:', error);
      const fallback = this.fallbackStorage.get('appSettings') as AppSettings | undefined;
      if (fallback) {
        return fallback;
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

  // ===============================
  // Workout Management Methods
  // ===============================

  /**
   * Save workout data
   */
  public async saveWorkout(workout: Workout): Promise<void> {
    // Double-guard: ensure Promise rejection even under mocked environments without using any-casts
    const hasConsent: boolean = (() => {
      try { return consentService.hasConsent(); } catch { return false; }
    })();
    if (!this.canStoreData() || !hasConsent) {
      return Promise.reject(new Error('Cannot store data without user consent'));
    }

    const workoutWithSync = prepareUpsert(workout, workout.id);
    const storedWorkout: StoredWorkout = {
      ...workoutWithSync,
      createdAt: workout.createdAt.toISOString()
    };

    try {
      await this.db.workouts.put(storedWorkout);
    } catch (error) {
      console.warn('Failed to save workout to IndexedDB:', error);
      this.fallbackStorage.set(`workout_${workout.id}`, storedWorkout);
    }
  }

  /**
   * Get all workouts
   */
  public async getWorkouts(): Promise<Workout[]> {
    if (!this.canStoreData()) {
      return [];
    }

    try {
      const storedWorkouts = await this.db.workouts.orderBy('updatedAt').reverse().toArray();
      return storedWorkouts.map(this.convertStoredWorkout);
    } catch (error) {
      console.warn('Failed to load workouts from IndexedDB:', error);
      const workouts: Workout[] = [];
      this.fallbackStorage.forEach((value, key) => {
        if (key.startsWith('workout_')) {
          workouts.push(this.convertStoredWorkout(value as StoredWorkout));
        }
      });
      return workouts;
    }
  }

  /**
   * Get workout by ID
   */
  public async getWorkout(workoutId: string): Promise<Workout | null> {
    if (!this.canStoreData()) {
      return null;
    }

    try {
      const storedWorkout = await this.db.workouts.get(workoutId);
      return storedWorkout ? this.convertStoredWorkout(storedWorkout) : null;
    } catch (error) {
      console.warn('Failed to get workout from IndexedDB:', error);
      const fallback = this.fallbackStorage.get(`workout_${workoutId}`);
      return fallback ? this.convertStoredWorkout(fallback as StoredWorkout) : null;
    }
  }

  /**
   * Delete workout data
   */
  public async deleteWorkout(workoutId: string): Promise<void> {
    if (!this.canStoreData()) {
      throw new Error('Cannot delete data without user consent');
    }

    try {
      const workout = await this.db.workouts.get(workoutId);
      if (workout) {
        const deletedWorkout = prepareSoftDelete(workout);
        await this.db.workouts.put(deletedWorkout);
        console.log(`Workout ${workoutId} soft deleted successfully`);
      }
    } catch (error) {
      console.error('Failed to soft delete workout from IndexedDB:', error);
      // For fallback storage, we can still use hard delete since it's temporary
      this.fallbackStorage.delete(`workout_${workoutId}`);
    }
  }

  // ===============================
  // Workout Session Management Methods
  // ===============================

  /**
   * Save workout session data
   */
  public async saveWorkoutSession(session: WorkoutSession): Promise<void> {
    if (!this.canStoreData()) {
      throw new Error('Cannot store data without user consent');
    }

    const sessionWithSync = prepareUpsert(session, session.id);
    const storedSession: StoredWorkoutSession = {
      ...sessionWithSync,
      startTime: session.startTime.toISOString(),
      endTime: session.endTime?.toISOString()
    };

    try {
      await this.db.workoutSessions.put(storedSession);
    } catch (error) {
      console.warn('Failed to save workout session to IndexedDB:', error);
      this.fallbackStorage.set(`session_${session.id}`, storedSession);
    }
  }

  /**
   * Get workout sessions
   */
  public async getWorkoutSessions(
    limit?: number,
    workoutId?: string,
    fromDate?: Date
  ): Promise<WorkoutSession[]> {
    if (!this.canStoreData()) {
      return [];
    }

    try {
      let query = this.db.workoutSessions.orderBy('startTime').reverse();

      if (fromDate) {
        query = query.filter(session => session.startTime >= fromDate.toISOString());
      }

      if (workoutId) {
        query = query.filter(session => session.workoutId === workoutId);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const storedSessions = await query.toArray();
      return storedSessions.map(this.convertStoredWorkoutSession);
    } catch (error) {
      console.warn('Failed to load workout sessions from IndexedDB:', error);
      const sessions: WorkoutSession[] = [];
      this.fallbackStorage.forEach((value, key) => {
        if (key.startsWith('session_')) {
          sessions.push(this.convertStoredWorkoutSession(value as StoredWorkoutSession));
        }
      });
      return sessions
        .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
        .slice(0, limit);
    }
  }

  /**
   * Delete workout session data (soft delete)
   */
  public async deleteWorkoutSession(sessionId: string): Promise<void> {
    if (!this.canStoreData()) {
      throw new Error('Cannot delete data without user consent');
    }

    try {
      const session = await this.db.workoutSessions.get(sessionId);
      if (session) {
        const deletedSession = prepareSoftDelete(session);
        await this.db.workoutSessions.put(deletedSession);
        console.log(`Workout session ${sessionId} soft deleted successfully`);
      }
    } catch (error) {
      console.error('Failed to soft delete workout session from IndexedDB:', error);
      this.fallbackStorage.delete(`session_${sessionId}`);
    }
  }

  /**
   * Delete exercise data (soft delete)
   */
  public async deleteExercise(exerciseId: string): Promise<void> {
    if (!this.canStoreData()) {
      throw new Error('Cannot delete data without user consent');
    }

    try {
      const exercise = await this.db.exercises.get(exerciseId);
      if (exercise) {
        const deletedExercise = prepareSoftDelete(exercise);
        await this.db.exercises.put(deletedExercise);
        console.log(`Exercise ${exerciseId} soft deleted successfully`);
      }
    } catch (error) {
      console.error('Failed to soft delete exercise from IndexedDB:', error);
      // Remove from fallback storage
      this.fallbackStorage.delete(`exercise_${exerciseId}`);
    }
  }

  /**
   * Delete activity log data (soft delete)
   */
  public async deleteActivityLog(activityLogId: string): Promise<void> {
    if (!this.canStoreData()) {
      throw new Error('Cannot delete data without user consent');
    }

    try {
      const log = await this.db.activityLogs.get(activityLogId);
      if (log) {
        const deletedLog = prepareSoftDelete(log);
        await this.db.activityLogs.put(deletedLog);
        console.log(`Activity log ${activityLogId} soft deleted successfully`);
      }
    } catch (error) {
      console.error('Failed to soft delete activity log from IndexedDB:', error);
      // Remove from fallback storage
      this.fallbackStorage.delete(`activityLog_${activityLogId}`);
    }
  }

  // ===============================
  // Sync Management Methods
  // ===============================

  /**
   * Get all dirty records that need to be synced
   */
  public async getDirtyRecords(): Promise<{
    exercises: Exercise[];
    activityLogs: ActivityLog[];
    userPreferences: UserPreferences[];
    appSettings: AppSettings[];
    workouts: Workout[];
    workoutSessions: WorkoutSession[];
  }> {
    if (!this.canStoreData()) {
      return {
        exercises: [],
        activityLogs: [],
        userPreferences: [],
        appSettings: [],
        workouts: [],
        workoutSessions: []
      };
    }

    try {
      const [exercises, activityLogs, userPreferences, appSettings, workouts, workoutSessions] = await Promise.all([
        this.db.exercises.where('dirty').equals(1).toArray(),
        this.db.activityLogs.where('dirty').equals(1).toArray(),
        this.db.userPreferences.where('dirty').equals(1).toArray(),
        this.db.appSettings.where('dirty').equals(1).toArray(),
        this.db.workouts.where('dirty').equals(1).toArray(),
        this.db.workoutSessions.where('dirty').equals(1).toArray()
      ]);

      return {
        exercises: exercises.map(this.convertStoredExercise),
        activityLogs: activityLogs.map(this.convertStoredActivityLog),
        userPreferences: userPreferences.map(this.convertStoredUserPreferences),
        appSettings: appSettings.map(this.convertStoredAppSettings),
        workouts: workouts.map(this.convertStoredWorkout),
        workoutSessions: workoutSessions.map(this.convertStoredWorkoutSession)
      };
    } catch (error) {
      console.warn('Failed to get dirty records:', error);
      return {
        exercises: [],
        activityLogs: [],
        userPreferences: [],
        appSettings: [],
        workouts: [],
        workoutSessions: []
      };
    }
  }

  /**
   * Mark records as synced (clean)
   */
  public async markAsSynced(table: string, ids: string[]): Promise<void> {
    if (!this.canStoreData() || ids.length === 0) {
      return;
    }

    try {
      const now = new Date().toISOString();
      const updateData = { dirty: 0, syncedAt: now };

      switch (table) {
        case 'exercises':
          await this.db.exercises.bulkUpdate(ids.map(id => ({ key: id, changes: updateData })));
          break;
        case 'activityLogs':
          await this.db.activityLogs.bulkUpdate(ids.map(id => ({ key: id, changes: updateData })));
          break;
        case 'userPreferences':
          await this.db.userPreferences.bulkUpdate(ids.map(id => ({ key: id, changes: updateData })));
          break;
        case 'appSettings':
          await this.db.appSettings.bulkUpdate(ids.map(id => ({ key: id, changes: updateData })));
          break;
        case 'workouts':
          await this.db.workouts.bulkUpdate(ids.map(id => ({ key: id, changes: updateData })));
          break;
        case 'workoutSessions':
          await this.db.workoutSessions.bulkUpdate(ids.map(id => ({ key: id, changes: updateData })));
          break;
      }
    } catch (error) {
      console.warn(`Failed to mark ${table} records as synced:`, error);
    }
  }

  /**
   * Claim ownership of anonymous records during first sync
   */
  public async claimOwnership(ownerId: string): Promise<{
    success: boolean;
    recordsClaimed: number;
    tableStats: Record<string, number>;
    error?: string;
  }> {
    if (!this.canStoreData()) {
      return {
        success: false,
        recordsClaimed: 0,
        tableStats: {},
        error: 'Data storage not available'
      };
    }

    try {
      const now = new Date().toISOString();
      const claimData = { 
        ownerId, 
        updatedAt: now, 
        dirty: 1, 
        version: 1 
      };

      // Define tables to claim with friendly names
      const tablesToClaim = [
        { table: this.db.exercises, name: 'exercises' },
        { table: this.db.activityLogs, name: 'activityLogs' },
        { table: this.db.userPreferences, name: 'userPreferences' },
        { table: this.db.appSettings, name: 'appSettings' },
        { table: this.db.workouts, name: 'workouts' },
        { table: this.db.workoutSessions, name: 'workoutSessions' }
      ];

      const results = await Promise.all(
        tablesToClaim.map(async ({ table, name }) => {
          try {
            // Claim records with null, undefined, or empty ownerId
            // Handle empty string case
            const emptyStringCount = await table.where('ownerId').equals('').modify(claimData);
            
            // Handle null/undefined cases by finding all records and filtering
            const allRecords = await table.toArray();
            const nullOrUndefinedRecords = allRecords.filter(record => 
              record.ownerId == null || record.ownerId === undefined
            );
            
            // Update null/undefined records
            let nullUndefinedCount = 0;
            for (const record of nullOrUndefinedRecords) {
              await table.update(record.id, claimData);
              nullUndefinedCount++;
            }
            
            const modifiedCount = emptyStringCount + nullUndefinedCount;
            return { name, count: modifiedCount };
          } catch (error) {
            console.warn(`Failed to claim ${name}:`, error);
            return { name, count: 0 };
          }
        })
      );

      const tableStats: Record<string, number> = {};
      let totalClaimed = 0;

      results.forEach(({ name, count }) => {
        tableStats[name] = count;
        totalClaimed += count;
      });

      console.log(`✅ Successfully claimed ${totalClaimed} anonymous records for user ${ownerId}:`, tableStats);

      return {
        success: true,
        recordsClaimed: totalClaimed,
        tableStats,
      };
    } catch (error) {
      console.error('Failed to claim ownership of records:', error);
      return {
        success: false,
        recordsClaimed: 0,
        tableStats: {},
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Convert stored exercise to runtime format
   */
  private convertStoredExercise(stored: StoredExercise): Exercise {
    return {
      ...stored,
      updatedAt: stored.updatedAt
    };
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
   * Convert stored workout to runtime format
   */
  private convertStoredWorkout(stored: StoredWorkout): Workout {
    return {
      ...stored,
      createdAt: new Date(stored.createdAt),
      updatedAt: stored.updatedAt
    };
  }

  /**
   * Convert stored user preferences to runtime format
   */
  private convertStoredUserPreferences(stored: StoredUserPreferences): UserPreferences {
    return stored;
  }

  /**
   * Convert stored app settings to runtime format
   */
  private convertStoredAppSettings(stored: StoredAppSettings): AppSettings {
    return stored;
  }

  /**
   * Convert stored workout session to runtime format
   */
  private convertStoredWorkoutSession(stored: StoredWorkoutSession): WorkoutSession {
    return {
      ...stored,
      startTime: new Date(stored.startTime),
      endTime: stored.endTime ? new Date(stored.endTime) : undefined
    };
  }

  /**
   * Close database connection
   */
  public async close(): Promise<void> {
    await this.db.close();
  }

  /**
   * Reset the database - CRITICAL recovery function
   * Use this when the database is corrupted or has migration issues
   */
  public async resetDatabase(): Promise<void> {
    try {
      console.warn('🔄 Resetting RepCue database...');
      
      // Close the current connection
      await this.db.close();
      
      // Delete the entire database
      await this.db.delete();
      
      // Recreate the database instance
      this.db = new RepCueDatabase();
      await this.db.open();
      
      // Clear fallback storage as well
      this.fallbackStorage.clear();
      
      console.log('✅ Database reset successfully');
    } catch (error) {
      console.error('❌ Failed to reset database:', error);
      throw new Error('Database reset failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  /**
   * Check database health and attempt recovery if needed
   */
  public async checkAndRepairDatabase(): Promise<{ 
    healthy: boolean; 
    repaired: boolean; 
    error?: string 
  }> {
    try {
      // Try a simple operation to test database health
      await this.db.exercises.count();
      await this.db.userPreferences.count();
      await this.db.appSettings.count();
      
      return { healthy: true, repaired: false };
    } catch (error) {
      console.warn('🔧 Database health check failed, attempting repair:', error);
      
      try {
        await this.resetDatabase();
        return { healthy: true, repaired: true };
      } catch (repairError) {
        const errorMsg = repairError instanceof Error ? repairError.message : 'Unknown repair error';
        console.error('❌ Database repair failed:', repairError);
        return { 
          healthy: false, 
          repaired: false, 
          error: errorMsg 
        };
      }
    }
  }
}

// Export singleton instance
export const storageService = StorageService.getInstance(); 