import Dexie from 'dexie';
import type { Table, Transaction } from 'dexie';
import type {
  Exercise,
  GlobalExercise,
  CatalogMembership,
  ActivityLog,
  UserPreferences,
  AppSettings,
  Workout,
  WorkoutSession,
  UserFavorite,
  SyncMetadata,
  ExerciseCatalog
} from '../types';
import type { PersonalRecord } from '../types/coaching';
import type { UserProfile } from '../types/userProfile';
import { consentService } from './consentService';
import { authService } from './authService';
import { SYNC_DEBUG } from '../config/features';
import { DEFAULT_APP_SETTINGS } from '../constants';
import {
  prepareUpsert,
  prepareSoftDelete,
  filterActiveRecords
} from './syncHelpers';
import logger from '../utils/logger';

// Database schema interfaces with sync metadata
interface StoredActivityLog extends Omit<ActivityLog, 'timestamp'> {
  timestamp: string; // ISO string for IndexedDB storage
}

type StoredUserPreferences = UserPreferences;

type StoredAppSettings = AppSettings;

type StoredUserFavorite = UserFavorite;

// Exercise types: Support both legacy Exercise and new GlobalExercise during migration
type StoredExercise = Exercise | GlobalExercise;

// Catalog membership type for many-to-many relationship
type StoredCatalogMembership = CatalogMembership;

// Workout-related data interfaces  
type StoredWorkout = Workout;

type StoredWorkoutSession = WorkoutSession;

// Personal records for tracking exercise achievements
type StoredPersonalRecord = PersonalRecord;

// User profile for fitness information
type StoredUserProfile = UserProfile;

// Video file storage for offline-first approach
interface StoredVideoFile extends SyncMetadata {
  exercise_id: string;
  file_name: string;
  file_data: Blob; // The actual video file stored as Blob for IndexedDB compatibility
  file_size: number;
  mime_type: string;
  upload_pending: boolean; // true if needs to sync to cloud storage
  storage_path?: string; // Path in Supabase Storage after successful upload
}

/**
 * IndexedDB-based storage service using Dexie
 * Handles all persistent data storage with consent checking
 */
class RepCueDatabase extends Dexie {
  exercises!: Table<StoredExercise>;
  catalog_memberships!: Table<StoredCatalogMembership>;
  activity_logs!: Table<StoredActivityLog>;
  user_preferences!: Table<StoredUserPreferences>;
  app_settings!: Table<StoredAppSettings>;
  user_favorites!: Table<StoredUserFavorite>;
  workouts!: Table<StoredWorkout>;
  workout_sessions!: Table<StoredWorkoutSession>;
  video_files!: Table<StoredVideoFile>;
  exercise_catalogs!: Table<ExerciseCatalog>;
  personal_records!: Table<StoredPersonalRecord>;
  user_profiles!: Table<StoredUserProfile>;

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

    // Version 8: Add missing index on activity_logs.workout_id to support queries and normalization
    // This aligns our IndexedDB indexes with server-side access patterns and prevents Dexie SchemaError
    this.version(8).stores({
      exercises: 'id, name, category, exercise_type, is_favorite, updated_at, created_at, owner_id, deleted, version, dirty',
      // Added workout_id to indexed fields
      activity_logs: 'id, exercise_id, exercise_name, workout_id, timestamp, duration, updated_at, created_at, owner_id, deleted, version, dirty',
      user_preferences: 'id, owner_id, sound_enabled, vibration_enabled, default_interval_duration, dark_mode, updated_at, created_at, deleted, version, dirty',
      app_settings: 'id, owner_id, interval_duration, sound_enabled, vibration_enabled, beep_volume, dark_mode, updated_at, created_at, deleted, version, dirty',
      workouts: 'id, name, description, scheduled_days, is_active, estimated_duration, updated_at, created_at, owner_id, deleted, version, dirty',
      workout_sessions: 'id, workout_id, workout_name, start_time, end_time, is_completed, completion_percentage, total_duration, updated_at, created_at, owner_id, deleted, version, dirty'
    });

    // Version 9: Add user_favorites table for user-created exercise favorites
    this.version(9).stores({
      exercises: 'id, name, category, exercise_type, is_favorite, updated_at, created_at, owner_id, deleted, version, dirty',
      activity_logs: 'id, exercise_id, exercise_name, workout_id, timestamp, duration, updated_at, created_at, owner_id, deleted, version, dirty',
      user_preferences: 'id, owner_id, sound_enabled, vibration_enabled, default_interval_duration, dark_mode, updated_at, created_at, deleted, version, dirty',
      app_settings: 'id, owner_id, interval_duration, sound_enabled, vibration_enabled, beep_volume, dark_mode, updated_at, created_at, deleted, version, dirty',
      user_favorites: 'id, owner_id, item_id, item_type, exercise_type, updated_at, created_at, deleted, version, dirty',
      workouts: 'id, name, description, scheduled_days, is_active, estimated_duration, updated_at, created_at, owner_id, deleted, version, dirty',
      workout_sessions: 'id, workout_id, workout_name, start_time, end_time, is_completed, completion_percentage, total_duration, updated_at, created_at, owner_id, deleted, version, dirty'
    });

    // Version 10: Add sync_state table for per-user per-table cursor and metadata (v2 sync engine)
    this.version(10).stores({
      exercises: 'id, name, category, exercise_type, is_favorite, updated_at, created_at, owner_id, deleted, version, dirty',
      activity_logs: 'id, exercise_id, exercise_name, workout_id, timestamp, duration, updated_at, created_at, owner_id, deleted, version, dirty',
      user_preferences: 'id, owner_id, sound_enabled, vibration_enabled, default_interval_duration, dark_mode, updated_at, created_at, deleted, version, dirty',
      app_settings: 'id, owner_id, interval_duration, sound_enabled, vibration_enabled, beep_volume, dark_mode, updated_at, created_at, deleted, version, dirty',
      user_favorites: 'id, owner_id, item_id, item_type, exercise_type, updated_at, created_at, deleted, version, dirty',
      workouts: 'id, name, description, scheduled_days, is_active, estimated_duration, updated_at, created_at, owner_id, deleted, version, dirty',
      workout_sessions: 'id, workout_id, workout_name, start_time, end_time, is_completed, completion_percentage, total_duration, updated_at, created_at, owner_id, deleted, version, dirty',
      // sync_state: key = user_id (only one row per user) — store JSON blobs for cursors & metrics
      sync_state: 'user_id'
    });

    // Version 11: owner_id indexes are already present from version 6 - no schema changes needed
    // Just increment version for migration tracking purposes
    this.version(11).stores({
      exercises: 'id, name, category, exercise_type, is_favorite, updated_at, created_at, owner_id, deleted, version, dirty',
      activity_logs: 'id, exercise_id, exercise_name, workout_id, timestamp, duration, updated_at, created_at, owner_id, deleted, version, dirty',
      user_preferences: 'id, owner_id, sound_enabled, vibration_enabled, default_interval_duration, dark_mode, updated_at, created_at, deleted, version, dirty',
      app_settings: 'id, owner_id, interval_duration, sound_enabled, vibration_enabled, beep_volume, dark_mode, updated_at, created_at, deleted, version, dirty',
      user_favorites: 'id, owner_id, item_id, item_type, exercise_type, updated_at, created_at, deleted, version, dirty',
      workouts: 'id, name, description, scheduled_days, is_active, estimated_duration, updated_at, created_at, owner_id, deleted, version, dirty',
      workout_sessions: 'id, workout_id, workout_name, start_time, end_time, is_completed, completion_percentage, total_duration, updated_at, created_at, owner_id, deleted, version, dirty',
      sync_state: 'user_id'
    });

    // Version 12: Fix user_favorites schema inconsistency - change user_id to owner_id
    this.version(12).stores({
      exercises: 'id, name, category, exercise_type, is_favorite, updated_at, created_at, owner_id, deleted, version, dirty',
      activity_logs: 'id, exercise_id, exercise_name, workout_id, timestamp, duration, updated_at, created_at, owner_id, deleted, version, dirty',
      user_preferences: 'id, owner_id, sound_enabled, vibration_enabled, default_interval_duration, dark_mode, updated_at, created_at, deleted, version, dirty',
      app_settings: 'id, owner_id, interval_duration, sound_enabled, vibration_enabled, beep_volume, dark_mode, updated_at, created_at, deleted, version, dirty',
      user_favorites: 'id, owner_id, item_id, item_type, exercise_type, updated_at, created_at, deleted, version, dirty',
      workouts: 'id, name, description, scheduled_days, is_active, estimated_duration, updated_at, created_at, owner_id, deleted, version, dirty',
      workout_sessions: 'id, workout_id, workout_name, start_time, end_time, is_completed, completion_percentage, total_duration, updated_at, created_at, owner_id, deleted, version, dirty',
      sync_state: 'user_id'
    }).upgrade(tx => {
      // Migrate user_favorites data from user_id to owner_id
      return tx.table('user_favorites').toCollection().modify(record => {
        if (record.user_id && !record.owner_id) {
          record.owner_id = record.user_id;
          delete record.user_id;
        }
      });
    });

    // Version 13: Add video_files table for offline-first video storage
    this.version(13).stores({
      exercises: 'id, name, category, exercise_type, is_favorite, updated_at, created_at, owner_id, deleted, version, dirty',
      activity_logs: 'id, exercise_id, exercise_name, workout_id, timestamp, duration, updated_at, created_at, owner_id, deleted, version, dirty',
      user_preferences: 'id, owner_id, sound_enabled, vibration_enabled, default_interval_duration, dark_mode, updated_at, created_at, deleted, version, dirty',
      app_settings: 'id, owner_id, interval_duration, sound_enabled, vibration_enabled, beep_volume, dark_mode, updated_at, created_at, deleted, version, dirty',
      user_favorites: 'id, owner_id, item_id, item_type, exercise_type, updated_at, created_at, deleted, version, dirty',
      workouts: 'id, name, description, scheduled_days, is_active, estimated_duration, updated_at, created_at, owner_id, deleted, version, dirty',
      workout_sessions: 'id, workout_id, workout_name, start_time, end_time, is_completed, completion_percentage, total_duration, updated_at, created_at, owner_id, deleted, version, dirty',
      sync_state: 'user_id',
      video_files: 'id, exercise_id, file_name, upload_pending, updated_at, created_at, owner_id, deleted, version, dirty'
    });

    // Version 14: Update video_files schema to include file_size and mime_type indexes for better querying
    this.version(14).stores({
      exercises: 'id, name, category, exercise_type, is_favorite, updated_at, created_at, owner_id, deleted, version, dirty',
      activity_logs: 'id, exercise_id, exercise_name, workout_id, timestamp, duration, updated_at, created_at, owner_id, deleted, version, dirty',
      user_preferences: 'id, owner_id, sound_enabled, vibration_enabled, default_interval_duration, dark_mode, updated_at, created_at, deleted, version, dirty',
      app_settings: 'id, owner_id, interval_duration, sound_enabled, vibration_enabled, beep_volume, dark_mode, updated_at, created_at, deleted, version, dirty',
      user_favorites: 'id, owner_id, item_id, item_type, exercise_type, updated_at, created_at, deleted, version, dirty',
      workouts: 'id, name, description, scheduled_days, is_active, estimated_duration, updated_at, created_at, owner_id, deleted, version, dirty',
      workout_sessions: 'id, workout_id, workout_name, start_time, end_time, is_completed, completion_percentage, total_duration, updated_at, created_at, owner_id, deleted, version, dirty',
      sync_state: 'user_id',
      video_files: 'id, exercise_id, file_name, file_size, mime_type, upload_pending, updated_at, created_at, owner_id, deleted, version, dirty'
    });

    // Version 15: Add shared exercise tracking fields to exercises table
    this.version(15).stores({
      exercises: 'id, name, category, exercise_type, is_favorite, updated_at, created_at, owner_id, deleted, version, dirty, shared_from_exercise_id, shared_from_user_id, is_shared_copy',
      activity_logs: 'id, exercise_id, exercise_name, workout_id, timestamp, duration, updated_at, created_at, owner_id, deleted, version, dirty',
      user_preferences: 'id, owner_id, sound_enabled, vibration_enabled, default_interval_duration, dark_mode, updated_at, created_at, deleted, version, dirty',
      app_settings: 'id, owner_id, interval_duration, sound_enabled, vibration_enabled, beep_volume, dark_mode, updated_at, created_at, deleted, version, dirty',
      user_favorites: 'id, owner_id, item_id, item_type, exercise_type, updated_at, created_at, deleted, version, dirty',
      workouts: 'id, name, description, scheduled_days, is_active, estimated_duration, updated_at, created_at, owner_id, deleted, version, dirty',
      workout_sessions: 'id, workout_id, workout_name, start_time, end_time, is_completed, completion_percentage, total_duration, updated_at, created_at, owner_id, deleted, version, dirty',
      sync_state: 'user_id',
      video_files: 'id, exercise_id, file_name, file_size, mime_type, upload_pending, updated_at, created_at, owner_id, deleted, version, dirty'
    });

    // Version 16: Add catalog support and extended exercise metadata fields
    this.version(16).stores({
      exercises: 'id, name, category, exercise_type, catalogId, is_favorite, updated_at, created_at, owner_id, deleted, version, dirty, shared_from_exercise_id, shared_from_user_id, is_shared_copy',
      activity_logs: 'id, exercise_id, exercise_name, workout_id, timestamp, duration, updated_at, created_at, owner_id, deleted, version, dirty',
      user_preferences: 'id, owner_id, sound_enabled, vibration_enabled, default_interval_duration, dark_mode, updated_at, created_at, deleted, version, dirty',
      app_settings: 'id, owner_id, interval_duration, sound_enabled, vibration_enabled, beep_volume, dark_mode, updated_at, created_at, deleted, version, dirty',
      user_favorites: 'id, owner_id, item_id, item_type, exercise_type, updated_at, created_at, deleted, version, dirty',
      workouts: 'id, name, description, scheduled_days, is_active, estimated_duration, updated_at, created_at, owner_id, deleted, version, dirty',
      workout_sessions: 'id, workout_id, workout_name, start_time, end_time, is_completed, completion_percentage, total_duration, updated_at, created_at, owner_id, deleted, version, dirty',
      sync_state: 'user_id',
      video_files: 'id, exercise_id, file_name, file_size, mime_type, upload_pending, updated_at, created_at, owner_id, deleted, version, dirty',
      // NEW: Exercise catalogs table with full sync support
      exercise_catalogs: 'id, name_key, description_key, is_default, is_premium, display_order, updated_at, created_at, deleted, version, dirty'
    }).upgrade(trans => {
      // Migrate existing exercises to add catalogId field
      return trans.table('exercises').toCollection().modify((exercise: Record<string, unknown>) => {
        if (!exercise.catalogId) {
          exercise.catalogId = 'general-fitness'; // All existing exercises go to general fitness
        }
      });
    });

    // Version 18: Force database refresh to fix catalog assignments
    this.version(18).stores({
      exercises: 'id, name, category, exercise_type, catalogId, is_favorite, updated_at, created_at, owner_id, deleted, version, dirty, shared_from_exercise_id, shared_from_user_id, is_shared_copy',
      activity_logs: 'id, exercise_id, exercise_name, workout_id, timestamp, duration, updated_at, created_at, owner_id, deleted, version, dirty',
      user_preferences: 'id, owner_id, sound_enabled, vibration_enabled, default_interval_duration, dark_mode, updated_at, created_at, deleted, version, dirty',
      app_settings: 'id, owner_id, interval_duration, sound_enabled, vibration_enabled, beep_volume, dark_mode, updated_at, created_at, deleted, version, dirty',
      user_favorites: 'id, owner_id, item_id, item_type, exercise_type, updated_at, created_at, deleted, version, dirty',
      workouts: 'id, name, description, scheduled_days, is_active, estimated_duration, updated_at, created_at, owner_id, deleted, version, dirty',
      workout_sessions: 'id, workout_id, workout_name, start_time, end_time, is_completed, completion_percentage, total_duration, updated_at, created_at, owner_id, deleted, version, dirty',
      sync_state: 'user_id',
      video_files: 'id, exercise_id, file_name, file_size, mime_type, upload_pending, updated_at, created_at, owner_id, deleted, version, dirty',
      exercise_catalogs: 'id, name_key, description_key, is_default, is_premium, display_order, updated_at, created_at, deleted, version, dirty'
    }).upgrade(async (trans) => {
      // Version 18: Force complete database refresh
      logger.log('[Migration v18] Clearing all exercises for fresh start with proper catalog assignments');

      // Clear all exercises to force fresh seeding
      await trans.table('exercises').clear();

      // Clear exercise catalogs to force fresh seeding
      await trans.table('exercise_catalogs').clear();

      logger.log('[Migration v18] Database cleared, will trigger fresh seeding on next access');
    });

    // Version 19: Add catalog_id field to activity_logs table
    this.version(19).stores({
      exercises: 'id, name, category, exercise_type, catalogId, is_favorite, updated_at, created_at, owner_id, deleted, version, dirty, shared_from_exercise_id, shared_from_user_id, is_shared_copy',
      activity_logs: 'id, exercise_id, exercise_name, catalog_id, workout_id, timestamp, duration, updated_at, created_at, owner_id, deleted, version, dirty',
      user_preferences: 'id, owner_id, sound_enabled, vibration_enabled, default_interval_duration, dark_mode, updated_at, created_at, deleted, version, dirty',
      app_settings: 'id, owner_id, interval_duration, sound_enabled, vibration_enabled, beep_volume, dark_mode, updated_at, created_at, deleted, version, dirty',
      user_favorites: 'id, owner_id, item_id, item_type, exercise_type, updated_at, created_at, deleted, version, dirty',
      workouts: 'id, name, description, scheduled_days, is_active, estimated_duration, updated_at, created_at, owner_id, deleted, version, dirty',
      workout_sessions: 'id, workout_id, workout_name, start_time, end_time, is_completed, completion_percentage, total_duration, updated_at, created_at, owner_id, deleted, version, dirty',
      sync_state: 'user_id',
      video_files: 'id, exercise_id, file_name, file_size, mime_type, upload_pending, updated_at, created_at, owner_id, deleted, version, dirty',
      exercise_catalogs: 'id, name_key, description_key, is_default, is_premium, display_order, updated_at, created_at, deleted, version, dirty'
    });

    // Version 20: Add app_version field to app_settings for dynamic version tracking
    this.version(20).stores({
      exercises: 'id, name, category, exercise_type, catalogId, is_favorite, updated_at, created_at, owner_id, deleted, version, dirty, shared_from_exercise_id, shared_from_user_id, is_shared_copy',
      activity_logs: 'id, exercise_id, exercise_name, catalog_id, workout_id, timestamp, duration, updated_at, created_at, owner_id, deleted, version, dirty',
      user_preferences: 'id, owner_id, sound_enabled, vibration_enabled, default_interval_duration, dark_mode, updated_at, created_at, deleted, version, dirty',
      app_settings: 'id, owner_id, interval_duration, sound_enabled, vibration_enabled, beep_volume, dark_mode, app_version, updated_at, created_at, deleted, version, dirty',
      user_favorites: 'id, owner_id, item_id, item_type, exercise_type, updated_at, created_at, deleted, version, dirty',
      workouts: 'id, name, description, scheduled_days, is_active, estimated_duration, updated_at, created_at, owner_id, deleted, version, dirty',
      workout_sessions: 'id, workout_id, workout_name, start_time, end_time, is_completed, completion_percentage, total_duration, updated_at, created_at, owner_id, deleted, version, dirty',
      sync_state: 'user_id',
      video_files: 'id, exercise_id, file_name, file_size, mime_type, upload_pending, updated_at, created_at, owner_id, deleted, version, dirty',
      exercise_catalogs: 'id, name_key, description_key, is_default, is_premium, display_order, updated_at, created_at, deleted, version, dirty'
    }).upgrade(async (trans) => {
      // Initialize app_version field for existing app_settings records
      logger.log('[Migration v20] Adding app_version field to existing app_settings');

      await trans.table('app_settings').toCollection().modify((settings: Record<string, unknown>) => {
        if (!settings.app_version) {
          settings.app_version = null; // Will be fetched from server on next startup
          logger.log('[Migration v20] Setting app_version to null - will be fetched from server');
        }
      });
    });

    // Version 21: Remove old sharing columns for reference-based sharing system
    this.version(21).stores({
      exercises: 'id, name, category, exercise_type, catalogId, is_favorite, updated_at, created_at, owner_id, deleted, version, dirty',
      activity_logs: 'id, exercise_id, exercise_name, catalog_id, workout_id, timestamp, duration, updated_at, created_at, owner_id, deleted, version, dirty',
      user_preferences: 'id, owner_id, sound_enabled, vibration_enabled, default_interval_duration, dark_mode, updated_at, created_at, deleted, version, dirty',
      app_settings: 'id, owner_id, interval_duration, sound_enabled, vibration_enabled, beep_volume, dark_mode, app_version, updated_at, created_at, deleted, version, dirty',
      user_favorites: 'id, owner_id, item_id, item_type, exercise_type, updated_at, created_at, deleted, version, dirty',
      workouts: 'id, name, description, scheduled_days, is_active, estimated_duration, updated_at, created_at, owner_id, deleted, version, dirty',
      workout_sessions: 'id, workout_id, workout_name, start_time, end_time, is_completed, completion_percentage, total_duration, updated_at, created_at, owner_id, deleted, version, dirty',
      sync_state: 'user_id',
      video_files: 'id, exercise_id, file_name, file_size, mime_type, upload_pending, updated_at, created_at, owner_id, deleted, version, dirty',
      exercise_catalogs: 'id, name_key, description_key, is_default, is_premium, display_order, updated_at, created_at, deleted, version, dirty'
    }).upgrade(async (trans) => {
      // Clean up old sharing-related fields from exercises
      logger.log('[Migration v21] Removing old sharing columns from exercises for reference-based sharing');

      // Remove legacy sharing fields from exercises
      await trans.table('exercises').toCollection().modify((exercise: Record<string, unknown>) => {
        delete exercise.shared_from_exercise_id;
        delete exercise.shared_from_user_id;
        delete exercise.is_shared_copy;
        logger.log(`[Migration v21] Cleaned up sharing fields for exercise ${exercise.id}`);
      });
    });

    // Version 22: Add tags support for catalog badge system
    // Add multiEntry index on tags array for efficient badge filtering
    this.version(22).stores({
      // Added *tags for multi-entry index (allows querying individual tags in the array)
      // Added [catalogId+*tags] for compound index (catalog + tag queries)
      exercises: 'id, name, category, exercise_type, catalogId, is_favorite, *tags, [catalogId+*tags], updated_at, created_at, owner_id, deleted, version, dirty',
      activity_logs: 'id, exercise_id, exercise_name, catalog_id, workout_id, timestamp, duration, updated_at, created_at, owner_id, deleted, version, dirty',
      user_preferences: 'id, owner_id, sound_enabled, vibration_enabled, default_interval_duration, dark_mode, updated_at, created_at, deleted, version, dirty',
      app_settings: 'id, owner_id, interval_duration, sound_enabled, vibration_enabled, beep_volume, dark_mode, app_version, updated_at, created_at, deleted, version, dirty',
      user_favorites: 'id, owner_id, item_id, item_type, exercise_type, updated_at, created_at, deleted, version, dirty',
      workouts: 'id, name, description, scheduled_days, is_active, estimated_duration, updated_at, created_at, owner_id, deleted, version, dirty',
      workout_sessions: 'id, workout_id, workout_name, start_time, end_time, is_completed, completion_percentage, total_duration, updated_at, created_at, owner_id, deleted, version, dirty',
      sync_state: 'user_id',
      video_files: 'id, exercise_id, file_name, file_size, mime_type, upload_pending, updated_at, created_at, owner_id, deleted, version, dirty',
      exercise_catalogs: 'id, name_key, description_key, is_default, is_premium, display_order, updated_at, created_at, deleted, version, dirty'
    });

    // Version 23: Add personal_records table for tracking exercise achievements
    this.version(23).stores({
      exercises: 'id, name, category, exercise_type, catalogId, is_favorite, *tags, [catalogId+*tags], updated_at, created_at, owner_id, deleted, version, dirty',
      activity_logs: 'id, exercise_id, exercise_name, catalog_id, workout_id, timestamp, duration, updated_at, created_at, owner_id, deleted, version, dirty',
      user_preferences: 'id, owner_id, sound_enabled, vibration_enabled, default_interval_duration, dark_mode, updated_at, created_at, deleted, version, dirty',
      app_settings: 'id, owner_id, interval_duration, sound_enabled, vibration_enabled, beep_volume, dark_mode, app_version, updated_at, created_at, deleted, version, dirty',
      user_favorites: 'id, owner_id, item_id, item_type, exercise_type, updated_at, created_at, deleted, version, dirty',
      workouts: 'id, name, description, scheduled_days, is_active, estimated_duration, updated_at, created_at, owner_id, deleted, version, dirty',
      workout_sessions: 'id, workout_id, workout_name, start_time, end_time, is_completed, completion_percentage, total_duration, updated_at, created_at, owner_id, deleted, version, dirty',
      sync_state: 'user_id',
      video_files: 'id, exercise_id, file_name, file_size, mime_type, upload_pending, updated_at, created_at, owner_id, deleted, version, dirty',
      exercise_catalogs: 'id, name_key, description_key, is_default, is_premium, display_order, updated_at, created_at, deleted, version, dirty',
      // NEW: Personal records for tracking exercise achievements (max reps, sets, duration, weight)
      personal_records: 'id, exerciseId, exerciseName, recordType, value, achievedAt, workoutId'
    });

    // Version 24: Add theme_id to app_settings for theme customization feature
    this.version(24).stores({
      exercises: 'id, name, category, exercise_type, catalogId, is_favorite, *tags, [catalogId+*tags], updated_at, created_at, owner_id, deleted, version, dirty',
      activity_logs: 'id, exercise_id, exercise_name, catalog_id, workout_id, timestamp, duration, updated_at, created_at, owner_id, deleted, version, dirty',
      user_preferences: 'id, owner_id, sound_enabled, vibration_enabled, default_interval_duration, dark_mode, updated_at, created_at, deleted, version, dirty',
      app_settings: 'id, owner_id, interval_duration, sound_enabled, vibration_enabled, beep_volume, dark_mode, theme_id, app_version, updated_at, created_at, deleted, version, dirty',
      user_favorites: 'id, owner_id, item_id, item_type, exercise_type, updated_at, created_at, deleted, version, dirty',
      workouts: 'id, name, description, scheduled_days, is_active, estimated_duration, updated_at, created_at, owner_id, deleted, version, dirty',
      workout_sessions: 'id, workout_id, workout_name, start_time, end_time, is_completed, completion_percentage, total_duration, updated_at, created_at, owner_id, deleted, version, dirty',
      sync_state: 'user_id',
      video_files: 'id, exercise_id, file_name, file_size, mime_type, upload_pending, updated_at, created_at, owner_id, deleted, version, dirty',
      exercise_catalogs: 'id, name_key, description_key, is_default, is_premium, display_order, updated_at, created_at, deleted, version, dirty',
      personal_records: 'id, exerciseId, exerciseName, recordType, value, achievedAt, workoutId'
    });

    // Version 25: Global Exercise Repository - Many-to-many exercises ↔ catalogs
    // This migration transforms the one-to-many (exercise → catalog) relationship
    // into a many-to-many relationship via catalog_memberships table
    this.version(25).stores({
      // Exercises: Remove catalogId, rename tags → base_tags (catalog-agnostic tags only)
      exercises: 'id, name, category, exercise_type, is_favorite, *base_tags, updated_at, created_at, owner_id, deleted, version, dirty',
      // NEW: Catalog memberships - join table for many-to-many relationship
      // Indexes: exercise_id, catalog_id, [catalog_id+exercise_id] compound, display_order for sorting
      catalog_memberships: 'id, exercise_id, catalog_id, [catalog_id+exercise_id], display_order, updated_at, created_at, owner_id, deleted, version, dirty',
      activity_logs: 'id, exercise_id, exercise_name, catalog_id, workout_id, timestamp, duration, updated_at, created_at, owner_id, deleted, version, dirty',
      user_preferences: 'id, owner_id, sound_enabled, vibration_enabled, default_interval_duration, dark_mode, updated_at, created_at, deleted, version, dirty',
      app_settings: 'id, owner_id, interval_duration, sound_enabled, vibration_enabled, beep_volume, dark_mode, theme_id, app_version, updated_at, created_at, deleted, version, dirty',
      user_favorites: 'id, owner_id, item_id, item_type, exercise_type, updated_at, created_at, deleted, version, dirty',
      workouts: 'id, name, description, scheduled_days, is_active, estimated_duration, updated_at, created_at, owner_id, deleted, version, dirty',
      workout_sessions: 'id, workout_id, workout_name, start_time, end_time, is_completed, completion_percentage, total_duration, updated_at, created_at, owner_id, deleted, version, dirty',
      sync_state: 'user_id',
      video_files: 'id, exercise_id, file_name, file_size, mime_type, upload_pending, updated_at, created_at, owner_id, deleted, version, dirty',
      exercise_catalogs: 'id, name_key, description_key, is_default, is_premium, display_order, updated_at, created_at, deleted, version, dirty',
      personal_records: 'id, exerciseId, exerciseName, recordType, value, achievedAt, workoutId'
    }).upgrade(async (trans) => {
      logger.log('[Migration v25] Starting Global Exercise Repository migration');
      logger.log('[Migration v25] Transforming one-to-many to many-to-many relationship');
      
      const now = new Date().toISOString();
      const memberships: Array<{
        id: string;
        exercise_id: string;
        catalog_id: string;
        catalog_tags: string[];
        display_order: number;
        featured: boolean;
        created_at: string;
        updated_at: string;
        deleted: boolean;
        version: number;
        dirty: number;
        op: string;
        synced_at: string | null;
        owner_id: string | null;
      }> = [];

      // Get all exercises and create memberships
      const exercises = await trans.table('exercises').toArray();
      logger.log(`[Migration v25] Processing ${exercises.length} exercises`);

      for (const exercise of exercises) {
        const catalogId = exercise.catalogId || 'general-fitness';
        // Handle both old (tags) and new (base_tags) format during migration
        const exWithTags = exercise as Exercise & { tags?: string[]; base_tags?: string[] };
        const tags = exWithTags.tags || exercise.base_tags || [];
        
        // Separate catalog-specific tags from base tags
        const catalogTags = tags.filter((tag: string) => {
          // Tags with prefixes like 'category:', 'equipment:', 'kyu:', etc. are catalog-specific
          return tag.includes(':');
        });
        
        const baseTags = tags.filter((tag: string) => {
          // Tags without prefixes are base/universal tags
          return !tag.includes(':');
        });

        // Create membership record
        const membership = {
          id: crypto.randomUUID(),
          exercise_id: exercise.id as string,
          catalog_id: catalogId as string,
          catalog_tags: catalogTags as string[],
          display_order: 0, // Will be set properly when data files are refactored
          featured: false,
          created_at: now,
          updated_at: now,
          deleted: false,
          version: 1,
          dirty: 1, // Mark as dirty to sync to server
          op: 'INSERT',
          synced_at: null,
          owner_id: exercise.owner_id as string | null
        };
        
        memberships.push(membership);

        // Update exercise: remove catalogId, set base_tags
        exercise.base_tags = baseTags;
        delete exercise.catalogId;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (exercise as any).tags; // Remove old tags property during migration
        
        logger.log(`[Migration v25] Exercise ${exercise.id}: ${catalogTags.length} catalog tags, ${baseTags.length} base tags`);
      }

      // Bulk insert memberships
      logger.log(`[Migration v25] Creating ${memberships.length} catalog memberships`);
      await trans.table('catalog_memberships').bulkAdd(memberships);

      // Bulk update exercises
      logger.log(`[Migration v25] Updating ${exercises.length} exercises with base_tags`);
      await trans.table('exercises').bulkPut(exercises);

      logger.log('[Migration v25] Migration complete - exercises now support many-to-many catalogs');
    });

    // Version 26: Add user_profiles table for AI Workout Builder pre-population
    this.version(26).stores({
      exercises: 'id, name, category, exercise_type, is_favorite, *base_tags, updated_at, created_at, owner_id, deleted, version, dirty',
      catalog_memberships: 'id, exercise_id, catalog_id, [catalog_id+exercise_id], display_order, updated_at, created_at, owner_id, deleted, version, dirty',
      activity_logs: 'id, exercise_id, exercise_name, catalog_id, workout_id, timestamp, duration, updated_at, created_at, owner_id, deleted, version, dirty',
      user_preferences: 'id, owner_id, sound_enabled, vibration_enabled, default_interval_duration, dark_mode, updated_at, created_at, deleted, version, dirty',
      app_settings: 'id, owner_id, interval_duration, sound_enabled, vibration_enabled, beep_volume, dark_mode, theme_id, app_version, updated_at, created_at, deleted, version, dirty',
      user_favorites: 'id, owner_id, item_id, item_type, exercise_type, updated_at, created_at, deleted, version, dirty',
      workouts: 'id, name, description, scheduled_days, is_active, estimated_duration, updated_at, created_at, owner_id, deleted, version, dirty',
      workout_sessions: 'id, workout_id, workout_name, start_time, end_time, is_completed, completion_percentage, total_duration, updated_at, created_at, owner_id, deleted, version, dirty',
      sync_state: 'user_id',
      video_files: 'id, exercise_id, file_name, file_size, mime_type, upload_pending, updated_at, created_at, owner_id, deleted, version, dirty',
      exercise_catalogs: 'id, name_key, description_key, is_default, is_premium, display_order, updated_at, created_at, deleted, version, dirty',
      personal_records: 'id, exerciseId, exerciseName, recordType, value, achievedAt, workoutId',
      // NEW: User fitness profiles for AI Workout Builder
      user_profiles: 'id, user_id, owner_id, updated_at, created_at, deleted, version, dirty'
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
          // Align with DEFAULT_APP_SETTINGS (true). Prior value 'false' caused videos hidden on migrated installs.
          show_exercise_videos: true,
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
      logger.error('Migration to unified schema failed:', error);
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
      logger.error('Error getting migration status:', error);
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
  private readyPromise: Promise<void>;
  // Throttle consent warnings to avoid log spam
  private lastConsentWarnAt: number | null = null;
  // Flag to track database reset in progress
  private isResetting = false;
  
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
    this.readyPromise = this.initializeDatabase().catch((e) => {
      // Swallow errors here; callers can proceed with fallback paths
      logger.error('[StorageService] initializeDatabase failed (continuing with fallbacks):', e);
      logger.error('[StorageService] Stack trace:', e instanceof Error ? e.stack : 'No stack available');
    });
  }

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    } else {
      logger.log('[StorageService] getInstance: Returning existing StorageService instance');
    }
    return StorageService.instance;
  }

  /** Wait for IndexedDB open/health checks to complete */
  public async ready(): Promise<void> {
    try { 
      await this.readyPromise; 
    } catch (error) { 
      logger.error('[StorageService] ready() failed:', error);
      /* ignore */ 
    }
  }

  /**
   * Check if database needs upgrade and force it if necessary
   * This is useful when new tables are added (like personal_records in v23)
   * and existing users haven't had their database upgraded yet
   */
  public async checkAndUpgradeDatabase(): Promise<void> {
    try {
      // Persisted version from backend DB (Edge shows 210 for v21)
      const backend = this.db.backendDB?.();
      const persistedVersion = (backend && typeof backend.version === 'number') ? backend.version : 0;
      const latestVersion = 25;

      if (persistedVersion < latestVersion * 10 && navigator.userAgent.includes('Edg/')) {
        // Edge reports version*10; normalize
        logger.log(`[DB] Detected Edge-style version ${persistedVersion}, normalizing for comparison`);
      }

      const normalizedPersisted = navigator.userAgent.includes('Edg/') ? Math.floor(persistedVersion / 10) : persistedVersion;

      if (normalizedPersisted < latestVersion) {
        logger.log(`Database needs upgrade: current v${normalizedPersisted}, latest v${latestVersion}`);
        // Close and reopen to trigger Dexie migration chain
        this.db.close();
        await this.db.open();
        const newBackend = this.db.backendDB?.();
        const newVersion = newBackend?.version ?? 0;
        logger.log(`Database reopened. Backend version now: ${newVersion}`);
      } else {
        logger.log(`Database is up to date at v${normalizedPersisted}`);
      }
    } catch (error) {
      logger.error('Error checking/upgrading database:', error);
    }
  }

  // === v2 sync_state helpers ===
  public async getSyncState(userId: string): Promise<Record<string, unknown> | null> {
    try {
  const maybeDb = this.db as unknown as { sync_state?: { get: (key: string) => Promise<unknown> } };
  const table = maybeDb.sync_state;
  if (!table) return null;
  return (await table.get(userId)) as Record<string, unknown> | null;
    } catch (e) {
      logger.warn('sync_state get failed', e);
      return null;
    }
  }

  public async upsertSyncState(userId: string, data: Record<string, unknown>): Promise<void> {
    try {
  const maybeDb = this.db as unknown as { sync_state?: { put: (value: Record<string, unknown>) => Promise<unknown> } };
  const table = maybeDb.sync_state;
  if (!table) return;
  await table.put({ user_id: userId, ...data });
    } catch (e) {
      logger.warn('sync_state put failed', e);
    }
  }

  public async resetSyncState(userId: string): Promise<void> {
    try {
  const maybeDb = this.db as unknown as { sync_state?: { delete: (key: string) => Promise<unknown> } };
  const table = maybeDb.sync_state;
  if (!table) return;
  await table.delete(userId);
    } catch (e) {
      logger.warn('sync_state delete failed', e);
    }
  }

  // Utility: simple UUID v4 check
  private isUuid(id: unknown): id is string {
    if (typeof id !== 'string') return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
  }

  /**
   * Normalize legacy IDs before syncing so server UUID columns accept inserts.
   * - Ensures activity_logs.id and workout_sessions.id are UUIDs (renames records when needed).
   * - Sets workout_id to null for records where it's not a valid UUID.
   * - Backfills workout activity log names when possible.
   */
  public async normalizeIdsForSync(): Promise<{
    normalized_activity_logs: number;
    normalized_workout_sessions: number;
    normalized_workouts: number;
    cleared_workout_id_refs: number;
  }> {
    const now = new Date().toISOString();
    let normalizedActivityLogs = 0;
    let normalizedWorkoutSessions = 0;
    let normalizedWorkouts = 0;
    let clearedWorkoutRefs = 0;

    await this.db.transaction('rw', this.db.activity_logs, this.db.workout_sessions, this.db.workouts, async () => {
      // 0) Normalize workouts primary keys and cascade references
      const allWorkouts = await this.db.workouts.toArray();
      for (const wk of allWorkouts) {
        if (!this.isUuid(wk.id)) {
          const oldId = wk.id as unknown as string;
          const newId = crypto.randomUUID();
          const newWorkout: StoredWorkout = {
            ...wk,
            id: newId,
            updated_at: now,
            deleted: false,
            version: wk.version || 1,
            dirty: 1
          };
          await this.db.workouts.add(newWorkout);
          await this.db.workouts.delete(oldId);
          normalizedWorkouts++;
          // Update fallback cache
          try { const fb = this.fallbackStorage.get(`workout_${oldId}`); if (fb) { this.fallbackStorage.delete(`workout_${oldId}`); this.fallbackStorage.set(`workout_${newId}`, newWorkout); } } catch {}

          // Cascade update workout_id references in sessions (fallback scan to avoid index requirement)
          const allSessions = await this.db.workout_sessions.toArray();
          const sessionsWithOld = allSessions.filter((s: StoredWorkoutSession) => s.workout_id === oldId);
          for (const s of sessionsWithOld) {
            const updated: StoredWorkoutSession = { ...s, workout_id: newId, updated_at: now, dirty: 1 };
            await this.db.workout_sessions.put(updated);
          }
          // Cascade update in activity logs (fallback scan to avoid index requirement)
          const allLogs = await this.db.activity_logs.toArray();
          const logsWithOld = allLogs.filter((l: StoredActivityLog) => l.workout_id === oldId);
          for (const l of logsWithOld) {
            const updated: StoredActivityLog = { ...l, workout_id: newId, updated_at: now, dirty: 1 };
            await this.db.activity_logs.put(updated);
          }
        }
      }

      // 1) Normalize workout_sessions primary keys and workout_id
      const sessions = await this.db.workout_sessions.toArray();
      for (const session of sessions) {
        let changed = false;

        // Null invalid workout_id (server column is uuid nullable)
        if (session.workout_id && !this.isUuid(session.workout_id)) {
          session.workout_id = undefined;
          changed = true;
          clearedWorkoutRefs++;
        }

        // Ensure UUID id
        if (!this.isUuid(session.id)) {
          const oldId = session.id as unknown as string;
          const newId = crypto.randomUUID();
          // Delete old, reinsert with new id
          const newSession: StoredWorkoutSession = {
            ...session,
            id: newId,
            updated_at: now,
            deleted: false,
            version: session.version || 1,
            dirty: 1
          };
          await this.db.workout_sessions.add(newSession);
          await this.db.workout_sessions.delete(oldId);
          normalizedWorkoutSessions++;
          // Also update fallback cache key for session if present
          try { this.fallbackStorage.delete(`session_${oldId}`); } catch {}
          this.fallbackStorage.set(`session_${newId}`, newSession);
          continue; // handled via reinsert
        }

        if (changed) {
          const updated: StoredWorkoutSession = { ...session, updated_at: now, dirty: 1 };
          await this.db.workout_sessions.put(updated);
        }
      }

      // 2) Normalize activity_logs primary keys and workout_id; backfill workout log names when feasible
      const logs = await this.db.activity_logs.toArray();
      for (const log of logs as (StoredActivityLog & { is_workout?: boolean; workout_id?: string | null })[]) {
        let changed = false;

        // Null invalid workout_id (server column is uuid nullable)
        if (log.workout_id && !this.isUuid(log.workout_id)) {
          log.workout_id = undefined;
          changed = true;
          clearedWorkoutRefs++;
        }

        // Ensure exercise_name for workout logs
        if (log.is_workout) {
          if (!log.exercise_name || log.exercise_name === 'Unknown Exercise') {
            if (log.workout_id) {
              // Try resolve name from workouts table
              const workout = await this.db.workouts.get(log.workout_id);
              if (workout?.name) {
                log.exercise_name = workout.name;
                changed = true;
              }
            }
            if (!log.exercise_name) {
              log.exercise_name = 'Workout';
              changed = true;
            }
          }
        }

        // Ensure UUID id
        if (!this.isUuid(log.id)) {
          const oldId = log.id as unknown as string;
          const newId = crypto.randomUUID();
          const newLog: StoredActivityLog = {
            ...log,
            id: newId,
            updated_at: now,
            deleted: false,
            version: log.version || 1,
            dirty: 1
          };
          await this.db.activity_logs.add(newLog);
          await this.db.activity_logs.delete(oldId);
          normalizedActivityLogs++;
          // Update fallback cache for log if present
          try { this.fallbackStorage.delete(`log_${oldId}`); } catch {}
          this.fallbackStorage.set(`log_${newId}`, newLog);
          continue;
        }

        if (changed) {
          const updated: StoredActivityLog = { ...log, updated_at: now, dirty: 1 };
          await this.db.activity_logs.put(updated);
        }
      }
    });

    return {
      normalized_activity_logs: normalizedActivityLogs,
      normalized_workout_sessions: normalizedWorkoutSessions,
  normalized_workouts: normalizedWorkouts,
      cleared_workout_id_refs: clearedWorkoutRefs
    };
  }

  /**
   * Initialize database and handle errors gracefully
   */
  private async initializeDatabase(): Promise<void> {
    try {
      logger.log('[StorageService] Database current version:', this.db.verno);
      
      // Add timeout to db.open() to detect hangs
      const tOpenStart = Date.now();
      const openTimeout = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Database open timeout after 5s')), 5000);
      });
      
      try {
        await Promise.race([this.db.open(), openTimeout]);
      } catch (error) {
        logger.error('[StorageService] Database open failed:', error);
        
        // If database open times out or fails, try to reset it
        await this.performDatabaseReset();
      }
      const openMs = Date.now() - tOpenStart;
      if (openMs > 1000) {
        logger.warn(`[db] open took ${openMs}ms (verno=${this.db.verno})`);
      } else {
        logger.log(`[db] open took ${openMs}ms (verno=${this.db.verno})`);
      }
      
      // Check database health after opening
      const tHealthStart = Date.now();
      const healthCheck = await this.checkAndRepairDatabase();
      const healthMs = Date.now() - tHealthStart;
      if (healthMs > 1000) {
        logger.warn(`[db] health check took ${healthMs}ms (repaired=${healthCheck.repaired})`);
      } else {
        logger.log(`[db] health check took ${healthMs}ms (repaired=${healthCheck.repaired})`);
      }
      if (healthCheck.repaired) {
        logger.log('🔧 Database was automatically repaired during initialization');
      } else if (!healthCheck.healthy) {
        logger.warn('⚠️ Database health check failed but could not be repaired:', healthCheck.error);
      }
    } catch (error) {
      // Check if this is a schema migration error that we can fix
      const errorObj = error as Error;
      if (errorObj.name === 'UpgradeError' || errorObj.message?.includes('changing primary key')) {
        logger.warn('💾 IndexedDB schema migration failed, clearing database and starting fresh...', error);
        try {
          // Close the current database instance
          this.db.close();
          
          // Delete the entire database to clear schema conflicts
          await this.db.delete();
          
          // Recreate the database with the current schema
          await this.db.open();
          logger.log('✅ IndexedDB cleared and recreated successfully');
          return;
        } catch (resetError) {
          logger.error('❌ Failed to reset IndexedDB:', resetError);
        }
      }
      logger.warn('IndexedDB not available, falling back to memory storage:', error);
    }
  }

  /**
   * Perform database reset with proper state management to prevent concurrent access issues
   */
  private async performDatabaseReset(): Promise<void> {
    if (this.isResetting) {
      logger.warn('[StorageService] Database reset already in progress, skipping concurrent reset');
      return;
    }

    this.isResetting = true;
    logger.warn('[StorageService] Starting database reset process...');

    try {
      // Step 1: Close the current database connection
      logger.log('[StorageService] Step 1: Closing database connection...');
      if (this.db.isOpen()) {
        this.db.close();
        logger.log('[StorageService] Database connection closed');
      } else {
        logger.log('[StorageService] Database was already closed');
      }

      // Step 2: Delete the database
      logger.log('[StorageService] Step 2: Deleting database...');
      await this.db.delete();
      logger.log('[StorageService] Database deleted successfully');

      // Step 3: Create a new database instance
      logger.log('[StorageService] Step 3: Creating new database instance...');
      this.db = new RepCueDatabase();
      logger.log('[StorageService] New database instance created');

      // Step 4: Open the new database with timeout
      logger.log('[StorageService] Step 4: Opening new database...');
      const reopenTimeout = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Database reopen timeout after 5s')), 5000);
      });
      
      await Promise.race([this.db.open(), reopenTimeout]);
      logger.log('[StorageService] ✅ New database opened successfully');

      // Step 5: Create a new readyPromise since the database has been reset
      logger.log('[StorageService] Step 5: Initializing new ready promise...');
      this.readyPromise = Promise.resolve();
      
      logger.log('[StorageService] 🎉 Database reset completed successfully');
    } catch (resetError) {
      logger.error('[StorageService] ❌ Database reset failed:', resetError);
      // Try to recover by creating a fresh instance
      try {
        logger.warn('[StorageService] Attempting recovery with fresh database instance...');
        this.db = new RepCueDatabase();
        await this.db.open();
        this.readyPromise = Promise.resolve();
        logger.log('[StorageService] 🔧 Recovery successful');
      } catch (recoveryError) {
        logger.error('[StorageService] 💥 Recovery failed:', recoveryError);
        // Set readyPromise to rejected state
        this.readyPromise = Promise.reject(new Error('Database reset and recovery failed'));
        throw resetError;
      }
    } finally {
      this.isResetting = false;
      logger.log('[StorageService] Database reset process completed, reset flag cleared');
    }
  }

  /**
   * Check if error is a DatabaseClosedError (during reset or corruption)
   */
  private isDatabaseClosedError(error: unknown): boolean {
    return error instanceof Error && (
      error.name === 'DatabaseClosedError' || 
      error.message.includes('Database has been closed') ||
      error.message.includes('DatabaseClosedError')
    );
  }

  /**
   * Handle database access when database might be resetting
   */
  private async safeDatabaseAccess<T>(operation: () => Promise<T>, fallback: () => T): Promise<T> {
    // If we're in the middle of a reset, wait a bit and return fallback
    if (this.isResetting) {
      logger.warn('[StorageService] Database operation attempted during reset, returning fallback');
      return fallback();
    }

    try {
      return await operation();
    } catch (error) {
      if (this.isDatabaseClosedError(error)) {
        logger.warn('[StorageService] DatabaseClosedError detected, returning fallback');
        return fallback();
      }

      // Handle general IndexedDB errors gracefully in tests and production
      if (error instanceof Error && (error.message.includes('IndexedDB') || error.name === 'DatabaseError')) {
        logger.warn('[StorageService] IndexedDB error detected, returning fallback:', error.message);
        return fallback();
      }

      throw error; // Re-throw other errors
    }
  }

  /**
   * Check if we can store data (consent required)
   */
  private canStoreData(): boolean {
    const ok = consentService.hasConsent();
    if (!ok) {
      const now = Date.now();
      if (!this.lastConsentWarnAt || now - this.lastConsentWarnAt > 5000) {
        this.lastConsentWarnAt = now;
        try {
          const status = consentService.getConsentStatus();
          logger.warn('[consent] Storage blocked: no consent. status=', {
            hasConsent: status.hasConsent,
            version: status.version,
            isLatestVersion: status.isLatestVersion
          });
        } catch {
          logger.warn('[consent] Storage blocked: no consent.');
        }
      }
    }
    return ok;
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
   * Capture a lightweight snapshot for debugging DB state (counts only; no PII).
   */
  public async debugSnapshot(): Promise<{
    verno: number;
    tables: Record<string, number>;
    exerciseIdsSample: string[];
  }> {
    const snapshot = { verno: 0, tables: {} as Record<string, number>, exerciseIdsSample: [] as string[] };
    try {
      snapshot.verno = this.db.verno;
      const tableNames = ['exercises', 'activity_logs', 'user_preferences', 'app_settings', 'workouts', 'workout_sessions'];
      const counts = await Promise.all(tableNames.map(n => this.db.table(n).count().catch(() => 0)));
      tableNames.forEach((n, i) => { snapshot.tables[n] = counts[i]; });
      // Sample first few exercise IDs only (non-PII)
      const sample = await this.db.exercises.limit(5).toArray().catch(() => [] as StoredExercise[]);
      snapshot.exerciseIdsSample = sample.map(e => e.id).filter(Boolean).slice(0, 5) as string[];
    } catch (e) {
      if (e && typeof e === 'object' && 'name' in e && (e as { name: string }).name === 'DatabaseClosedError') {
        logger.warn('[db] Database closed, skipping debugSnapshot');
        return snapshot;
      }
      logger.warn('[db] debugSnapshot failed:', e);
    }
    return snapshot;
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
          let tableData = await this.db.table(tableName).toArray();
          
          // Filter out built-in exercises - only export user-created exercises
          // Built-in exercises are RepCue's intellectual property
          // Activity logs and workout sessions can reference built-in exercises (keep those)
          if (tableName === 'exercises') {
            const { isCustom } = await import('../utils/syncFilters');
            tableData = tableData.filter((exercise: { id?: string }) => {
              return exercise.id && isCustom(exercise.id);
            });
          }
          
          data[tableName] = tableData;
        } catch (error) {
          logger.error(`Error exporting ${tableName}:`, error);
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
      logger.error('Error exporting data:', error);
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
      logger.warn('Failed to save exercise to IndexedDB:', error);
  // Use the resolved exerciseId to avoid undefined keys when caller didn't provide one
  this.fallbackStorage.set(`exercise_${exerciseId}`, storedExercise);
    }
  }

  /**
   * Debug method to check database state
   */
  public async debugDatabaseState(): Promise<void> {
    try {
      logger.log('💾 [Debug] Database version:', this.db.verno);
      logger.log('💾 [Debug] Available tables:', this.db.tables.map(t => t.name));
      logger.log('💾 [Debug] Video files table schema:', {
        name: this.db.video_files?.name,
        schema: this.db.video_files?.schema
      });
      
      // Check if we can access the table
      const count = await this.db.video_files.count();
      logger.log('💾 [Debug] Current video files count:', count);
    } catch (error) {
      logger.error('💾 [Debug] Database state check failed:', error);
    }
  }

  /**
   * Save video file to IndexedDB for offline-first storage
   */
  public async saveVideoFile(exerciseId: string, file: File): Promise<string> {
    if (!this.canStoreData()) {
      throw new Error('Cannot store data without user consent');
    }

    // Validate video format for browser compatibility
    const supportedTypes = [
      'video/mp4',
      'video/webm', 
      'video/ogg',
      'video/avi',
      'video/mov',
      'video/quicktime'
    ];
    
    if (!supportedTypes.includes(file.type)) {
      logger.warn('💾 [VideoFile] Unsupported video format:', file.type);
      throw new Error(`Unsupported video format: ${file.type}. Please use MP4, WebM, or OGG format.`);
    }

    // logger.log('💾 [VideoFile] Saving video file to IndexedDB (singleton approach):', { 
    //   exerciseId, 
    //   fileName: file.name, 
    //   fileSize: file.size,
    //   mimeType: file.type 
    // });

    // SINGLETON APPROACH: Delete any existing video files for this exercise first
    // logger.log('💾 [VideoFile] Deleting existing video files for exercise (singleton approach)...');
    try {
      const existingFiles = await this.db.video_files
        .where('exercise_id')
        .equals(exerciseId)
        .toArray();
      
      if (existingFiles.length > 0) {
        // logger.log('💾 [VideoFile] Found existing files to delete:', existingFiles.length);
        await this.db.video_files
          .where('exercise_id')
          .equals(exerciseId)
          .delete();
        // logger.log('💾 [VideoFile] Existing files deleted successfully');
      } else {
        logger.log('💾 [VideoFile] No existing files found');
      }
    } catch (error) {
      logger.warn('💾 [VideoFile] Failed to delete existing files:', error);
      // Continue with save even if deletion fails
    }

    // Debug database state first
    await this.debugDatabaseState();

    const videoFileId = crypto.randomUUID();
    const userId = this.getCurrentUserId();
    
    // Store File directly as Blob for IndexedDB compatibility
    // logger.log('💾 [VideoFile] Storing file directly as Blob...');
    // logger.log('💾 [VideoFile] File details:', {
    //   name: file.name,
    //   size: file.size,
    //   type: file.type,
    //   constructor: file.constructor.name
    // });
    
    const storedVideoFile: StoredVideoFile = prepareUpsert({
      id: videoFileId,
      exercise_id: exerciseId,
      file_name: file.name,
      file_data: file, // Store the File object directly (which is a Blob)
      file_size: file.size,
      mime_type: file.type,
      upload_pending: true,
      owner_id: userId
    }, videoFileId, userId);

    try {
      logger.log('💾 [VideoFile] About to save video file to IndexedDB:', {
        videoFileId,
        exerciseId,
        fileName: file.name,
        dataSize: file.size,
        storedVideoFileKeys: Object.keys(storedVideoFile)
      });

      // Check if the table exists
      const tableExists = this.db.video_files !== undefined;
      logger.log('💾 [VideoFile] Table exists check:', { tableExists });

      const result = await this.db.video_files.put(storedVideoFile);
      logger.log('💾 [VideoFile] Put operation result:', result);

      // Verify the save by immediately querying back
      const verification = await this.db.video_files.where('id').equals(videoFileId).first();
      logger.log('💾 [VideoFile] Verification query:', {
        found: !!verification,
        id: verification?.id,
        exercise_id: verification?.exercise_id
      });

      logger.log('💾 [VideoFile] Video file saved to IndexedDB successfully');
      
      // Trigger the video upload service to process this pending upload
      // This is non-blocking - upload happens in background
      this.triggerVideoUpload();
      
      // Return the blob URL format that the VideoUploadWidget expects
      return `blob-pending-sync://${exerciseId}/${file.name}`;
    } catch (error) {
      logger.error('💾 [VideoFile] Failed to save video file to IndexedDB:', error);
      logger.error('💾 [VideoFile] Error details:', {
        errorName: error instanceof Error ? error.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  /**
   * Trigger video upload service to process pending uploads
   * Non-blocking - uploads happen in background
   */
  private triggerVideoUpload(): void {
    // Delay slightly to ensure IndexedDB transaction is committed
    setTimeout(async () => {
      try {
        const { default: VideoUploadService } = await import('./videoUploadService');
        const uploadService = VideoUploadService.getInstance();
        await uploadService.initialize();
        logger.log('💾 [VideoFile] Triggering video upload service...');
        await uploadService.processPendingUploads();
      } catch (error) {
        logger.warn('💾 [VideoFile] Failed to trigger video upload:', error);
      }
    }, 1000);
  }

  /**
   * Enrich exercises with custom_video_url for offline-first bidirectional sync
   * Sets blob-pending-sync URLs for exercises that have video files
   */
  private async enrichExercisesWithVideoUrls(exercises: StoredExercise[]): Promise<StoredExercise[]> {
    try {
      logger.log('💾 [EnrichVideo] Starting exercise enrichment with video URLs');

      // Check if video_files table exists (graceful fallback for tests/old databases)
      if (!this.db.video_files) {
        logger.log('💾 [EnrichVideo] video_files table not available, skipping enrichment');
        return exercises;
      }

      // Get all video files (try both approaches to handle different data types)
      let videoFiles = await this.db.video_files.toArray();
      logger.log('💾 [EnrichVideo] Found video files:', videoFiles.length, videoFiles);

      // Filter out deleted files (handle both boolean and numeric values)
      videoFiles = videoFiles.filter(vf => !vf.deleted);
      logger.log('💾 [EnrichVideo] Active video files after filtering:', videoFiles.length);

      // Create a map of exercise_id -> video file for fast lookup
      const videoFileMap = new Map<string, StoredVideoFile>();
      for (const videoFile of videoFiles) {
        videoFileMap.set(videoFile.exercise_id, videoFile);
      }

      // Enrich exercises with video URLs
      const enrichedExercises = exercises.map(exercise => {
        const videoFile = videoFileMap.get(exercise.id);
        if (videoFile) {
          logger.log('💾 [EnrichVideo] Enriching exercise with video:', exercise.name, videoFile.file_name);
          // Choose a more accurate scheme name once upload is confirmed
          const isConfirmed = !videoFile.upload_pending;
          const scheme = isConfirmed ? 'blob-video' : 'blob-pending-sync';
          return {
            ...exercise,
            custom_video_url: `${scheme}://${exercise.id}/${videoFile.file_name}`,
            // Mark as having a video; downstream UI / filters rely on this
            has_video: true
          };
        }
        return exercise;
      });

      const enrichedCount = enrichedExercises.filter(e => e.custom_video_url).length;
      logger.log('💾 [EnrichVideo] Enrichment complete. Exercises with videos:', enrichedCount);

      return enrichedExercises;
    } catch (error) {
      logger.error('💾 [EnrichVideo] Failed to enrich exercises with video URLs:', error);
      return exercises; // Return original exercises if enrichment fails
    }
  }

  /**
   * Reconcile has_video flags for exercises that have an associated (non-deleted) video_file
   * but were previously persisted with has_video = false (legacy behavior).
   * This runs client-side only and marks affected exercises dirty so the corrected flag
   * is propagated on the next sync. Errors are swallowed to avoid blocking getExercises().
   */
  private async reconcileHasVideoFlags(exercises: StoredExercise[]): Promise<StoredExercise[]> {
    try {
      if (!this.db.video_files) return exercises;

      // Build a quick set of exercise IDs that have active video files
      // Dexie typings (IndexableType) don't include boolean; querying on a boolean index
      // with .notEqual(true) triggers TS errors. Instead, fetch all and filter in memory.
      // Volume of video_files is expected to be very small (singleton per exercise), so
      // this is acceptable and avoids brittle type coercions.
      const activeVideoFiles = await this.db.video_files
        .toArray()
        .then(all => all.filter(v => !(v as { deleted?: boolean }).deleted))
        .catch(async () => {
          // If even the base query fails, fall back to empty list
          return [] as StoredVideoFile[];
        });

      const videoExerciseIds = new Set<string>();
      for (const vf of activeVideoFiles) {
        videoExerciseIds.add((vf as { exercise_id: string }).exercise_id);
      }

      const dbExercises = this.db.exercises; // for updates
      const updated: Exercise[] = [];
      for (const ex of exercises) {
        if (videoExerciseIds.has(ex.id) && !ex.has_video) {
          try {
            // Update local record & mark dirty so it syncs outward
            await dbExercises.update(ex.id, {
              has_video: true,
              dirty: 1,
              op: 'upsert',
              updated_at: new Date().toISOString()
            });
            updated.push({ ...ex, has_video: true });
          } catch (e) {
            logger.warn('💾 [VideoReconcile] Failed to update has_video for exercise', ex.id, e);
            updated.push(ex); // keep original
          }
        } else {
          updated.push(ex);
        }
      }

      if (updated.some(e => e.has_video && !exercises.find(o => o.id === e.id)?.has_video)) {
        logger.log('💾 [VideoReconcile] Applied has_video corrections to exercises');
      }

      return updated;
    } catch (error) {
      logger.warn('💾 [VideoReconcile] Reconciliation failed', error);
      return exercises;
    }
  }

  /**
   * Get video file for an exercise
   */
  public async getVideoFile(exerciseId: string): Promise<StoredVideoFile | null> {
    if (!this.canStoreData()) {
      logger.warn('💾 [VideoFile] Cannot get video file - no data storage consent');
      return null;
    }

    try {
      logger.log('💾 [VideoFile] Querying for video file with exercise_id:', exerciseId);
      
      const videoFiles = await this.db.video_files
        .where('exercise_id')
        .equals(exerciseId)
        .and(record => !record.deleted)
        .toArray();
      
      logger.log('💾 [VideoFile] Query result:', {
        exerciseId,
        foundFiles: videoFiles.length,
        files: videoFiles.map(f => ({ 
          id: f.id, 
          exercise_id: f.exercise_id, 
          file_name: f.file_name,
          deleted: f.deleted,
          file_size: f.file_size,
          created_at: f.created_at,
          hasFileData: !!f.file_data
        }))
      });
      
      // Sort by created_at descending to get the most recent file first
      videoFiles.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      // Try to find a file with actual file_data first
      const fileWithData = videoFiles.find(f => f.file_data);
      if (fileWithData) {
        logger.log('💾 [VideoFile] Found video file with data:', {
          id: fileWithData.id,
          created_at: fileWithData.created_at,
          hasFileData: !!fileWithData.file_data,
          fileDataSize: fileWithData.file_data?.size
        });
        return fileWithData;
      }
      
      // logger.warn('💾 [VideoFile] No video files with file_data found, returning most recent:', {
      //   mostRecentId: videoFiles[0]?.id,
      //   mostRecentCreatedAt: videoFiles[0]?.created_at
      // });
      
      return videoFiles.length > 0 ? videoFiles[0] : null;
    } catch (error) {
      logger.warn('💾 [VideoFile] Failed to get video file from IndexedDB:', error);
      return null;
    }
  }

  /**
   * Delete video file from IndexedDB
   */
  public async deleteVideoFile(exerciseId: string): Promise<void> {
    if (!this.canStoreData()) {
      return;
    }

    try {
      const videoFiles = await this.db.video_files
        .where('exercise_id')
        .equals(exerciseId)
        .toArray();
      
      for (const videoFile of videoFiles) {
        // Soft delete the record
        const updatedVideoFile: Partial<StoredVideoFile> = {
          deleted: true,
          updated_at: new Date().toISOString(),
          dirty: 1
        };
        await this.db.video_files.update(videoFile.id, updatedVideoFile);
      }
      
      logger.log('💾 [VideoFile] Video file deleted successfully for exercise:', exerciseId);
    } catch (error) {
      logger.warn('💾 [VideoFile] Failed to delete video file:', error);
    }
  }

  /**
   * Get video files for a specific exercise ID
   */
  public async getVideoFilesByExerciseId(exerciseId: string): Promise<StoredVideoFile[]> {
    if (!this.canStoreData()) {
      return [];
    }

    try {
      return await this.db.video_files
        .where('exercise_id')
        .equals(exerciseId)
        .toArray();
    } catch (error) {
      logger.warn('💾 [VideoFile] Failed to get video files by exercise ID:', error);
      return [];
    }
  }

  /**
   * Get all video files pending sync to cloud storage
   */
  public async getVideoFilesPendingSync(): Promise<StoredVideoFile[]> {
    if (!this.canStoreData()) {
      return [];
    }

    try {
      return await this.db.video_files
        .where('upload_pending')
        .equals(1)
        .and(record => !record.deleted)
        .toArray();
    } catch (error) {
      logger.warn('💾 [VideoFile] Failed to get video files pending sync:', error);
      return [];
    }
  }

  /**
   * Mark video file as uploaded to cloud storage
   */
  public async markVideoFileUploaded(videoFileId: string, cloudUrl: string): Promise<void> {
    if (!this.canStoreData()) {
      return;
    }

    try {
      const updatedVideoFile: Partial<StoredVideoFile> = {
        upload_pending: false,
        updated_at: new Date().toISOString(),
        dirty: 1
      };
      await this.db.video_files.update(videoFileId, updatedVideoFile);
      
      logger.log('💾 [VideoFile] Video file marked as uploaded:', { videoFileId, cloudUrl });
    } catch (error) {
      logger.warn('💾 [VideoFile] Failed to mark video file as uploaded:', error);
    }
  }

  /**
   * Clean up deleted video files from IndexedDB to free up space
   * This removes records marked as deleted=true that are taking up space
   */
  public async cleanupDeletedVideoFiles(): Promise<{ deletedCount: number; freedSpaceMB: number }> {
    if (!this.canStoreData()) {
      return { deletedCount: 0, freedSpaceMB: 0 };
    }

    try {
      logger.log('💾 [VideoCleanup] Starting cleanup of deleted video files...');

      // Get all deleted video files
      const deletedVideoFiles = await this.db.video_files
        .where('deleted')
        .equals(1)
        .toArray();

      logger.log(`💾 [VideoCleanup] Found ${deletedVideoFiles.length} deleted video files to remove`);

      if (deletedVideoFiles.length === 0) {
        return { deletedCount: 0, freedSpaceMB: 0 };
      }

      // Calculate space to be freed (approximate)
      const totalSize = deletedVideoFiles.reduce((total, file) => {
        const fileSize = file.file_size || 0;
        const blobSize = file.file_data?.size || 0;
        return total + Math.max(fileSize, blobSize);
      }, 0);

      const freedSpaceMB = Math.round(totalSize / (1024 * 1024) * 100) / 100;

      // Remove deleted video files in batches to avoid blocking UI
      const batchSize = 10;
      let deletedCount = 0;

      for (let i = 0; i < deletedVideoFiles.length; i += batchSize) {
        const batch = deletedVideoFiles.slice(i, i + batchSize);
        const idsToDelete = batch.map(file => file.id);

        // Actually delete from IndexedDB (not just mark as deleted)
        await this.db.video_files.bulkDelete(idsToDelete);
        deletedCount += idsToDelete.length;

        logger.log(`💾 [VideoCleanup] Deleted batch ${Math.ceil((i + 1) / batchSize)} - removed ${idsToDelete.length} records`);

        // Small delay to avoid blocking UI
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      logger.log(`💾 [VideoCleanup] Cleanup complete! Removed ${deletedCount} deleted video files, freed ~${freedSpaceMB}MB`);

      return { deletedCount, freedSpaceMB };
    } catch (error) {
      logger.error('💾 [VideoCleanup] Failed to cleanup deleted video files:', error);
      return { deletedCount: 0, freedSpaceMB: 0 };
    }
  }

  /**
   * Get statistics about video file storage
   */
  public async getVideoFileStats(): Promise<{
    totalFiles: number;
    activeFiles: number;
    deletedFiles: number;
    totalSizeMB: number;
    deletedSizeMB: number;
  }> {
    if (!this.canStoreData()) {
      return { totalFiles: 0, activeFiles: 0, deletedFiles: 0, totalSizeMB: 0, deletedSizeMB: 0 };
    }

    try {
      const allVideoFiles = await this.db.video_files.toArray();
      const activeFiles = allVideoFiles.filter(f => !f.deleted);
      const deletedFiles = allVideoFiles.filter(f => f.deleted);

      const calculateSize = (files: StoredVideoFile[]) => {
        return files.reduce((total, file) => {
          const fileSize = file.file_size || 0;
          const blobSize = file.file_data?.size || 0;
          return total + Math.max(fileSize, blobSize);
        }, 0);
      };

      const totalSize = calculateSize(allVideoFiles);
      const deletedSize = calculateSize(deletedFiles);

      return {
        totalFiles: allVideoFiles.length,
        activeFiles: activeFiles.length,
        deletedFiles: deletedFiles.length,
        totalSizeMB: Math.round(totalSize / (1024 * 1024) * 100) / 100,
        deletedSizeMB: Math.round(deletedSize / (1024 * 1024) * 100) / 100
      };
    } catch (error) {
      logger.error('💾 [VideoStats] Failed to get video file stats:', error);
      return { totalFiles: 0, activeFiles: 0, deletedFiles: 0, totalSizeMB: 0, deletedSizeMB: 0 };
    }
  }

  /**
   * Get all exercises (filtered to exclude deleted records)
   * Now includes shared exercise references from user_favorites
   */
  public async getExercises(): Promise<StoredExercise[]> {
    if (!this.canStoreData()) {
      return [];
    }

    return await this.safeDatabaseAccess(
      async () => {
        const userId = authService.getCurrentUser()?.id;

        const [storedExercises, prefs, sharedRefs, userCreatedFavorites] = await Promise.all([
          this.db.exercises.toArray(),
          this.getUserPreferences().catch(() => null),
          userId ? this.getSharedExerciseReferences(userId) : Promise.resolve([]),
          // Fetch user-created exercise favorites (distinct from built-in favorites stored in preferences)
          userId ? this.db.user_favorites
            .where('owner_id').equals(userId)
            .and(f => f.item_type === 'exercise' && f.exercise_type === 'user_created' && !f.deleted)
            .toArray() : Promise.resolve([])
        ]);

        const favorites = prefs?.favorite_exercises || [];
        const userCreatedFavoriteIds = new Set(userCreatedFavorites.map(f => f.item_id));
        let allExercises = storedExercises
          .map(this.convertStoredExercise)
          .map(ex => ({
            ...ex,
            // Mark as favorite if either:
            // 1) In legacy/ built-in favorites list (user_preferences.favorite_exercises)
            // 2) There is a user_favorites entry marking this user-created exercise as favorite
            is_favorite: favorites.includes(ex.id) || userCreatedFavoriteIds.has(ex.id)
          }));

        // Add shared exercises if user is authenticated
        if (userId && sharedRefs.length > 0) {
          const sharedExerciseIds = sharedRefs.map(ref => ref.item_id);
          const sharedExercises = await this.getSharedExerciseData(sharedExerciseIds);

          // Mark shared exercises as favorites and add metadata
          const enrichedSharedExercises = sharedExercises.map(ex => ({
            ...ex,
            is_favorite: true, // All shared exercises are considered favorites
            is_shared_reference: true, // Flag to indicate this is a reference
            shared_at: sharedRefs.find(ref => ref.item_id === ex.id)?.created_at
          }));

          allExercises = [...allExercises, ...enrichedSharedExercises];
        }

        // Remove duplicates (in case a shared exercise is also owned by the user)
        const uniqueExercises = allExercises.reduce((acc, exercise) => {
          if (!acc.some(ex => ex.id === exercise.id)) {
            acc.push(exercise);
          }
          return acc;
        }, [] as Exercise[]);

        // Enrich exercises with video URLs for offline-first bidirectional sync
        const enrichedExercises = await this.enrichExercisesWithVideoUrls(uniqueExercises);

        // Reconcile has_video flag consistency (in case legacy records still have false)
        try {
          const reconciled = await this.reconcileHasVideoFlags(enrichedExercises);
          return filterActiveRecords(reconciled);
        } catch (err) {
          logger.warn('💾 [VideoReconcile] Failed to reconcile has_video flags – returning enriched list only', err);
          return filterActiveRecords(enrichedExercises);
        }
      },
      () => {
        // Fallback to in-memory storage
        const exercises: Exercise[] = [];
        this.fallbackStorage.forEach((value, key) => {
          if (key.startsWith('exercise_')) {
            exercises.push(this.convertStoredExercise(value as StoredExercise));
          }
        });
        // Try to get preferences for favorites, but don't wait if database is unavailable
        const prefs = this.fallbackStorage.get('user_preferences') as UserPreferences | undefined;
        const favorites = prefs?.favorite_exercises || [];
        const merged = exercises.map(ex => ({ ...ex, is_favorite: favorites.includes(ex.id) }));
        return filterActiveRecords(merged);
      }
    );
  }

  /**
   * Get a single exercise by ID from IndexedDB (offline-first).
   * Handles both user-created exercises (UUID) and built-in exercises.
   *
   * @param exerciseId - Exercise ID (UUID for user-created, slug for built-in)
   * @returns Exercise or null if not found
   */
  public async getExerciseById(exerciseId: string): Promise<Exercise | null> {
    if (!this.canStoreData()) {
      return null;
    }

    return await this.safeDatabaseAccess(
      async () => {
        const userId = authService.getCurrentUser()?.id;

        // Fetch the exercise and related data
        const [storedExercise, prefs, userCreatedFavorites] = await Promise.all([
          this.db.exercises.get(exerciseId),
          this.getUserPreferences().catch(() => null),
          userId ? this.db.user_favorites
            .where('owner_id').equals(userId)
            .and(f => f.item_type === 'exercise' && f.item_id === exerciseId && !f.deleted)
            .first() : Promise.resolve(undefined)
        ]);

        if (!storedExercise || storedExercise.deleted) {
          return null;
        }

        const favorites = prefs?.favorite_exercises || [];
        const isFavorite = favorites.includes(exerciseId) || !!userCreatedFavorites;

        const exercise = {
          ...this.convertStoredExercise(storedExercise),
          is_favorite: isFavorite
        };

        // Enrich with video URL if it has a video
        const enriched = await this.enrichExercisesWithVideoUrls([exercise]);
        return enriched[0] || null;
      },
      () => null
    );
  }

  /**
   * Get exercises by badge tag
   *
   * Efficiently queries exercises that have a specific badge tag
   * using the multi-entry index on tags field.
   *
   * @param catalogId - Catalog ID to filter exercises
   * @param badgeId - Badge identifier (e.g., 'category', 'kyuLevel')
   * @param value - Badge value (e.g., 'core', '5')
   * @returns Array of exercises matching the badge tag
   */
  public async getExercisesByBadge(
    catalogId: string,
    badgeId: string,
    value: string | number
  ): Promise<StoredExercise[]> {
    if (!this.canStoreData()) {
      return [];
    }

    return await this.safeDatabaseAccess(
      async () => {
        const tag = `${badgeId}:${value}`;
        
        // Use compound index [catalogId+*tags] for efficient filtering
        const exercises = await this.db.exercises
          .where('[catalogId+*tags]')
          .equals([catalogId, tag])
          .and(ex => !ex.deleted)
          .toArray();

        return exercises.map(this.convertStoredExercise);
      },
      () => []
    );
  }

  /**
   * Get unique badge values for a catalog
   * 
   * Discovers all unique values for a specific badge within a catalog
   * by scanning exercise tags.
   * 
   * @param catalogId - Catalog ID to filter exercises
   * @param badgeId - Badge identifier to extract values for
   * @returns Array of unique badge values found
   */
  public async getUniqueBadgeValues(
    catalogId: string,
    badgeId: string
  ): Promise<Array<string | number>> {
    if (!this.canStoreData()) {
      return [];
    }

    return await this.safeDatabaseAccess(
      async () => {
        // Get all exercises for the catalog
        const exercises = await this.db.exercises
          .where('catalogId')
          .equals(catalogId)
          .and(ex => !ex.deleted)
          .toArray();

        const uniqueValues = new Set<string | number>();
        const tagPrefix = `${badgeId}:`;

        for (const exercise of exercises) {
          // Handle GlobalExercise which has base_tags
          const globalEx = exercise as GlobalExercise;
          if (!globalEx.base_tags || !Array.isArray(globalEx.base_tags)) {
            continue;
          }

          for (const tag of globalEx.base_tags) {
            if (typeof tag === 'string' && tag.startsWith(tagPrefix)) {
              const value = tag.substring(tagPrefix.length);
              // Try to parse as number if possible
              const numValue = Number(value);
              uniqueValues.add(isNaN(numValue) ? value : numValue);
            }
          }
        }

        return Array.from(uniqueValues).sort();
      },
      () => []
    );
  }

  /**
   * Add tags to an exercise
   * 
   * Appends new tags to an exercise's tags array, avoiding duplicates.
   * Marks the exercise as dirty for sync.
   * 
   * @param exerciseId - Exercise ID
   * @param newTags - Array of tags to add
   * @returns True if successful
   */
  public async addTagsToExercise(
    exerciseId: string,
    newTags: string[]
  ): Promise<boolean> {
    if (!this.canStoreData()) {
      return false;
    }

    return await this.safeDatabaseAccess(
      async () => {
        const exercise = await this.db.exercises.get(exerciseId);
        if (!exercise) {
          logger.warn('addTagsToExercise: Exercise not found', { exerciseId });
          return false;
        }

        const globalEx = exercise as GlobalExercise;
        const currentTags = globalEx.base_tags || [];
        const uniqueTags = Array.from(new Set([...currentTags, ...newTags]));

        await this.db.exercises.update(exerciseId, {
          base_tags: uniqueTags,
          updated_at: new Date().toISOString(),
          version: (exercise.version || 1) + 1,
          dirty: 1 // Mark as dirty for sync
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any); // Type assertion needed for GlobalExercise fields

        logger.log('addTagsToExercise: Tags added successfully', {
          exerciseId,
          addedCount: newTags.length,
          totalCount: uniqueTags.length
        });

        return true;
      },
      () => false
    );
  }

  /**
   * Remove tags from an exercise
   * 
   * Removes specified tags from an exercise's tags array.
   * Marks the exercise as dirty for sync.
   * 
   * @param exerciseId - Exercise ID
   * @param tagsToRemove - Array of tags to remove
   * @returns True if successful
   */
  public async removeTagsFromExercise(
    exerciseId: string,
    tagsToRemove: string[]
  ): Promise<boolean> {
    if (!this.canStoreData()) {
      return false;
    }

    return await this.safeDatabaseAccess(
      async () => {
        const exercise = await this.db.exercises.get(exerciseId);
        if (!exercise) {
          logger.warn('removeTagsFromExercise: Exercise not found', { exerciseId });
          return false;
        }

        const globalEx = exercise as GlobalExercise;
        const currentTags = globalEx.base_tags || [];
        const tagsToRemoveSet = new Set(tagsToRemove);
        const filteredTags = currentTags.filter((tag: string) => !tagsToRemoveSet.has(tag));

        await this.db.exercises.update(exerciseId, {
          base_tags: filteredTags,
          updated_at: new Date().toISOString(),
          version: (exercise.version || 1) + 1,
          dirty: 1 // Mark as dirty for sync
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any); // Type assertion needed for GlobalExercise fields

        logger.log('removeTagsFromExercise: Tags removed successfully', {
          exerciseId,
          removedCount: currentTags.length - filteredTags.length,
          totalCount: filteredTags.length
        });

        return true;
      },
      () => false
    );
  }

  /**
   * Ensure the exercise catalog exists. If empty, seed with INITIAL_EXERCISES.
   * Returns the number of exercises after seeding.
   */
  public async ensureExercisesSeeded(): Promise<number> {
    if (!this.canStoreData()) {
  logger.warn('[seed] Skipping seeding: consent not granted');
      return 0;
    }

    try {
  const tSeedStart = Date.now();
  const existingCount = await this.db.exercises.count();
  logger.log(`[seed] exercises.count before=${existingCount}`);
  // Force seeding after Version 18 migration
  logger.log(`[seed] Forcing seeding due to Version 18 migration`);
      // Determine seeding strategy based on schema version
      // v25+ uses GlobalExercise + CatalogMembership (many-to-many)
      const isGlobalRepoSchema = this.db.verno >= 25;
      let cleanSeeds: StoredExercise[] = [];

      if (isGlobalRepoSchema) {
        logger.log('[seed] Using GLOBAL_EXERCISES seeding path (v25+)');
        const { GLOBAL_EXERCISES } = await import('../data/globalExercises');
        cleanSeeds = GLOBAL_EXERCISES.map(exercise => ({
          ...exercise,
          // Ensure legacy fields absent / normalized
          dirty: 0,
          version: 1,
          created_at: '2025-01-01T00:00:00.000Z',
          updated_at: '2025-01-01T00:00:00.000Z',
          deleted: false,
          owner_id: null,
          op: 'seed'
        } as StoredExercise));
      } else {
        // Legacy path (pre-v25) still seeds INITIAL_EXERCISES for backward compatibility
        logger.log('[seed] Using legacy INITIAL_EXERCISES seeding path (< v25)');
        const { INITIAL_EXERCISES } = await import('../data/exercises');
        cleanSeeds = INITIAL_EXERCISES.map(exercise => ({
          ...exercise,
          dirty: 0,
          version: 1,
          created_at: '2025-01-01T00:00:00.000Z',
          updated_at: '2025-01-01T00:00:00.000Z',
          deleted: false,
          owner_id: null,
          op: 'seed'
        } as StoredExercise));
      }

  try {
        await this.db.transaction('rw', this.db.exercises, async () => {
          await this.db.exercises.bulkPut(cleanSeeds);
        });
      } catch (txErr) {
        // Fallback to individual puts if bulkPut fails (should be rare)
        logger.warn('bulkPut failed during seeding; falling back to sequential puts', txErr);
        for (const exercise of cleanSeeds) {
          try { await this.db.exercises.put(exercise); }
          catch (error) {
            logger.warn('Seeding exercise failed, using fallback cache:', exercise.id, error);
            this.fallbackStorage.set(`exercise_${exercise.id}`, exercise);
          }
        }
      }
      // Also clean up any existing built-in exercises that might be dirty
      await this.cleanBuiltInExercises();
  const finalCount = await this.db.exercises.count();
  const seedMs = Date.now() - tSeedStart;
  if (seedMs > 1000) {
    logger.warn(`[seed] completed in ${seedMs}ms; count after=${finalCount}`);
  } else {
    logger.log(`[seed] completed in ${seedMs}ms; count after=${finalCount}`);
  }
  return finalCount;
    } catch (error) {
      logger.warn('Failed to seed exercises catalog:', error);
      return 0;
    }
  }

  /**
   * Ensure catalog_memberships are seeded for v25+ schema.
   * Uses ALL_CATALOG_MEMBERSHIPS static data. Safe no-op if pre-v25 or already populated.
   */
  public async ensureCatalogMembershipsSeeded(): Promise<number> {
    // Only applicable for v25+ schema
    if (this.db.verno < 25) {
      return 0;
    }
    if (!this.canStoreData()) {
      logger.warn('[seed] Skipping catalog_memberships seeding: consent not granted');
      return 0;
    }
    try {
      // Table should exist in v25+; guard in case of partial migration
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const table: Table<StoredCatalogMembership> | undefined = (this.db as any).catalog_memberships;
      if (!table) {
        logger.warn('[seed] catalog_memberships table not present (unexpected)');
        return 0;
      }
      const existing = await table.count();
      if (existing > 0) {
        logger.log(`[seed] catalog_memberships already seeded (count=${existing}), skipping`);
        return existing;
      }
      logger.log('[seed] Seeding catalog_memberships from ALL_CATALOG_MEMBERSHIPS');
      const { ALL_CATALOG_MEMBERSHIPS } = await import('../data/memberships');
      const seeds: StoredCatalogMembership[] = ALL_CATALOG_MEMBERSHIPS.map(m => ({
        ...m,
        // Normalize sync metadata for seed
        dirty: 0,
        version: 1,
        deleted: false,
        owner_id: null,
        op: 'seed',
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z',
        synced_at: undefined
      }));
      try {
        await this.db.transaction('rw', table, async () => {
          await table.bulkAdd(seeds);
        });
      } catch (bulkErr) {
        logger.warn('[seed] bulkAdd failed for catalog_memberships; falling back to sequential adds', bulkErr);
        for (const m of seeds) {
          try { await table.add(m); } catch (putErr) { logger.warn('[seed] Failed to add membership', { id: m.id, err: putErr }); }
        }
      }
      const final = await table.count();
      logger.log(`[seed] catalog_memberships seeding complete (count=${final})`);
      return final;
    } catch (err) {
      logger.warn('Failed to seed catalog_memberships:', err);
      return 0;
    }
  }

  /**
   * Ensure the exercise catalogs table is seeded with default catalogs.
   * Returns the number of catalogs after seeding.
   */
  public async ensureCatalogsSeeded(): Promise<number> {
    if (!this.canStoreData()) {
      logger.warn('[seed] Skipping catalog seeding: consent not granted');
      return 0;
    }

    try {
      const tSeedStart = Date.now();
      const existingCount = await this.db.exercise_catalogs.count();
      logger.log(`[seed] exercise_catalogs.count before=${existingCount}`);

      if (existingCount === 0) {
        // Lazy import to avoid circular dependencies
        const { EXERCISE_CATALOGS } = await import('../data/catalogs');

        // Prepare clean catalog records
        const cleanCatalogs = EXERCISE_CATALOGS.map(catalog => ({
          ...catalog,
          // Convert interface fields to database fields
          name_key: catalog.nameKey,
          description_key: catalog.descriptionKey,
          is_default: catalog.isDefault,
          is_premium: catalog.isPremium,
          display_order: catalog.displayOrder,
          // Add sync metadata
          dirty: 0,
          version: 1,
          created_at: '2025-01-01T00:00:00.000Z',
          updated_at: '2025-01-01T00:00:00.000Z',
          deleted: false,
          op: 'seed'
        }));

        try {
          await this.db.transaction('rw', this.db.exercise_catalogs, async () => {
            await this.db.exercise_catalogs.bulkPut(cleanCatalogs);
          });
        } catch (txErr) {
          // Fallback to individual puts if bulkPut fails
          logger.warn('bulkPut failed during catalog seeding; falling back to sequential puts', txErr);
          for (const catalog of cleanCatalogs) {
            try {
              await this.db.exercise_catalogs.put(catalog);
            } catch (putErr) {
              logger.warn(`Failed to seed catalog ${catalog.id}:`, putErr);
            }
          }
        }

        const finalCount = await this.db.exercise_catalogs.count();
        const seedMs = Date.now() - tSeedStart;
        if (seedMs > 1000) {
          logger.warn(`[seed] catalogs completed in ${seedMs}ms; count after=${finalCount}`);
        } else {
          logger.log(`[seed] catalogs completed in ${seedMs}ms; count after=${finalCount}`);
        }
        return finalCount;
      } else {
        logger.log('[seed] catalogs already seeded, skipping');
        return existingCount;
      }
    } catch (error) {
      logger.warn('Failed to seed exercise catalogs:', error);
      return 0;
    }
  }

  /**
   * Public method to trigger cleanup of built-in exercises
   */
  public async cleanupBuiltInExercises(): Promise<void> {
    await this.cleanBuiltInExercises();
  }

  /**
   * Sync built-in exercises with the current INITIAL_EXERCISES catalog
   */
  private async cleanBuiltInExercises(): Promise<void> {
    try {
      const { INITIAL_EXERCISES } = await import('../data/exercises');
      const currentBuiltInIds = new Set(INITIAL_EXERCISES.map(ex => ex.id));

      // DEBUG: Log source exercise catalog distribution (removed unused sourceCatalogCounts)
      
      // Get all existing built-in exercises (those with slug IDs, not UUIDs)
      const existingBuiltInExercises = await this.db.exercises
        .filter(exercise => 
          // Built-in exercises have slug IDs (no hyphens in UUID format)
          !!exercise.id && !exercise.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
        )
        .toArray();

      // 1. Clean up existing built-in exercises that should remain
      for (const exercise of existingBuiltInExercises) {
        if (currentBuiltInIds.has(exercise.id)) {
          // This built-in exercise should remain - update it with latest data from INITIAL_EXERCISES
          const latestExerciseData = INITIAL_EXERCISES.find(ex => ex.id === exercise.id);
          if (latestExerciseData) {

            const cleanedExercise: StoredExercise = {
              ...latestExerciseData, // Use latest data from catalog
              dirty: 0,
              version: 1,
              created_at: '2025-01-01T00:00:00.000Z',
              updated_at: '2025-01-01T00:00:00.000Z',
              deleted: false,
              owner_id: null,
              op: 'seed'
            } as StoredExercise;

            await this.db.exercises.put(cleanedExercise);
          }
        } else {
          // This built-in exercise was removed from catalog - delete it
          logger.log(`🗑️ Removing obsolete built-in exercise: ${exercise.name} (${exercise.id})`);
          await this.db.exercises.delete(exercise.id);
        }
      }

      // 2. Add any new built-in exercises that don't exist yet
      const existingIds = new Set(existingBuiltInExercises.map(ex => ex.id));
      for (const exercise of INITIAL_EXERCISES) {
        if (!existingIds.has(exercise.id)) {
          logger.log(`➕ Adding new built-in exercise: ${exercise.name} (${exercise.id})`);
          const cleanExercise: StoredExercise = {
            ...exercise,
            dirty: 0,
            version: 1,
            created_at: '2025-01-01T00:00:00.000Z',
            updated_at: '2025-01-01T00:00:00.000Z',
            deleted: false,
            owner_id: null,
            op: 'seed'
          } as StoredExercise;
          
          await this.db.exercises.put(cleanExercise);
        }
      }
    } catch (error) {
      logger.warn('Failed to clean built-in exercises:', error);
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
      logger.log('🔄 toggleExerciseFavorite called for:', exerciseId);
      
      // Update preferences source of truth (store slug/id in array)
      const prefs = await this.ensureUserPreferences();
      logger.log('📝 Current user preferences:', { id: prefs.id, favorite_exercises: prefs.favorite_exercises });
      
      const current = new Set(prefs.favorite_exercises || []);
      const wasAlreadyFavorite = current.has(exerciseId);
      if (current.has(exerciseId)) current.delete(exerciseId); else current.add(exerciseId);
      
      const newFavorites = Array.from(current);
      logger.log('📝 Updating user preferences with favorites:', { 
        exerciseId, 
        wasAlreadyFavorite, 
        newFavorites,
        action: wasAlreadyFavorite ? 'remove' : 'add'
      });
      
      await this.updateUserPreferences({ favorite_exercises: newFavorites });

      // Best-effort UI reflection: flip local exercise flag WITHOUT marking record dirty
      const now = new Date().toISOString();
      const exercise = await this.db.exercises.get(exerciseId);
      if (exercise) {
        const newVal = !exercise.is_favorite;
        // Direct update only the necessary fields; do not touch dirty/version/op
        await this.db.exercises.update(exerciseId, { is_favorite: newVal, updated_at: now } as Partial<StoredExercise>);
      } else {
        // Fallback cache path for environments without IndexedDB
        const key = `exercise_${exerciseId}`;
        const fallback = this.fallbackStorage.get(key) as StoredExercise | undefined;
        if (fallback) {
          fallback.is_favorite = !fallback.is_favorite;
          fallback.updated_at = now;
          this.fallbackStorage.set(key, fallback);
        }
      }
    } catch (error) {
      logger.warn('Failed to update exercise favorite:', error);
      // Try fallback storage
      const key = `exercise_${exerciseId}`;
      const exercise = this.fallbackStorage.get(key) as StoredExercise | undefined;
      if (exercise) {
        const now = new Date().toISOString();
        exercise.is_favorite = !exercise.is_favorite;
        exercise.updated_at = now;
        this.fallbackStorage.set(key, exercise);
        // Mirror to preferences fallback
        const prefs = (this.fallbackStorage.get('user_preferences') as UserPreferences | undefined) || await this.ensureUserPreferences();
        const set = new Set(prefs.favorite_exercises || []);
        if (set.has(exerciseId)) set.delete(exerciseId); else set.add(exerciseId);
        prefs.favorite_exercises = Array.from(set);
        prefs.updated_at = now;
        prefs.dirty = 1;
        this.fallbackStorage.set('user_preferences', prefs);
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

    const logWithSync = prepareUpsert({ ...log, exercise_name: ensuredName }, logId, this.getCurrentUserId());
    const storedLog: StoredActivityLog = {
      ...logWithSync,
      timestamp: log.timestamp
    };

    try {
      await this.db.activity_logs.put(storedLog);
    } catch (error) {
      logger.warn('Failed to save activity log to IndexedDB:', error);
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
        try { await Promise.all(repairPromises); } catch (e) { logger.warn('Activity log repair failed:', e); }
      }

      return repairedLogs.map(this.convertStoredActivityLog);
    } catch (error) {
      logger.warn('Failed to load activity logs from IndexedDB:', error);
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
    const storedPreferences: StoredUserPreferences = prepareUpsert(preferences, prefId, this.getCurrentUserId());
    
    logger.log('💾 Saving user preferences to IndexedDB:', { 
      id: storedPreferences.id,
      favorite_exercises: storedPreferences.favorite_exercises,
      dirty: storedPreferences.dirty,
      owner_id: storedPreferences.owner_id
    });

    try {
      // Use put() to handle both insert and update operations
      await this.db.user_preferences.put(storedPreferences);
      logger.log('✅ Successfully saved user preferences to IndexedDB');
    } catch (error) {
      logger.warn('Failed to save user preferences to IndexedDB:', error);
      this.fallbackStorage.set('user_preferences', storedPreferences);
    }
  }

  /**
   * Ensure there is a user_preferences record. If missing, create one with sensible defaults.
   * Returns the latest preferences (from DB if possible).
   */
  public async ensureUserPreferences(overrides: Partial<UserPreferences> = {}): Promise<UserPreferences> {
    if (!this.canStoreData()) {
      throw new Error('Cannot store data without user consent');
    }

    // Try fetch existing
    const existing = await this.getUserPreferences();
    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    const userId = this.getCurrentUserId();
    const base: UserPreferences = {
      id: crypto.randomUUID(),
      owner_id: userId,
      updated_at: now,
      created_at: now,
      deleted: false,
      version: 1,
      // Defaults
      sound_enabled: true,
      vibration_enabled: true,
      default_interval_duration: 30,
      dark_mode: false,
      favorite_exercises: [],
      locale: 'en',
      units: 'metric',
      cues: {},
      rep_speed_factor: 1.0,
      dirty: 1,
      op: 'upsert'
    };

    const merged = { ...base, ...overrides } as UserPreferences;
    await this.saveUserPreferences(merged);
    return merged;
  }

  /**
   * Patch user preferences with a partial update, creating the record if needed.
   */
  public async updateUserPreferences(patch: Partial<UserPreferences>): Promise<void> {
    if (!this.canStoreData()) {
      throw new Error('Cannot store data without user consent');
    }

    const existing = await this.getUserPreferences();
    if (existing) {
      // Ensure owner_id is set if missing
      const userId = this.getCurrentUserId();
      const updated: UserPreferences = prepareUpsert(
        { 
          ...existing, 
          ...patch,
          // Fix owner_id if it's null/undefined
          owner_id: existing.owner_id || userId
        } as UserPreferences,
        existing.id,
        this.getCurrentUserId()
      );
      await this.saveUserPreferences(updated);
    } else {
      const created = await this.ensureUserPreferences(patch);
      // ensureUserPreferences already saved it
      void created; // no-op
    }
  }

  /**
   * Get user preferences
   */
  public async getUserPreferences(): Promise<UserPreferences | null> {
    if (!this.canStoreData()) {
      return null;
    }

    return await this.safeDatabaseAccess(
      async () => {
        const storedPreferences = await this.db.user_preferences.orderBy('updated_at').last();
        return storedPreferences || null;
      },
      () => {
        const fallback = this.fallbackStorage.get('user_preferences') as UserPreferences | undefined;
        return fallback || null;
      }
    );
  }

  /**
   * Save app settings (singleton pattern - only one record per user)
   */
  public async saveAppSettings(settings: AppSettings): Promise<void> {
    if (!this.canStoreData()) {
      throw new Error('Cannot store data without user consent');
    }

    // Get existing settings to preserve the ID for singleton pattern
    const existingSettings = await this.getAppSettings();
    const settingsId = existingSettings?.id || settings.id || 'app-settings-singleton';

    const storedSettings: StoredAppSettings = prepareUpsert(settings, settingsId, this.getCurrentUserId());

    try {
      // For singleton pattern, clear any existing records first, then add the new one
      await this.db.transaction('rw', this.db.app_settings, async () => {
        // Clear existing app_settings for this user to maintain singleton
        await this.db.app_settings.clear();
        // Add the single settings record
        await this.db.app_settings.put(storedSettings);
      });
    } catch (error) {
      logger.warn('Failed to save app settings to IndexedDB:', error);
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

    return await this.safeDatabaseAccess(
      async () => {
        const storedSettings = await this.db.app_settings.orderBy('updated_at').last();
        return storedSettings || null;
      },
      () => {
        const fallback = this.fallbackStorage.get('app_settings') as AppSettings | undefined;
        return fallback || null;
      }
    );
  }

  /**
   * Get current app version from stored settings
   */
  public async getCurrentAppVersion(): Promise<string | null> {
    const settings = await this.getAppSettings();
    return settings?.app_version ?? null; // Return null for new installations
  }

  /**
   * Update the app version in settings
   */
  public async updateAppVersion(newVersion: string): Promise<void> {
    const currentSettings = await this.getAppSettings();
    
    // Only fill in missing keys from defaults, don't override existing values
    const mergedSettings: AppSettings = {
      ...DEFAULT_APP_SETTINGS,
      ...(currentSettings || {}), // Preserve all current settings
      app_version: newVersion,
      updated_at: new Date().toISOString()
    };

    await this.saveAppSettings(mergedSettings);
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
      logger.error('Failed to clear all data:', error);
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
      const tStatsStart = Date.now();
      const [exerciseCount, logCount, preferences, settings] = await Promise.all([
        this.db.exercises.count(),
        this.db.activity_logs.count(),
        this.getUserPreferences(),
        this.getAppSettings()
      ]);
      const statsMs = Date.now() - tStatsStart;
      if (statsMs > 1000) {
        logger.warn(`[stats] getStorageStats took ${statsMs}ms (exercises=${exerciseCount}, logs=${logCount})`);
      } else {
        logger.log(`[stats] getStorageStats took ${statsMs}ms (exercises=${exerciseCount}, logs=${logCount})`);
      }

      return {
        exerciseCount,
        logCount,
        hasPreferences: preferences !== null,
        hasSettings: settings !== null
      };
    } catch (error) {
      if (error && typeof error === 'object' && 'name' in error && (error as { name: string }).name === 'DatabaseClosedError') {
        logger.warn('Database closed, returning empty storage stats');
        return {
          exerciseCount: 0,
          logCount: 0,
          hasPreferences: false,
          hasSettings: false
        };
      }
      logger.warn('Failed to get storage stats:', error);
      return {
        exerciseCount: 0,
        logCount: 0,
        hasPreferences: false,
        hasSettings: false
      };
    }
  }

  /**
   * Peek the number of exercises without requiring consent.
   * Read-only and used for diagnostics/rehydration paths.
   */
  public async peekExerciseCount(): Promise<number> {
    try {
      return await this.db.exercises.count();
    } catch (e) {
      logger.warn('peekExerciseCount failed:', e);
      return 0;
    }
  }

  /**
   * Quickly load built-in exercises without requiring consent (read-only).
   * This intentionally excludes any user-created content for privacy.
   */
  public async getBuiltInExercisesFastUnsafe(): Promise<StoredExercise[]> {
    try {
      const stored = await this.db.exercises
        .filter(exercise => {
          // Built-ins have slug IDs (non-UUID) and no owner
          const isUuid = typeof exercise.id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(exercise.id);
          return !isUuid && (exercise.owner_id == null);
        })
        .toArray();
      return filterActiveRecords(stored.map(this.convertStoredExercise));
    } catch (e) {
      logger.warn('getBuiltInExercisesFastUnsafe failed:', e);
      return [];
    }
  }

  /**
   * Fast path to fetch exercises without consulting preferences (no favorites merge).
   * Useful as a fallback when we need quick UI hydration.
   */
  public async getExercisesFast(): Promise<StoredExercise[]> {
    if (!this.canStoreData()) return [];
    try {
      const tFastStart = Date.now();
      const stored = await this.db.exercises.toArray();
      const list = filterActiveRecords(stored.map(this.convertStoredExercise));
      const fastMs = Date.now() - tFastStart;
      if (fastMs > 1000) {
        logger.warn(`[fast] getExercisesFast took ${fastMs}ms (n=${list.length})`);
      } else {
        logger.log(`[fast] getExercisesFast took ${fastMs}ms (n=${list.length})`);
      }
      return list;
    } catch (error) {
      logger.warn('getExercisesFast failed:', error);
      return [];
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
  const workoutWithSync = prepareUpsert(workout, workoutId, this.getCurrentUserId());
    const storedWorkout: StoredWorkout = {
      ...workoutWithSync,
      created_at: typeof workout.created_at === 'string' ? workout.created_at : new Date().toISOString()
    };

    try {
      await this.db.workouts.put(storedWorkout);
    } catch (error) {
      logger.warn('Failed to save workout to IndexedDB:', error);
      // Use the resolved workoutId so downstream lookups (e.g., resolveWorkoutName) find it
      this.fallbackStorage.set(`workout_${workoutId}`, storedWorkout);
    }
  }

  // =================================================================
  // Catalog Membership Methods (Phase 2: Global Exercise Repository)
  // =================================================================

  /**
   * Get all catalog memberships for a specific catalog
   * 
   * @param catalogId - The catalog ID to get memberships for
   * @returns Array of catalog memberships
   */
  public async getCatalogMemberships(catalogId: string): Promise<CatalogMembership[]> {
    if (!this.canStoreData()) {
      return [];
    }

    return await this.safeDatabaseAccess(
      async () => {
        const memberships = await this.db.catalog_memberships
          .where('catalog_id')
          .equals(catalogId)
          .and(m => !m.deleted)
          .sortBy('display_order');
        
        return memberships;
      },
      () => []
    );
  }

  /**
   * Get all catalog memberships for a specific exercise
   * 
   * @param exerciseId - The exercise ID to get memberships for
   * @returns Array of catalog memberships
   */
  public async getExerciseMemberships(exerciseId: string): Promise<CatalogMembership[]> {
    if (!this.canStoreData()) {
      return [];
    }

    return await this.safeDatabaseAccess(
      async () => {
        const memberships = await this.db.catalog_memberships
          .where('exercise_id')
          .equals(exerciseId)
          .and(m => !m.deleted)
          .toArray();
        
        return memberships;
      },
      () => []
    );
  }

  /**
   * Bulk load catalog memberships for multiple exercises
   * This prevents N+1 query problems when displaying multiple exercises
   * 
   * @param exerciseIds - Array of exercise IDs to get memberships for
   * @returns Map of exercise ID to their catalog memberships
   */
  public async getAllExerciseMemberships(exerciseIds: string[]): Promise<Map<string, CatalogMembership[]>> {
    if (!this.canStoreData() || exerciseIds.length === 0) {
      return new Map();
    }

    return await this.safeDatabaseAccess(
      async () => {
        const memberships = await this.db.catalog_memberships
          .where('exercise_id')
          .anyOf(exerciseIds)
          .and(m => !m.deleted)
          .toArray();
        
        // Group by exercise ID
        const membershipMap = new Map<string, CatalogMembership[]>();
        memberships.forEach(membership => {
          const existing = membershipMap.get(membership.exercise_id) || [];
          existing.push(membership);
          membershipMap.set(membership.exercise_id, existing);
        });
        
        return membershipMap;
      },
      () => new Map()
    );
  }

  /**
   * Get exercises for a specific catalog with membership information
   * Joins exercises with their catalog membership data
   * 
   * @param catalogId - The catalog ID to get exercises for
   * @returns Array of exercises with membership info and effective tags
   */
  public async getExercisesForCatalog(catalogId: string): Promise<Array<GlobalExercise & { membership: CatalogMembership; effectiveTags: string[] }>> {
    if (!this.canStoreData()) {
      return [];
    }

    return await this.safeDatabaseAccess(
      async () => {
        // Get memberships for this catalog
        const memberships = await this.getCatalogMemberships(catalogId);
        
        // Get exercises for these memberships
        const exerciseIds = memberships.map(m => m.exercise_id);
        const exercises = await this.db.exercises
          .where('id')
          .anyOf(exerciseIds)
          .and(ex => !ex.deleted)
          .toArray();

        // Create a map for quick lookup
        const exerciseMap = new Map(exercises.map(ex => [ex.id, ex]));
        
        // Join exercises with memberships and compute effective tags
        const result = memberships
          .map(membership => {
            const exercise = exerciseMap.get(membership.exercise_id);
            if (!exercise) return null;

            const baseTags = (exercise as GlobalExercise).base_tags || [];
            const catalogTags = membership.catalog_tags || [];
            
            return {
              ...exercise as GlobalExercise,
              membership,
              effectiveTags: [...baseTags, ...catalogTags]
            };
          })
          .filter((item): item is NonNullable<typeof item> => item !== null);

        return result;
      },
      () => []
    );
  }

  /**
   * Add an exercise to a catalog (create membership)
   * 
   * @param exerciseId - The exercise ID
   * @param catalogId - The catalog ID
   * @param membershipData - Optional membership override data
   * @returns The created membership ID, or null if failed
   */
  public async addExerciseToCatalog(
    exerciseId: string,
    catalogId: string,
    membershipData?: Partial<Pick<CatalogMembership, 'catalog_tags' | 'display_order' | 'featured' | 'custom_name_key' | 'custom_description_key' | 'catalog_notes'>>
  ): Promise<string | null> {
    if (!this.canStoreData()) {
      return null;
    }

    return await this.safeDatabaseAccess(
      async () => {
        // Resolve owner from authenticated user; fall back to exercise owner when available
        let userId = this.getCurrentUserId();
        if (!userId) {
          try {
            const ex = await this.db.exercises.get(exerciseId);
            if (ex && ex.owner_id) userId = ex.owner_id as string;
          } catch {
            // ignore and keep null
          }
        }
        const now = new Date().toISOString();

        // Check if membership already exists
        const existing = await this.db.catalog_memberships
          .where('[catalog_id+exercise_id]')
          .equals([catalogId, exerciseId])
          .first();

        if (existing && !existing.deleted) {
          logger.warn(`Membership already exists for exercise ${exerciseId} in catalog ${catalogId}`);
          return existing.id;
        }

        const membership: CatalogMembership = {
          id: crypto.randomUUID(),
          exercise_id: exerciseId,
          catalog_id: catalogId,
          catalog_tags: membershipData?.catalog_tags || [],
          display_order: membershipData?.display_order,
          featured: membershipData?.featured,
          custom_name_key: membershipData?.custom_name_key,
          custom_description_key: membershipData?.custom_description_key,
          catalog_notes: membershipData?.catalog_notes,
          created_at: now,
          updated_at: now,
          deleted: false,
          version: 1,
          dirty: 1,
          op: 'upsert',
          synced_at: undefined,
          owner_id: userId
        };

        await this.db.catalog_memberships.add(membership);
        logger.log(`Added exercise ${exerciseId} to catalog ${catalogId}`);

        return membership.id;
      },
      () => null
    );
  }

  /**
   * Remove an exercise from a catalog (soft delete membership)
   * 
   * @param exerciseId - The exercise ID
   * @param catalogId - The catalog ID
   * @returns True if successful
   */
  public async removeExerciseFromCatalog(
    exerciseId: string,
    catalogId: string
  ): Promise<boolean> {
    if (!this.canStoreData()) {
      return false;
    }

    return await this.safeDatabaseAccess(
      async () => {
        const membership = await this.db.catalog_memberships
          .where('[catalog_id+exercise_id]')
          .equals([catalogId, exerciseId])
          .first();

        if (!membership) {
          logger.warn(`No membership found for exercise ${exerciseId} in catalog ${catalogId}`);
          return false;
        }

        const deleteOp = prepareSoftDelete(membership);
        await this.db.catalog_memberships.put(deleteOp);
        logger.log(`Removed exercise ${exerciseId} from catalog ${catalogId}`);

        return true;
      },
      () => false
    );
  }

  /**
   * Update catalog membership data
   * 
   * @param membershipId - The membership ID to update
   * @param updates - Partial membership data to update
   * @returns True if successful
   */
  public async updateCatalogMembership(
    membershipId: string,
    updates: Partial<Pick<CatalogMembership, 'catalog_tags' | 'display_order' | 'featured' | 'custom_name_key' | 'custom_description_key' | 'catalog_notes'>>
  ): Promise<boolean> {
    if (!this.canStoreData()) {
      return false;
    }

    return await this.safeDatabaseAccess(
      async () => {
        const membership = await this.db.catalog_memberships.get(membershipId);
        if (!membership || membership.deleted) {
          logger.warn(`Membership ${membershipId} not found or deleted`);
          return false;
        }

        const updateOp = prepareUpsert(
          { ...membership, ...updates },
          membership.id,
          this.getCurrentUserId()
        );

        await this.db.catalog_memberships.put(updateOp);
        logger.log(`Updated membership ${membershipId}`);

        return true;
      },
      () => false
    );
  }

  /**
   * Get all workouts
   */
  public async getWorkouts(): Promise<Workout[]> {
    if (!this.canStoreData()) {
      return [];
    }

    return await this.safeDatabaseAccess(
      async () => {
        const storedWorkouts = await this.db.workouts.orderBy('updated_at').reverse().toArray();
        // Filter out soft-deleted workouts
        return storedWorkouts
          .filter(workout => !workout.deleted)
          .map(this.convertStoredWorkout);
      },
      () => {
        const workouts: Workout[] = [];
        this.fallbackStorage.forEach((value, key) => {
          if (key.startsWith('workout_')) {
            const workout = value as StoredWorkout;
            // Filter out soft-deleted workouts
            if (!workout.deleted) {
              workouts.push(this.convertStoredWorkout(workout));
            }
          }
        });
        return workouts;
      }
    );
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
      logger.warn('Failed to get workout from IndexedDB:', error);
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
        logger.log(`Workout ${workoutId} soft deleted successfully`);
      }
    } catch (error) {
      logger.error('Failed to soft delete workout from IndexedDB:', error);
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
    const sessionWithSync = prepareUpsert(session, sessionId, this.getCurrentUserId());
    const storedSession: StoredWorkoutSession = {
      ...sessionWithSync,
      start_time: session.start_time,
      end_time: session.end_time
    };

    try {
      await this.db.workout_sessions.put(storedSession);
    } catch (error) {
      logger.warn('Failed to save workout session to IndexedDB:', error);
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
      logger.warn('Failed to load workout sessions from IndexedDB:', error);
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
        logger.log(`Workout session ${sessionId} soft deleted successfully`);
      }
    } catch (error) {
      logger.error('Failed to soft delete workout session from IndexedDB:', error);
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
        logger.log(`Exercise ${exerciseId} soft deleted successfully`);
      }
    } catch (error) {
      logger.error('Failed to soft delete exercise from IndexedDB:', error);
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
        logger.log(`Activity log ${activityLogId} soft deleted successfully`);
      }
    } catch (error) {
      logger.error('Failed to soft delete activity log from IndexedDB:', error);
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
    userFavorites: UserFavorite[];
    workouts: Workout[];
    workoutSessions: WorkoutSession[];
  }> {
    if (!this.canStoreData()) {
      return {
        exercises: [],
        activityLogs: [],
        userPreferences: [],
        appSettings: [],
        userFavorites: [],
        workouts: [],
        workoutSessions: []
      };
    }

    try {
      const [activityLogs, userPreferences, appSettings, userFavorites, workouts, workoutSessions] = await Promise.all([
        this.db.activity_logs.where('dirty').equals(1).toArray(),
        this.db.user_preferences.where('dirty').equals(1).toArray(),
        this.db.app_settings.where('dirty').equals(1).toArray(),
        this.db.user_favorites.where('dirty').equals(1).toArray(),
        this.db.workouts.where('dirty').equals(1).toArray(),
        this.db.workout_sessions.where('dirty').equals(1).toArray()
      ]);

      return {
        // Do not sync exercises for the quick favorites-by-preferences path.
        // Favorites are the only mutable field for built-ins; syncing them as rows causes server rejects.
        exercises: [],
        activityLogs: activityLogs.map(this.convertStoredActivityLog),
        userPreferences: userPreferences.map(this.convertStoredUserPreferences),
        appSettings: appSettings.map(this.convertStoredAppSettings),
        userFavorites: userFavorites.map(this.convertStoredUserFavorite),
        workouts: workouts.map(this.convertStoredWorkout),
        workoutSessions: workoutSessions.map(this.convertStoredWorkoutSession)
      };
    } catch (error) {
      logger.warn('Failed to get dirty records:', error);
      return {
        exercises: [],
        activityLogs: [],
        userPreferences: [],
        appSettings: [],
        userFavorites: [],
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
      logger.warn(`Failed to mark ${table} records as synced:`, error);
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
            // Prefer indexed query paths when available; otherwise stream in batches
            const coll = table as unknown as {
              where?: (field: string) => { equals: (v: unknown) => { limit: (n: number) => { toArray: () => Promise<Array<{ id: string }>> } } };
              toCollection?: () => { offset: (n: number) => { limit: (m: number) => { toArray: () => Promise<Array<{ id: string; owner_id?: string | null }>> } } };
              update: (id: string, changes: Record<string, unknown>) => Promise<number>;
            };

            let modified = 0;
            const BATCH = 50;

            // Strategy 1: Use indexed queries on owner_id for efficient lookups (available from v11+)
            if (coll.where) {
              // Query for empty string owner_id values (Dexie can't query null with equals)
              let batch = await coll.where('owner_id').equals('').limit(BATCH).toArray();
              while (batch.length) {
                for (const rec of batch) {
                  await coll.update(rec.id, claimData as Record<string, unknown>);
                  modified++;
                }
                // Yield to event loop to keep UI responsive
                await new Promise(r => setTimeout(r, 0));
                batch = await coll.where('owner_id').equals('').limit(BATCH).toArray();
              }
              
              // Also need to scan for null values since Dexie can't query null with equals()
              // Use toCollection scan to find null owner_id values
              if (coll.toCollection) {
                let offset = 0;
                const MAX_PAGES = 200; // up to 10k rows in worst case
                for (let page = 0; page < MAX_PAGES; page++) {
                  const rows = await coll.toCollection().offset(offset).limit(BATCH).toArray();
                  if (!rows.length) break;
                  for (const rec of rows) {
                    const owner = (rec as { owner_id?: string | null }).owner_id;
                    if (owner == null) { // Only handle null, empty string was handled above
                      await coll.update(rec.id, claimData as Record<string, unknown>);
                      modified++;
                    }
                  }
                  offset += rows.length;
                  await new Promise(r => setTimeout(r, 0));
                }
              }
            } else if (coll.toCollection) {
              // Strategy 2: Fallback scan in small pages
              let offset = 0;
              // Limit pages to avoid pathological stalls
              const MAX_PAGES = 200; // up to 10k rows in worst case
              for (let page = 0; page < MAX_PAGES; page++) {
                const rows = await coll.toCollection().offset(offset).limit(BATCH).toArray();
                if (!rows.length) break;
                for (const rec of rows) {
                  const owner = (rec as { owner_id?: string | null }).owner_id;
                  if (owner === '' || owner == null) {
                    await coll.update(rec.id, claimData as Record<string, unknown>);
                    modified++;
                  }
                }
                offset += rows.length;
                await new Promise(r => setTimeout(r, 0));
              }
            }

            return { name, count: modified };
          } catch (error) {
            logger.warn(`Failed to claim ${name}:`, error);
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

      logger.log(`✅ Successfully claimed ${totalClaimed} anonymous records for user ${ownerId}:`, tableStats);

      return {
        success: true,
        recordsClaimed: totalClaimed,
        tableStats,
      };
    } catch (error) {
      logger.error('Failed to claim ownership of records:', error);
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
  private convertStoredExercise(stored: StoredExercise): StoredExercise {
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
   * Convert stored user favorite to runtime format
   */
  private convertStoredUserFavorite(stored: StoredUserFavorite): UserFavorite {
    return stored;
  }

  /**
   * Toggle favorite status for a user-created exercise (UUID ID)
   * Stores in user_favorites table for sync
   */
  public async toggleUserCreatedExerciseFavorite(exerciseId: string, userId: string): Promise<boolean> {
    if (!this.canStoreData()) {
      throw new Error('Cannot store data without user consent');
    }

    try {
      // Check if already favorited
      const existing = await this.db.user_favorites
        .where('owner_id').equals(userId)
        .and(favorite => favorite.item_id === exerciseId && !favorite.deleted)
        .first();

      if (existing) {
        // Remove from favorites (soft delete)
        const updatedFavorite: StoredUserFavorite = prepareSoftDelete(existing, userId);
        await this.db.user_favorites.put(updatedFavorite);
        return false;
      } else {
        // Add to favorites
        const newFavorite: StoredUserFavorite = prepareUpsert({
          owner_id: userId,
          item_id: exerciseId,
          item_type: 'exercise' as const,
          exercise_type: 'user_created' as const
        } as UserFavorite, undefined, userId);
        await this.db.user_favorites.put(newFavorite);
        return true;
      }
    } catch (error) {
      logger.warn('Failed to toggle user favorite:', error);
      throw error;
    }
  }

  /**
   * Check if a user-created exercise is favorited
   */
  public async isUserCreatedExerciseFavorited(exerciseId: string, userId: string): Promise<boolean> {
    if (!this.canStoreData()) {
      return false;
    }

    try {
      const existing = await this.db.user_favorites
        .where('owner_id').equals(userId)
        .and(favorite => favorite.item_id === exerciseId && !favorite.deleted)
        .first();

      return !!existing;
    } catch (error) {
      logger.warn('Failed to check favorite status:', error);
      return false;
    }
  }

  /**
   * Get shared exercise references for a user
   * Returns the user_favorites records that represent shared exercises
   */
  public async getSharedExerciseReferences(userId: string): Promise<UserFavorite[]> {
    if (!this.canStoreData()) {
      logger.warn('[getSharedExerciseReferences] Cannot store data, returning empty array');
      return [];
    }

    try {
      // Debug: Check total user_favorites count
      const totalFavorites = await this.db.user_favorites.count();
      logger.log(`[getSharedExerciseReferences] Total user_favorites in IndexedDB: ${totalFavorites}`);

      // Debug: Get all user_favorites for this user
      const allUserFavorites = await this.db.user_favorites
        .where('owner_id').equals(userId)
        .toArray();
      logger.log(`[getSharedExerciseReferences] Total favorites for user ${userId}: ${allUserFavorites.length}`);

      const sharedRefs = await this.db.user_favorites
        .where('owner_id').equals(userId)
        .and(favorite =>
          favorite.item_type === 'exercise' &&
          favorite.exercise_type === 'shared' &&
          !favorite.deleted
        )
        .toArray();

      logger.log(`[getSharedExerciseReferences] Found ${sharedRefs.length} shared exercise references for user ${userId}`);
      if (sharedRefs.length > 0) {
        logger.log('[getSharedExerciseReferences] Shared refs:', sharedRefs);
      }

      return sharedRefs;
    } catch (error) {
      logger.warn('Failed to get shared exercise references:', error);
      return [];
    }
  }

  /**
   * Fetch original exercise data for shared exercise references
   * This resolves the references to actual exercise data
   */
  public async getSharedExerciseData(exerciseIds: string[]): Promise<StoredExercise[]> {
    if (!this.canStoreData() || exerciseIds.length === 0) {
      return [];
    }

    try {
      // Try to find shared exercises in local storage first
      const localExercises = await this.db.exercises
        .where('id').anyOf(exerciseIds)
        .and(ex => !ex.deleted)
        .toArray();

      const foundLocalIds = localExercises.map(ex => ex.id);
      const missingIds = exerciseIds.filter(id => !foundLocalIds.includes(id));

      const exercises = localExercises.map(this.convertStoredExercise);

      // For missing exercises, we would need to fetch from server
      // For now, we'll return what we have locally
      if (missingIds.length > 0) {
        logger.debug(`Shared exercises not found locally: ${missingIds.join(', ')}`);
        // In a full implementation, we would fetch these from the server here
        // For Phase 2, we'll rely on sync to have already pulled them
      }

      return exercises;
    } catch (error) {
      logger.warn('Failed to get shared exercise data:', error);
      return [];
    }
  }

  /**
   * Delete a shared exercise reference from user_favorites
   * This removes the exercise from the user's library without deleting the original exercise
   */
  public async deleteSharedExerciseReference(userId: string, exerciseId: string): Promise<boolean> {
    if (!this.canStoreData()) {
      logger.warn('[deleteSharedExerciseReference] Cannot store data');
      return false;
    }

    try {
      // Find the shared exercise reference
      const sharedRef = await this.db.user_favorites
        .where('owner_id').equals(userId)
        .and(favorite =>
          favorite.item_id === exerciseId &&
          favorite.item_type === 'exercise' &&
          favorite.exercise_type === 'shared' &&
          !favorite.deleted
        )
        .first();

      if (!sharedRef) {
        logger.warn(`[deleteSharedExerciseReference] No shared reference found for exercise ${exerciseId}`);
        return false;
      }

      // Soft delete the reference
      const now = new Date().toISOString();
      await this.db.user_favorites.update(sharedRef.id, {
        deleted: true,
        updated_at: now,
        version: (sharedRef.version || 0) + 1,
        dirty: 1 // Mark for sync
      });

      logger.log(`[deleteSharedExerciseReference] Soft deleted shared exercise reference: ${exerciseId}`);
      return true;
    } catch (error) {
      logger.error('Failed to delete shared exercise reference:', error);
      return false;
    }
  }

  /**
   * Convert stored app settings to runtime format
   */
  private convertStoredAppSettings(stored: StoredAppSettings): AppSettings {
    return stored;
  }

  /**
   * Convert client AppSettings to Supabase app_settings format
   * Handles field name differences between client and server schemas
   */
  /**
   * Filter out undefined values from any object to prevent database errors
   * This is critical for sync payloads since undefined values cause 422 errors
   */
  private filterUndefinedValues(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        result[key] = value;
      }
    }
    return result;
  }

  public convertAppSettingsForSync(settings: AppSettings): Record<string, unknown> {
    const rawResult = {
      id: settings.id,
      // Map client field names to Supabase field names
      beep_interval_seconds: settings.interval_duration,
      beep_sound_enabled: settings.sound_enabled,
      beep_volume: settings.beep_volume,
      vibration_enabled: settings.vibration_enabled,
      dark_mode: settings.dark_mode,
      reduce_motion: settings.reduce_motion,
      auto_start_next: settings.auto_start_next,
      pre_timer_countdown: settings.pre_timer_countdown,
      show_exercise_videos: settings.show_exercise_videos,
      data_auto_save: settings.auto_save,
      default_rest_time: settings.default_rest_time,
      horizontal_exercise_layout: settings.horizontal_exercise_layout,
      ring_timer: settings.ring_timer,
      theme_id: settings.theme_id,
      // Include all sync metadata (filtering happens below)
      owner_id: settings.owner_id,
      created_at: settings.created_at,
      updated_at: settings.updated_at,
      version: settings.version,
      deleted: settings.deleted,
      dirty: settings.dirty,
      synced_at: settings.synced_at,
      op: settings.op
    };

    // Filter out undefined values to prevent 422 database errors
    return this.filterUndefinedValues(rawResult);
  }

  /**
   * Convert client UserFavorite to Supabase user_favorites format
   * Filters out legacy user_id field during migration period
   */
  public convertUserFavoritesForSync(favorite: UserFavorite): Record<string, unknown> {
    // Extract only the fields we want to sync, excluding legacy user_id
    const { user_id: _user_id, ...rest } = favorite as unknown as UserFavorite & { user_id?: string };
    
    // Filter out undefined values to prevent 422 database errors
    return this.filterUndefinedValues(rest);
  }

  /**
   * Convert Supabase app_settings to client AppSettings format
   * Handles field name differences between server and client schemas
   */
  public convertAppSettingsFromSync(serverData: Record<string, unknown>): AppSettings {
    return {
      id: serverData.id as string,
      // Map Supabase field names to client field names
      interval_duration: (serverData.beep_interval_seconds as number) || 30,
      sound_enabled: (serverData.beep_sound_enabled as boolean) ?? true,
      beep_volume: (serverData.beep_volume as number) || 0.5,
      vibration_enabled: (serverData.vibration_enabled as boolean) ?? true,
      dark_mode: (serverData.dark_mode as boolean) || false,
      reduce_motion: (serverData.reduce_motion as boolean) || false,
      auto_start_next: (serverData.auto_start_next as boolean) || false,
      pre_timer_countdown: (serverData.pre_timer_countdown as number) || 3,
      show_exercise_videos: (serverData.show_exercise_videos as boolean) ?? true,
      auto_save: (serverData.data_auto_save as boolean) ?? true,
      default_rest_time: (serverData.default_rest_time as number) || 60,
      ring_timer: (serverData.ring_timer as boolean) ?? true,
      theme_id: (serverData.theme_id as string) || 'default',
      rep_speed_factor: 1.0, // This stays client-side only for now
      last_selected_exercise_id: null, // This stays client-side only for now
      // Include sync metadata
      owner_id: serverData.owner_id as string | null,
      created_at: serverData.created_at as string,
      updated_at: serverData.updated_at as string,
      version: (serverData.version as number) || 1,
      deleted: (serverData.deleted as boolean) || false,
      dirty: 0, // Mark as clean when coming from server
      synced_at: serverData.synced_at as string | undefined,
      op: 'upsert' as const
    };
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
      logger.warn('🔄 Resetting RepCue database...');
      
      // Close the current connection
      await this.db.close();
      
      try {
        // Try to delete the entire database (preferred when IndexedDB is available)
        await this.db.delete();
      } catch (hardDeleteError) {
        // In test/JSDOM or constrained environments, delete() may not work because
        // indexedDB.deleteDatabase returns an incomplete mock/request. Fall back to a soft reset.
        logger.warn('⚠️ Hard delete failed, performing soft reset instead:', hardDeleteError);
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
          logger.warn('Soft clear during reset encountered issues (safe to ignore in tests):', softError);
        }
      }

      // Recreate the database instance regardless of hard/soft path
      this.db = new RepCueDatabase();
      try {
        await this.db.open();
      } catch (openErr) {
        // In environments without IndexedDB, open may fail; we still consider reset successful
        logger.warn('DB open after reset failed (likely no IndexedDB in test env). Continuing with in-memory fallback.', openErr);
      }
      
      // Clear fallback storage as well
      this.fallbackStorage.clear();
      
      logger.log('✅ Database reset successfully');
    } catch (error) {
      logger.error('❌ Failed to reset database:', error);
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
      if (!this.db) {
        throw new Error('Database not initialized');
      }
      await this.db.exercises.count();
      await this.db.user_preferences.count();
      await this.db.app_settings.count();
      
      return { healthy: true, repaired: false };
    } catch (error) {
      logger.warn('Database health check failed, attempting repair:', error);
      
      try {
        await this.resetDatabase();
        return { healthy: true, repaired: true };
      } catch (repairError) {
        const errorMsg = repairError instanceof Error ? repairError.message : 'Unknown repair error';
        logger.error('Database repair failed:', repairError);
        return { 
          healthy: false, 
          repaired: false, 
          error: errorMsg 
        };
      }
    }
  }

  // ===============================
  // Custom Exercise Methods
  // ===============================

  /**
   * Create a custom exercise
   */
  public async createCustomExercise(exerciseData: Omit<Exercise, 'id' | 'created_at' | 'updated_at' | 'version' | 'synced_at' | 'is_dirty'>): Promise<StoredExercise> {
    if (!this.canStoreData()) {
      throw new Error('Storage consent required to create custom exercises');
    }

    try {
      const userId = this.getCurrentUserId();
      if (!userId) {
        throw new Error('User authentication required to create custom exercises');
      }

      const exercise = prepareUpsert({
        ...exerciseData,
        id: crypto.randomUUID(),
        owner_id: userId,
        is_public: (exerciseData as Partial<Exercise>).is_public || false,
        is_verified: false, // User-created exercises require admin verification
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted: false,
        version: 1,
        dirty: 1 // Mark for sync
      } as Exercise, undefined, userId);

      await this.db.exercises.add(exercise);
      logger.log('Custom exercise created:', exercise.name);
      return exercise;
    } catch (error) {
      logger.error('Failed to create custom exercise:', error);
      throw error;
    }
  }

  /**
   * Update a custom exercise (only for owned exercises)
   */
  public async updateCustomExercise(exerciseId: string, updates: Partial<StoredExercise>): Promise<StoredExercise> {
    if (!this.canStoreData()) {
      throw new Error('Storage consent required to update exercises');
    }

    try {
      const userId = this.getCurrentUserId();
      if (!userId) {
        throw new Error('User authentication required to update exercises');
      }

      const existing = await this.db.exercises.get(exerciseId);
      if (!existing) {
        throw new Error('Exercise not found');
      }

      if (existing.owner_id !== userId) {
        throw new Error('Can only update exercises you created');
      }

      const updatedExercise = prepareUpsert({
        ...existing,
        ...updates,
        updated_at: new Date().toISOString(),
        dirty: 1 // Mark for sync
      }, undefined, this.getCurrentUserId());

      await this.db.exercises.put(updatedExercise);
      logger.log('Custom exercise updated:', updatedExercise.name);
      return updatedExercise;
    } catch (error) {
      logger.error('Failed to update custom exercise:', error);
      throw error;
    }
  }

  /**
   * Get exercises shared with current user (synced from server)
   */
  public async getSharedExercises(): Promise<StoredExercise[]> {
    if (!this.canStoreData()) {
      return [];
    }

    try {
      const userId = this.getCurrentUserId();
      if (!userId) return [];

      // Get exercises where owner_id is not current user (i.e., shared or public)
      const sharedExercises = await this.db.exercises
        .where('owner_id')
        .notEqual(userId)
        .and(exercise => !exercise.deleted && (exercise.is_public || false))
        .toArray();

      return filterActiveRecords(sharedExercises);
    } catch (error) {
      logger.error('Failed to get shared exercises:', error);
      return [];
    }
  }

  /**
   * Get exercises created by current user
   */
  public async getUserCreatedExercises(): Promise<StoredExercise[]> {
    if (!this.canStoreData()) {
      return [];
    }

    try {
      const userId = this.getCurrentUserId();
      if (!userId) return [];

      const userExercises = await this.db.exercises
        .where('owner_id')
        .equals(userId)
        .and(exercise => !exercise.deleted)
        .toArray();

      return filterActiveRecords(userExercises);
    } catch (error) {
      logger.error('Failed to get user-created exercises:', error);
      return [];
    }
  }

  /**
   * Copy an exercise to user's library
   */
  public async copyExercise(sourceExercise: StoredExercise): Promise<StoredExercise> {
    if (!this.canStoreData()) {
      throw new Error('Storage consent required to copy exercises');
    }

    try {
      const userId = this.getCurrentUserId();
      if (!userId) {
        throw new Error('User authentication required to copy exercises');
      }

      const copyName = sourceExercise.name.includes('(Copy)') 
        ? sourceExercise.name 
        : `${sourceExercise.name} (Copy)`;

      const copiedExercise = prepareUpsert({
        ...sourceExercise,
        id: crypto.randomUUID(),
        name: copyName,
        owner_id: userId,
        is_public: false, // Copies are private by default
        is_verified: false,
        // Remove community stats from copy
        rating_average: undefined,
        rating_count: undefined,
        copy_count: undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1,
        dirty: 1 // Mark for sync
      } as Exercise, undefined, userId);

      await this.db.exercises.add(copiedExercise);
      logger.log('Exercise copied:', copiedExercise.name);
      return copiedExercise;
    } catch (error) {
      logger.error('Failed to copy exercise:', error);
      throw error;
    }
  }

  /**
   * Delete a custom exercise (soft delete for owned exercises only)
   */
  public async deleteCustomExercise(exerciseId: string): Promise<void> {
    if (!this.canStoreData()) {
      throw new Error('Storage consent required to delete exercises');
    }

    try {
      const userId = this.getCurrentUserId();
      if (!userId) {
        throw new Error('User authentication required to delete exercises');
      }

      const exercise = await this.db.exercises.get(exerciseId);
      if (!exercise) {
        throw new Error('Exercise not found');
      }

      if (exercise.owner_id !== userId) {
        throw new Error('Can only delete exercises you created');
      }

      const deletedExercise = prepareSoftDelete(exercise);
      await this.db.exercises.put(deletedExercise);
      logger.log('Custom exercise deleted:', exercise.name);
    } catch (error) {
      logger.error('Failed to delete custom exercise:', error);
      throw error;
    }
  }

  /**
   * Get current user ID from authentication context
   */
  private getCurrentUserId(): string | null {
    const user = authService.getCurrentUser();
    const userId = user?.id || null;
    if (!userId && SYNC_DEBUG) {
      logger.debug('[storageService] getCurrentUserId: user not authenticated', { user, authState: authService.getAuthState() });
    }
    return userId;
  }

  /**
   * Get all exercises (builtin + user-created + shared)
   * Now includes shared exercise references from user_favorites
   */
  public async getAllExercises(): Promise<StoredExercise[]> {
    if (!this.canStoreData()) {
      return [];
    }

    try {
      const userId = authService.getCurrentUser()?.id;

      const [storedExercises, sharedRefs] = await Promise.all([
        this.db.exercises
          .where('deleted')
          .equals(0) // Only get non-deleted exercises
          .toArray(),
        userId ? this.getSharedExerciseReferences(userId) : Promise.resolve([])
      ]);

      let allExercises = filterActiveRecords(storedExercises);

      // Add shared exercises if user is authenticated
      if (userId && sharedRefs.length > 0) {
        const sharedExerciseIds = sharedRefs.map(ref => ref.item_id);
        const sharedExercises = await this.getSharedExerciseData(sharedExerciseIds);

        // Mark shared exercises with metadata
        const enrichedSharedExercises = sharedExercises.map(ex => ({
          ...ex,
          is_shared_reference: true, // Flag to indicate this is a reference
          shared_at: sharedRefs.find(ref => ref.item_id === ex.id)?.created_at
        }));

        allExercises = [...allExercises, ...enrichedSharedExercises];
      }

      // Remove duplicates (in case a shared exercise is also owned by the user)
      const uniqueExercises = allExercises.reduce((acc, exercise) => {
        if (!acc.some(ex => ex.id === exercise.id)) {
          acc.push(exercise);
        }
        return acc;
      }, [] as StoredExercise[]);

      return uniqueExercises;
    } catch (error) {
      logger.error('Failed to get all exercises:', error);
      return [];
    }
  }

  // Catalog-aware exercise methods
  /**
   * Get exercises from a specific catalog
   */
  public async getExercisesByCatalog(catalogId: string): Promise<StoredExercise[]> {
    if (!this.canStoreData()) {
      return [];
    }

    try {
      const allExercises = await this.getAllExercises();
      return allExercises.filter(exercise => (exercise as StoredExercise & { catalogId?: string }).catalogId === catalogId);
    } catch (error) {
      logger.error('Failed to get exercises by catalog:', error);
      return [];
    }
  }

  /**
   * Get catalogs - placeholder for future dynamic catalog support
   * Currently returns static catalog definitions
   */
  public async getCatalogs(): Promise<ExerciseCatalog[]> {
    // Import here to avoid circular dependencies
    const { getAllCatalogs } = await import('../data/catalogs');
    return getAllCatalogs();
  }

  /**
   * Get available catalogs based on user's premium status
   * Currently returns static catalog definitions, filtered by premium status
   */
  public async getAvailableCatalogs(isPremiumUser: boolean = false): Promise<ExerciseCatalog[]> {
    // Import here to avoid circular dependencies
    const { getAvailableCatalogs } = await import('../data/catalogs');
    return getAvailableCatalogs(isPremiumUser);
  }

  /**
   * Get the default catalog (General Fitness)
   */
  public async getDefaultCatalog(): Promise<ExerciseCatalog> {
    // Import here to avoid circular dependencies
    const { getDefaultCatalog } = await import('../data/catalogs');
    return getDefaultCatalog();
  }

  // =============== Personal Records Methods ===============

  /**
   * Get all personal records from IndexedDB
   * 
   * @returns Array of all personal records
   */
  public async getPersonalRecords(): Promise<PersonalRecord[]> {
    if (!this.canStoreData()) {
      return [];
    }

    try {
      // Check if table exists (defensive check for databases created before v23)
      if (!this.db.personal_records) {
        logger.warn('Personal records table does not exist in database. Database may need upgrade.');
        return [];
      }
      
      const records = await this.db.personal_records.toArray();
      // Return only active records (filter out soft-deleted)
      return filterActiveRecords(records);
    } catch (error) {
      logger.error('Failed to get personal records from IndexedDB:', error);
      return [];
    }
  }

  /**
   * Save a personal record to IndexedDB
   * 
   * @param record - Personal record to save
   */
  /**
   * Save a personal record to IndexedDB (consent-aware)
   * Accepts either a new record (NewPersonalRecord) or a full record (PersonalRecord)
   * prepareUpsert will add sync metadata for new records
   * 
   * @param record - Personal record to save
   */
  public async savePersonalRecord(record: PersonalRecord | Partial<PersonalRecord>): Promise<void> {
    if (!this.canStoreData()) {
      logger.warn('Cannot save personal record without user consent');
      return;
    }

    try {
      // Check if table exists (defensive check for databases created before v23)
      if (!this.db.personal_records) {
        logger.warn('Personal records table does not exist in database. Database may need upgrade. Skipping save.');
        return;
      }
      
      const user = authService.getCurrentUser();
      const preparedRecord = prepareUpsert(record as PersonalRecord, user?.id);
      
      // Use put() to handle both insert and update operations
      await this.db.personal_records.put(preparedRecord);
      logger.log(`✅ Saved personal record: ${record.exerciseName} ${record.recordType} = ${record.value}`);
    } catch (error) {
      logger.error('Failed to save personal record to IndexedDB:', error);
    }
  }

  /**
   * Delete a personal record from IndexedDB (soft delete for sync)
   * 
   * @param recordId - ID of the personal record to delete
   */
  public async deletePersonalRecord(recordId: string): Promise<void> {
    if (!this.canStoreData()) {
      logger.warn('Cannot delete personal record without user consent');
      return;
    }

    try {
      // Check if table exists (defensive check for databases created before v23)
      if (!this.db.personal_records) {
        logger.warn('Personal records table does not exist in database. Database may need upgrade. Skipping delete.');
        return;
      }
      
      const user = authService.getCurrentUser();
      const record = await this.db.personal_records.get(recordId);
      
      if (!record) {
        logger.warn(`Personal record not found for deletion: ${recordId}`);
        return;
      }
      
      // Use soft delete (tombstone pattern) for sync compatibility
      const tombstone = prepareSoftDelete(record, user?.id);
      await this.db.personal_records.put(tombstone);
      logger.log(`🗑️ Soft deleted personal record: ${recordId}`);
    } catch (error) {
      logger.error('Failed to delete personal record from IndexedDB:', error);
    }
  }

  /**
   * Get personal records for a specific exercise (active records only)
   * 
   * @param exerciseId - Exercise ID to filter by
   * @returns Array of personal records for the exercise
   */
  public async getPersonalRecordsByExercise(exerciseId: string): Promise<PersonalRecord[]> {
    if (!this.canStoreData()) {
      return [];
    }

    try {
      // Check if table exists (defensive check for databases created before v23)
      if (!this.db.personal_records) {
        logger.warn('Personal records table does not exist in database. Database may need upgrade.');
        return [];
      }
      
      const allRecords = await this.db.personal_records.toArray();
      // Filter active records (not deleted) for the specific exercise
      return filterActiveRecords(allRecords).filter(record => record.exerciseId === exerciseId);
    } catch (error) {
      logger.error('Failed to get personal records by exercise from IndexedDB:', error);
      return [];
    }
  }

  // ============================================================================
  // User Profile Methods
  // ============================================================================

  /**
   * Get user's fitness profile
   * Returns null if no profile exists or user is not authenticated
   */
  public async getUserProfile(): Promise<UserProfile | null> {
    if (!this.canStoreData()) {
      return null;
    }

    try {
      const user = authService.getCurrentUser();
      if (!user) {
        logger.warn('Cannot get profile - user not authenticated');
        return null;
      }

      // Check if table exists (defensive check)
      if (!this.db.user_profiles) {
        logger.warn('User profiles table does not exist in database');
        return null;
      }

      // Find profile by user_id (there should be only one per user)
      const profiles = await this.db.user_profiles
        .where('user_id')
        .equals(user.id)
        .toArray();

      const activeProfiles = filterActiveRecords(profiles);
      
      if (activeProfiles.length === 0) {
        return null;
      }

      if (activeProfiles.length > 1) {
        logger.warn(`Multiple profiles found for user ${user.id}, returning first`);
      }

      return activeProfiles[0];
    } catch (error) {
      logger.error('Failed to get user profile from IndexedDB:', error);
      return null;
    }
  }

  /**
   * Save or update user's fitness profile (consent-aware)
   * 
   * @param profileData - Profile data to save (partial or full)
   * @returns True if successful, false otherwise
   */
  public async saveUserProfile(profileData: Partial<UserProfile>): Promise<boolean> {
    if (!this.canStoreData()) {
      logger.warn('Cannot save profile without user consent');
      return false;
    }

    try {
      const user = authService.getCurrentUser();
      if (!user) {
        logger.warn('Cannot save profile - user not authenticated');
        return false;
      }

      // Check if table exists (defensive check)
      if (!this.db.user_profiles) {
        logger.warn('User profiles table does not exist in database');
        return false;
      }

      // Check if profile already exists
      const existingProfile = await this.getUserProfile();

      let preparedProfile: UserProfile;

      if (existingProfile) {
        // Update existing profile - preserve join_date
        preparedProfile = prepareUpsert(
          {
            ...existingProfile,
            ...profileData,
            user_id: user.id,
            join_date: existingProfile.join_date || new Date().toISOString(), // Preserve original join date
            last_updated_from_wizard: new Date().toISOString(),
          },
          user.id
        );
      } else {
        // Create new profile
        preparedProfile = prepareUpsert(
          {
            id: crypto.randomUUID(),
            user_id: user.id,
            ...profileData,
            join_date: profileData.join_date || new Date().toISOString(), // Use provided or set to today
            last_updated_from_wizard: new Date().toISOString(),
          } as UserProfile,
          user.id
        );
      }

      await this.db.user_profiles.put(preparedProfile);
      logger.log(`✅ Saved user profile for user ${user.id}`);
      return true;
    } catch (error) {
      logger.error('Failed to save user profile to IndexedDB:', error);
      return false;
    }
  }

  /**
   * Delete user's fitness profile (soft delete for sync)
   * 
   * @returns True if successful, false otherwise
   */
  public async deleteUserProfile(): Promise<boolean> {
    if (!this.canStoreData()) {
      logger.warn('Cannot delete profile without user consent');
      return false;
    }

    try {
      const user = authService.getCurrentUser();
      if (!user) {
        logger.warn('Cannot delete profile - user not authenticated');
        return false;
      }

      // Check if table exists (defensive check)
      if (!this.db.user_profiles) {
        logger.warn('User profiles table does not exist in database');
        return false;
      }

      const profile = await this.getUserProfile();
      
      if (!profile) {
        logger.warn('No profile found to delete');
        return false;
      }

      // Use soft delete (tombstone pattern) for sync compatibility
      const tombstone = prepareSoftDelete(profile, user.id);
      await this.db.user_profiles.put(tombstone);
      logger.log(`🗑️ Soft deleted user profile for user ${user.id}`);
      return true;
    } catch (error) {
      logger.error('Failed to delete user profile from IndexedDB:', error);
      return false;
    }
  }
}

// Export singleton instance
export const storageService = StorageService.getInstance(); 