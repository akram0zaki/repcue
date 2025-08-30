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
type StoredWorkout = Workout;

type StoredWorkoutSession = WorkoutSession;



/**
 * IndexedDB-based storage service using Dexie
 * Handles all persistent data storage with consent checking
 */
class RepCueDatabase extends Dexie {
  exercises!: Table<StoredExercise>;
  activity_logs!: Table<StoredActivityLog>;
  user_preferences!: Table<StoredUserPreferences>;
  app_settings!: Table<StoredAppSettings>;
  workouts!: Table<StoredWorkout>;
  workout_sessions!: Table<StoredWorkoutSession>;

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

    // Version 6: Unified snake_case schema matching server exactly
    this.version(6).stores({
      exercises: 'id, name, category, exercise_type, is_favorite, updated_at, created_at, owner_id, deleted, version, dirty',
      activity_logs: 'id, exercise_id, exercise_name, timestamp, duration, updated_at, created_at, owner_id, deleted, version, dirty',
      user_preferences: 'id, owner_id, sound_enabled, vibration_enabled, default_interval_duration, dark_mode, updated_at, created_at, deleted, version, dirty',
      app_settings: 'id, owner_id, interval_duration, sound_enabled, vibration_enabled, beep_volume, dark_mode, updated_at, created_at, deleted, version, dirty',
      workouts: 'id, name, description, scheduled_days, is_active, estimated_duration, updated_at, created_at, owner_id, deleted, version, dirty',
      workout_sessions: 'id, workout_id, workout_name, start_time, end_time, is_completed, completion_percentage, total_duration, updated_at, created_at, owner_id, deleted, version, dirty'
    }).upgrade(trans => {
      // Migration function to convert from camelCase to snake_case
      return this.migrateToUnifiedSchema(trans);
    });

    // Version 7: Drop legacy camelCase stores so fresh DBs do not keep duplicates
    // Dexie applies versions sequentially on first open; v3 created camelCase stores.
    // We explicitly drop them here to ensure only snake_case tables remain.
    this.version(7).stores({
      activityLogs: null,
      userPreferences: null,
      appSettings: null,
      workoutSessions: null,
    });
  }

  /**
   * Migration function to add sync metadata to existing records
   */
  private async migrateToSyncMetadata(trans: Transaction): Promise<void> {
    const now = new Date().toISOString();
    
    // Migrate exercises
    await trans.table('exercises').toCollection().modify((exercise: Record<string, unknown>) => {
      if (!exercise.owner_id) exercise.owner_id = null;
      if (!exercise.deleted) exercise.deleted = false;
      if (!exercise.version) exercise.version = 1;
      if (!exercise.dirty) exercise.dirty = 0;
      if (!exercise.op) exercise.op = 'upsert';
    });

    // Migrate activity logs
    await trans.table('activityLogs').toCollection().modify((log: Record<string, unknown>) => {
      if (!log.id) log.id = crypto.randomUUID();
      if (!log.updated_at) log.updated_at = now;
      if (!log.owner_id) log.owner_id = null;
      if (!log.deleted) log.deleted = false;
      if (!log.version) log.version = 1;
      if (!log.dirty) log.dirty = 0;
      if (!log.op) log.op = 'upsert';
    });

    // Migrate user preferences
    await trans.table('userPreferences').toCollection().modify((prefs: Record<string, unknown>) => {
      if (!prefs.id) prefs.id = crypto.randomUUID();
      if (!prefs.owner_id) prefs.owner_id = null;
      if (!prefs.deleted) prefs.deleted = false;
      if (!prefs.version) prefs.version = 1;
      if (!prefs.dirty) prefs.dirty = 0;
      if (!prefs.op) prefs.op = 'upsert';
    });

    // Migrate app settings
    await trans.table('appSettings').toCollection().modify((settings: Record<string, unknown>) => {
      if (!settings.id) settings.id = crypto.randomUUID();
      if (!settings.owner_id) settings.owner_id = null;
      if (!settings.deleted) settings.deleted = false;
      if (!settings.version) settings.version = 1;
      if (!settings.dirty) settings.dirty = 0;
      if (!settings.op) settings.op = 'upsert';
    });

    // Migrate workouts
    await trans.table('workouts').toCollection().modify((workout: Record<string, unknown>) => {
      if (!workout.owner_id) workout.owner_id = null;
      if (!workout.deleted) workout.deleted = false;
      if (!workout.version) workout.version = 1;
      if (!workout.dirty) workout.dirty = 0;
      if (!workout.op) workout.op = 'upsert';
    });

    // Migrate workout sessions
    await trans.table('workoutSessions').toCollection().modify((session: Record<string, unknown>) => {
      if (!session.updated_at) session.updated_at = now;
      if (!session.owner_id) session.owner_id = null;
      if (!session.deleted) session.deleted = false;
      if (!session.version) session.version = 1;
      if (!session.dirty) session.dirty = 0;
      if (!session.op) session.op = 'upsert';
    });
  }

  /**
   * Migration function to convert from camelCase to snake_case schema
   */
  private async migrateToUnifiedSchema(trans: Transaction): Promise<void> {
    const now = new Date().toISOString();
    
    try {
      // Migrate exercises: exerciseType -> exercise_type, isFavorite -> is_favorite, etc.
      await trans.table('exercises').toCollection().modify((exercise: Record<string, unknown>) => {
        if (exercise.exerciseType) {
          exercise.exercise_type = exercise.exerciseType === 'time-based' ? 'time_based' : 'repetition_based';
          delete exercise.exerciseType;
        }
        if (exercise.isFavorite !== undefined) {
          exercise.is_favorite = exercise.isFavorite;
          delete exercise.isFavorite;
        }
        if (exercise.ownerId !== undefined) {
          exercise.owner_id = exercise.ownerId;
          delete exercise.ownerId;
        }
        if (exercise.updatedAt !== undefined) {
          exercise.updated_at = exercise.updatedAt;
          delete exercise.updatedAt;
        }
        if (!exercise.created_at) exercise.created_at = now;
      });

      // Migrate activity_logs: exerciseId -> exercise_id, etc.
      // Note: This changes from activityLogs to activity_logs table
      const oldActivityLogs = await trans.table('activityLogs').toArray();
      if (oldActivityLogs.length > 0) {
        await trans.table('activity_logs').bulkAdd(oldActivityLogs.map((log: Record<string, unknown>) => ({
          ...log,
          exercise_id: log.exerciseId,
          exercise_name: log.exerciseName || 'Unknown Exercise',
          owner_id: log.ownerId,
          updated_at: log.updatedAt || now,
          created_at: now,
          // Remove old camelCase fields
          exerciseId: undefined,
          exerciseName: undefined,
          ownerId: undefined,
          updatedAt: undefined
        })));
      }

      // Migrate user_preferences
      const oldUserPrefs = await trans.table('userPreferences').toArray();
      if (oldUserPrefs.length > 0) {
        await trans.table('user_preferences').bulkAdd(oldUserPrefs.map((pref: Record<string, unknown>) => ({
          ...pref,
          owner_id: pref.ownerId,
          updated_at: pref.updatedAt || now,
          created_at: now,
          sound_enabled: true,
          vibration_enabled: true,
          default_interval_duration: 30,
          dark_mode: false,
          favorite_exercises: [],
          locale: 'en',
          units: 'metric',
          cues: {},
          rep_speed_factor: 1.0,
          // Remove old camelCase fields
          ownerId: undefined,
          updatedAt: undefined
        })));
      }

      // Migrate app_settings
      const oldAppSettings = await trans.table('appSettings').toArray();
      if (oldAppSettings.length > 0) {
        await trans.table('app_settings').bulkAdd(oldAppSettings.map((setting: Record<string, unknown>) => ({
          ...setting,
          owner_id: setting.ownerId,
          updated_at: setting.updatedAt || now,
          created_at: now,
          interval_duration: 30,
          sound_enabled: true,
          vibration_enabled: true,
          beep_volume: 0.5,
          dark_mode: false,
          auto_save: true,
          pre_timer_countdown: 3,
          default_rest_time: 60,
          rep_speed_factor: 1.0,
          show_exercise_videos: false,
          reduce_motion: false,
          auto_start_next: false,
          // Remove old camelCase fields  
          ownerId: undefined,
          updatedAt: undefined
        })));
      }

      // Migrate workouts
      await trans.table('workouts').toCollection().modify((workout: Record<string, unknown>) => {
        if (workout.ownerId !== undefined) {
          workout.owner_id = workout.ownerId;
          delete workout.ownerId;
        }
        if (workout.updatedAt !== undefined) {
          workout.updated_at = workout.updatedAt;
          delete workout.updatedAt;
        }
        if (workout.createdAt !== undefined) {
          workout.created_at = workout.createdAt;
          delete workout.createdAt;
        } else {
          workout.created_at = now;
        }
        if (!workout.scheduled_days) workout.scheduled_days = [];
        if (workout.is_active === undefined) workout.is_active = true;
      });

      // Migrate workout_sessions
      const oldWorkoutSessions = await trans.table('workoutSessions').toArray();
      if (oldWorkoutSessions.length > 0) {
        await trans.table('workout_sessions').bulkAdd(oldWorkoutSessions.map((session: Record<string, unknown>) => ({
          ...session,
          workout_id: session.workoutId,
          workout_name: session.workoutName || 'Unknown Workout',
          start_time: session.startTime,
          end_time: session.endTime,
          is_completed: session.isCompleted || false,
          completion_percentage: 0,
          total_duration: session.totalDuration,
          owner_id: session.ownerId,
          updated_at: session.updatedAt || now,
          created_at: now,
          exercises: [],
          // Remove old camelCase fields
          workoutId: undefined,
          workoutName: undefined,
          startTime: undefined,
          endTime: undefined,
          isCompleted: undefined,
          totalDuration: undefined,
          ownerId: undefined,
          updatedAt: undefined
        })));
      }

    } catch (error) {
      console.error('Migration to unified schema failed:', error);
      // Don't throw - let the migration continue with warnings
    }
  }

  /**
   * Get migration status and database info
   */
  async getMigrationStatus(): Promise<{
    currentVersion: number;
    isV6Schema: boolean;
    tableStats: Record<string, number>;
    migrationComplete: boolean;
  }> {
    try {
      const currentVersion = this.verno;
      const isV6Schema = currentVersion >= 6;
      
      const tableStats: Record<string, number> = {};
      const tables = ['exercises', 'activity_logs', 'user_preferences', 'app_settings', 'workouts', 'workout_sessions'];
      
      for (const tableName of tables) {
        try {
          const count = await this.table(tableName).count();
          tableStats[tableName] = count;
        } catch {
          tableStats[tableName] = 0;
        }
      }
      
      return {
        currentVersion,
        isV6Schema,
        tableStats,
        migrationComplete: isV6Schema && Object.values(tableStats).some(count => count > 0)
      };
    } catch (error) {
      console.error('Error getting migration status:', error);
      return {
        currentVersion: 0,
        isV6Schema: false,
        tableStats: {},
        migrationComplete: false
      };
    }
  }
}

export class StorageService {
  private static instance: StorageService;
  private db: RepCueDatabase;
  private fallbackStorage = new Map<string, unknown>();
  
  /**
   * Resolve workout name by ID using primary DB path with automatic fallback.
   */
  private async resolveWorkoutName(workoutId: string): Promise<string | null> {
    try {
      const w = await this.getWorkout(workoutId);
      if (w && typeof w.name === 'string' && w.name.trim()) return w.name;
    } catch {
      // ignore and try fallback
    }
    const fb = this.fallbackStorage.get(`workout_${workoutId}`) as StoredWorkout | undefined;
    return fb?.name || null;
  }
  
  /**
   * Resolve exercise name by ID using primary DB path with automatic fallback.
   */
  private async resolveExerciseName(exerciseId: string): Promise<string | null> {
    try {
      const ex = await this.db.exercises.get(exerciseId);
      if (ex && typeof (ex as StoredExercise).name === 'string' && (ex as StoredExercise).name.trim()) {
        return (ex as StoredExercise).name;
      }
    } catch {
      // ignore and try fallback
    }
    const fb = this.fallbackStorage.get(`exercise_${exerciseId}`) as StoredExercise | undefined;
    return fb?.name || null;
  }

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
   * Get migration status and database info
   */
  async getMigrationStatus() {
    return await this.db.getMigrationStatus();
  }

  /**
   * Export all data for backup purposes
   */
  async exportAllData(): Promise<Record<string, unknown[] | object>> {
    try {
      const status = await this.getMigrationStatus();
      const data: Record<string, unknown[]> = {};
      
      const tables = ['exercises', 'activity_logs', 'user_preferences', 'app_settings', 'workouts', 'workout_sessions'];
      
      for (const tableName of tables) {
        try {
          data[tableName] = await this.db.table(tableName).toArray();
        } catch (error) {
          console.error(`Error exporting ${tableName}:`, error);
          data[tableName] = [];
        }
      }
      
      return {
        metadata: {
          exportTimestamp: new Date().toISOString(),
          databaseVersion: status.currentVersion,
          isV6Schema: status.isV6Schema,
          tableStats: status.tableStats
        },
        ...data
      };
    } catch (error) {
      console.error('Error exporting data:', error);
      throw error;
    }
  }

  /**
   * Store exercise data
   */
  public async saveExercise(exercise: Exercise): Promise<void> {
    if (!this.canStoreData()) {
      throw new Error('Cannot store data without user consent');
    }

  const exerciseId = exercise.id || crypto.randomUUID();
  const storedExercise: StoredExercise = prepareUpsert(exercise, exerciseId);

    try {
  await this.db.exercises.put(storedExercise);
    } catch (error) {
      console.warn('Failed to save exercise to IndexedDB:', error);
  // Use the resolved exerciseId to avoid undefined keys when caller didn't provide one
  this.fallbackStorage.set(`exercise_${exerciseId}`, storedExercise);
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
   * Ensure the exercise catalog exists. If empty, seed with INITIAL_EXERCISES.
   * Returns the number of exercises after seeding.
   */
  public async ensureExercisesSeeded(): Promise<number> {
    if (!this.canStoreData()) {
      return 0;
    }

    try {
      const existingCount = await this.db.exercises.count();
      if (existingCount > 0) return existingCount;

      // Lazy import to avoid upfront bundle cost and circular deps
      const { INITIAL_EXERCISES } = await import('../data/exercises');
      for (const exercise of INITIAL_EXERCISES) {
        await this.saveExercise(exercise);
      }
      return await this.db.exercises.count();
    } catch (error) {
      console.warn('Failed to seed exercises catalog:', error);
      return 0;
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
          is_favorite: !exercise.is_favorite
        }, exerciseId);
        await this.db.exercises.put(updatedExercise);
      }
    } catch (error) {
      console.warn('Failed to update exercise favorite:', error);
      // Try fallback storage
      const key = `exercise_${exerciseId}`;
      const exercise = this.fallbackStorage.get(key) as StoredExercise | undefined;
      if (exercise) {
        exercise.is_favorite = !exercise.is_favorite;
        exercise.updated_at = new Date().toISOString();
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

  const logId = log.id || crypto.randomUUID();
    // Defensive: ensure exercise_name is present before persisting
    let ensuredName = log.exercise_name;
    const shouldReplaceGenericName = (name?: string) => !name || typeof name !== 'string' || name.trim() === '' || name === 'Unknown Exercise' || name === 'Workout';
    try {
      if (log.is_workout && log.workout_id) {
        // For workout logs, always prefer the workout's name
        ensuredName = (await this.resolveWorkoutName(log.workout_id)) || 'Workout';
      } else if (!ensuredName || typeof ensuredName !== 'string' || shouldReplaceGenericName(ensuredName)) {
        if (log.exercise_id) {
          ensuredName = (await this.resolveExerciseName(log.exercise_id)) || 'Unknown Exercise';
        } else {
          ensuredName = 'Unknown Exercise';
        }
      }
    } catch {
      // On any error deriving the name (e.g., IndexedDB unavailable in tests), consult fallback storage
      if (log.is_workout && log.workout_id) {
        const fb = this.fallbackStorage.get(`workout_${log.workout_id}`) as StoredWorkout | undefined;
        ensuredName = fb?.name || 'Workout';
      } else if (log.exercise_id) {
        const fb = this.fallbackStorage.get(`exercise_${log.exercise_id}`) as StoredExercise | undefined;
        ensuredName = fb?.name || 'Unknown Exercise';
      } else {
        ensuredName = log.is_workout ? 'Workout' : (ensuredName || 'Unknown Exercise');
      }
    }

    // Final safety net: if still generic for workout, try fallback store directly one more time
    if (log.is_workout && log.workout_id && shouldReplaceGenericName(ensuredName)) {
      const fb = this.fallbackStorage.get(`workout_${log.workout_id}`) as StoredWorkout | undefined;
      if (fb?.name && fb.name.trim()) {
        ensuredName = fb.name;
      }
    }

    const logWithSync = prepareUpsert({ ...log, exercise_name: ensuredName }, logId);
    const storedLog: StoredActivityLog = {
      ...logWithSync,
      timestamp: log.timestamp
    };

    try {
      await this.db.activity_logs.put(storedLog);
    } catch (error) {
      console.warn('Failed to save activity log to IndexedDB:', error);
      // Use generated logId to ensure consistent fallback key
      this.fallbackStorage.set(`log_${logId}`, storedLog);
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
      let query = this.db.activity_logs.orderBy('timestamp').reverse();

      if (fromDate) {
        query = query.filter(log => log.timestamp >= fromDate.toISOString());
      }

      if (exerciseId) {
        query = query.filter(log => log.exercise_id === exerciseId);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const storedLogs = await query.toArray();

      // Hygiene: backfill missing exercise_name for legacy/bad records and persist
      const repairedLogs: StoredActivityLog[] = [];
      const repairPromises: Promise<unknown>[] = [];
      const shouldReplaceGenericName = (name?: string) => !name || typeof name !== 'string' || name.trim() === '' || name === 'Unknown Exercise' || name === 'Workout';
      for (const log of storedLogs) {
        if (shouldReplaceGenericName(log.exercise_name)) {
          let newName: string;
          try {
            if (log.is_workout && log.workout_id) {
              newName = (await this.resolveWorkoutName(log.workout_id)) || 'Workout';
            } else if (log.exercise_id) {
              newName = (await this.resolveExerciseName(log.exercise_id)) || 'Unknown Exercise';
            } else {
              newName = 'Unknown Exercise';
            }
          } catch {
            newName = log.is_workout ? 'Workout' : 'Unknown Exercise';
          }
          const repaired: StoredActivityLog = {
            ...log,
            exercise_name: newName,
            dirty: 1,
            updated_at: new Date().toISOString()
          };
          repairPromises.push(this.db.activity_logs.put(repaired));
          repairedLogs.push(repaired);
        } else {
          repairedLogs.push(log);
        }
      }
      if (repairPromises.length) {
        try { await Promise.all(repairPromises); } catch (e) { console.warn('Activity log repair failed:', e); }
      }

      return repairedLogs.map(this.convertStoredActivityLog);
    } catch (error) {
      console.warn('Failed to load activity logs from IndexedDB:', error);
      // Try fallback storage and ensure names are backfilled
      const logs: ActivityLog[] = [];
      const shouldReplaceGenericName = (name?: string) => !name || typeof name !== 'string' || name.trim() === '' || name === 'Unknown Exercise' || name === 'Workout';
      this.fallbackStorage.forEach((value, key) => {
        if (key.startsWith('log_')) {
          const raw = value as StoredActivityLog;
          let converted = this.convertStoredActivityLog(raw);
          if (shouldReplaceGenericName(converted.exercise_name)) {
            if (converted.is_workout && converted.workout_id) {
              const fbW = this.fallbackStorage.get(`workout_${converted.workout_id}`) as StoredWorkout | undefined;
              converted = { ...converted, exercise_name: fbW?.name || 'Workout' };
            } else if (converted.exercise_id) {
              const fbE = this.fallbackStorage.get(`exercise_${converted.exercise_id}`) as StoredExercise | undefined;
              converted = { ...converted, exercise_name: fbE?.name || 'Unknown Exercise' };
            }
          }
          logs.push(converted);
        }
      });
      return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
    }
  }

  /**
   * Save user preferences
   */
  public async saveUserPreferences(preferences: UserPreferences): Promise<void> {
    if (!this.canStoreData()) {
      throw new Error('Cannot store data without user consent');
    }

    const prefId = preferences.id || crypto.randomUUID();
    const storedPreferences: StoredUserPreferences = prepareUpsert(preferences, prefId);

    try {
      // Use put() to handle both insert and update operations
      await this.db.user_preferences.put(storedPreferences);
    } catch (error) {
      console.warn('Failed to save user preferences to IndexedDB:', error);
      this.fallbackStorage.set('user_preferences', storedPreferences);
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
      const storedPreferences = await this.db.user_preferences.orderBy('updated_at').last();
      if (storedPreferences) {
        return storedPreferences;
      }
      return null;
    } catch (error) {
      console.warn('Failed to load user preferences from IndexedDB:', error);
      const fallback = this.fallbackStorage.get('user_preferences') as UserPreferences | undefined;
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

    const settingsId = settings.id || crypto.randomUUID();
    const storedSettings: StoredAppSettings = prepareUpsert(settings, settingsId);

    try {
      // Use put() to handle both insert and update operations
      await this.db.app_settings.put(storedSettings);
    } catch (error) {
      console.warn('Failed to save app settings to IndexedDB:', error);
      this.fallbackStorage.set('app_settings', storedSettings);
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
      const storedSettings = await this.db.app_settings.orderBy('updated_at').last();
      if (storedSettings) {
        return storedSettings;
      }
      return null;
    } catch (error) {
      console.warn('Failed to load app settings from IndexedDB:', error);
      const fallback = this.fallbackStorage.get('app_settings') as AppSettings | undefined;
      if (fallback) {
        return fallback;
      }
      return null;
    }
  }


  /**
   * Clear all user data for GDPR compliance
   */
  public async clearAllData(): Promise<void> {
    try {
      await Promise.all([
        this.db.exercises.clear(),
        this.db.activity_logs.clear(),
        this.db.user_preferences.clear(),
        this.db.app_settings.clear(),
        this.db.workouts.clear(),
        this.db.workout_sessions.clear()
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
        this.db.activity_logs.count(),
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
  // Throw to ensure the returned Promise is rejected as tests expect
  throw new Error('Cannot store data without user consent');
    }

  const workoutId = workout.id || crypto.randomUUID();
  const workoutWithSync = prepareUpsert(workout, workoutId);
    const storedWorkout: StoredWorkout = {
      ...workoutWithSync,
      created_at: typeof workout.created_at === 'string' ? workout.created_at : new Date().toISOString()
    };

    try {
      await this.db.workouts.put(storedWorkout);
    } catch (error) {
      console.warn('Failed to save workout to IndexedDB:', error);
      // Use the resolved workoutId so downstream lookups (e.g., resolveWorkoutName) find it
      this.fallbackStorage.set(`workout_${workoutId}`, storedWorkout);
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
      const storedWorkouts = await this.db.workouts.orderBy('updated_at').reverse().toArray();
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

  const sessionId = session.id || crypto.randomUUID();
    const sessionWithSync = prepareUpsert(session, sessionId);
    const storedSession: StoredWorkoutSession = {
      ...sessionWithSync,
      start_time: session.start_time,
      end_time: session.end_time
    };

    try {
      await this.db.workout_sessions.put(storedSession);
    } catch (error) {
      console.warn('Failed to save workout session to IndexedDB:', error);
      // Use generated sessionId to ensure consistent fallback key
      this.fallbackStorage.set(`session_${sessionId}`, storedSession);
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
      let query = this.db.workout_sessions.orderBy('start_time').reverse();

      if (fromDate) {
        query = query.filter(session => session.start_time >= fromDate.toISOString());
      }

      if (workoutId) {
        query = query.filter(session => session.workout_id === workoutId);
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
        .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
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
      const session = await this.db.workout_sessions.get(sessionId);
      if (session) {
        const deletedSession = prepareSoftDelete(session);
        await this.db.workout_sessions.put(deletedSession);
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
      const log = await this.db.activity_logs.get(activityLogId);
      if (log) {
        const deletedLog = prepareSoftDelete(log);
        await this.db.activity_logs.put(deletedLog);
        console.log(`Activity log ${activityLogId} soft deleted successfully`);
      }
    } catch (error) {
      console.error('Failed to soft delete activity log from IndexedDB:', error);
      // Remove from fallback storage (align with 'log_' prefix used for fallback saves)
      this.fallbackStorage.delete(`log_${activityLogId}`);
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
        this.db.activity_logs.where('dirty').equals(1).toArray(),
        this.db.user_preferences.where('dirty').equals(1).toArray(),
        this.db.app_settings.where('dirty').equals(1).toArray(),
        this.db.workouts.where('dirty').equals(1).toArray(),
        this.db.workout_sessions.where('dirty').equals(1).toArray()
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
      const updateData = { dirty: 0, synced_at: now };

      switch (table) {
        case 'exercises':
          await this.db.exercises.bulkUpdate(ids.map(id => ({ key: id, changes: updateData })));
          break;
        case 'activity_logs':
          await this.db.activity_logs.bulkUpdate(ids.map(id => ({ key: id, changes: updateData })));
          break;
        case 'user_preferences':
          await this.db.user_preferences.bulkUpdate(ids.map(id => ({ key: id, changes: updateData })));
          break;
        case 'app_settings':
          await this.db.app_settings.bulkUpdate(ids.map(id => ({ key: id, changes: updateData })));
          break;
        case 'workouts':
          await this.db.workouts.bulkUpdate(ids.map(id => ({ key: id, changes: updateData })));
          break;
        case 'workout_sessions':
          await this.db.workout_sessions.bulkUpdate(ids.map(id => ({ key: id, changes: updateData })));
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
        owner_id: ownerId, 
        updated_at: now, 
        dirty: 1, 
        version: 1 
      };

      // Define tables to claim with friendly names
      const tablesToClaim = [
        { table: this.db.exercises, name: 'exercises' },
        { table: this.db.activity_logs, name: 'activity_logs' },
        { table: this.db.user_preferences, name: 'user_preferences' },
        { table: this.db.app_settings, name: 'app_settings' },
        { table: this.db.workouts, name: 'workouts' },
        { table: this.db.workout_sessions, name: 'workout_sessions' }
      ];

      const results = await Promise.all(
        tablesToClaim.map(async ({ table, name }) => {
          try {
            // Claim records with null, undefined, or empty ownerId
            // Handle empty string case
            const emptyStringCount = await table.where('owner_id').equals('').modify(claimData);
            
            // Handle null/undefined cases by finding all records and filtering
            const allRecords = await table.toArray();
            const nullOrUndefinedRecords = allRecords.filter(record => 
              record.owner_id == null || record.owner_id === undefined
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
      ...stored
    };
  }

  /**
   * Convert stored activity log to runtime format
   */
  private convertStoredActivityLog(stored: StoredActivityLog): ActivityLog {
    return {
      ...stored,
      timestamp: stored.timestamp
    } as ActivityLog;
  }

  /**
   * Convert stored workout to runtime format
   */
  private convertStoredWorkout(stored: StoredWorkout): Workout {
    return {
      ...stored,
      created_at: stored.created_at
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
      start_time: stored.start_time,
      end_time: stored.end_time
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
      
      try {
        // Try to delete the entire database (preferred when IndexedDB is available)
        await this.db.delete();
      } catch (hardDeleteError) {
        // In test/JSDOM or constrained environments, delete() may not work because
        // indexedDB.deleteDatabase returns an incomplete mock/request. Fall back to a soft reset.
        console.warn('⚠️ Hard delete failed, performing soft reset instead:', hardDeleteError);
        try {
          // Best-effort: attempt to clear all known tables if the DB can be accessed
          await Promise.allSettled([
            this.db.table('exercises').clear(),
            this.db.table('activity_logs').clear(),
            this.db.table('user_preferences').clear(),
            this.db.table('app_settings').clear(),
            this.db.table('workouts').clear(),
            this.db.table('workout_sessions').clear(),
          ]);
        } catch (softError) {
          // Ignore – we'll recreate a fresh instance anyway
          console.warn('Soft clear during reset encountered issues (safe to ignore in tests):', softError);
        }
      }

      // Recreate the database instance regardless of hard/soft path
      this.db = new RepCueDatabase();
      try {
        await this.db.open();
      } catch (openErr) {
        // In environments without IndexedDB, open may fail; we still consider reset successful
        console.warn('DB open after reset failed (likely no IndexedDB in test env). Continuing with in-memory fallback.', openErr);
      }
      
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
      await this.db.user_preferences.count();
      await this.db.app_settings.count();
      
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