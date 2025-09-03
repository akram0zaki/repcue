import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check that VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file.'
  );
}

// Create Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: {
      getItem: (key: string) => {
        // Use localStorage for auth token persistence
        try {
          return localStorage.getItem(key);
        } catch {
          return null;
        }
      },
      setItem: (key: string, value: string) => {
        try {
          localStorage.setItem(key, value);
        } catch {
          // Ignore storage errors in environments where localStorage is not available
        }
      },
      removeItem: (key: string) => {
        try {
          localStorage.removeItem(key);
        } catch {
          // Ignore storage errors
        }
      },
    }
  },
  global: {
    headers: {
      'X-Client-Info': 'repcue-frontend@1.0.0'
    }
  }
});

// Generated Database types from Supabase schema
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      audit_logs: {
        Row: {
          id: string
          user_id: string | null
          action: string
          resource_type: string
          resource_id: string | null
          details: Json
          ip_address: string | null
          user_agent: string | null
          success: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          resource_type: string
          resource_id?: string | null
          details?: Json
          ip_address?: string | null
          user_agent?: string | null
          success?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          action?: string
          resource_type?: string
          resource_id?: string | null
          details?: Json
          ip_address?: string | null
          user_agent?: string | null
          success?: boolean
          created_at?: string
        }
        Relationships: []
      }
      activity_logs: {
        Row: {
          created_at: string | null
          deleted: boolean | null
          duration: number
          exercise_id: string | null
          id: string
          notes: string | null
          owner_id: string | null
          reps: number | null
          sets: number | null
          timestamp: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          deleted?: boolean | null
          duration: number
          exercise_id?: string | null
          id?: string
          notes?: string | null
          owner_id?: string | null
          reps?: number | null
          sets?: number | null
          timestamp: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          deleted?: boolean | null
          duration?: number
          exercise_id?: string | null
          id?: string
          notes?: string | null
          owner_id?: string | null
          reps?: number | null
          sets?: number | null
          timestamp?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          auto_start_next: boolean | null
          created_at: string | null
          dark_mode: boolean | null
          default_rest_time: number | null
          deleted: boolean | null
          id: string
          owner_id: string | null
          reduce_motion: boolean | null
          updated_at: string | null
          version: number | null
          vibration_enabled: boolean | null
        }
        Insert: {
          auto_start_next?: boolean | null
          created_at?: string | null
          dark_mode?: boolean | null
          default_rest_time?: number | null
          deleted?: boolean | null
          id?: string
          owner_id?: string | null
          reduce_motion?: boolean | null
          updated_at?: string | null
          version?: number | null
          vibration_enabled?: boolean | null
        }
        Update: {
          auto_start_next?: boolean | null
          created_at?: string | null
          dark_mode?: boolean | null
          default_rest_time?: number | null
          deleted?: boolean | null
          id?: string
          owner_id?: string | null
          reduce_motion?: boolean | null
          updated_at?: string | null
          version?: number | null
          vibration_enabled?: boolean | null
        }
        Relationships: []
      }
      exercises: {
        Row: {
          category: string
          created_at: string | null
          deleted: boolean | null
          description: string | null
          exercise_type: string
          id: string
          instructions: Json | null
          is_favorite: boolean | null
          name: string
          owner_id: string | null
          rep_duration_seconds: number | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          category: string
          created_at?: string | null
          deleted?: boolean | null
          description?: string | null
          exercise_type: string
          id?: string
          instructions?: Json | null
          is_favorite?: boolean | null
          name: string
          owner_id?: string | null
          rep_duration_seconds?: number | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          category?: string
          created_at?: string | null
          deleted?: boolean | null
          description?: string | null
          exercise_type?: string
          id?: string
          instructions?: Json | null
          is_favorite?: boolean | null
          name?: string
          owner_id?: string | null
          rep_duration_seconds?: number | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          updated_at: string | null
          user_id: string
          last_login_at: string | null
          last_login_ip: string | null
          login_count: number | null
          account_locked: boolean | null
          locked_until: string | null
          failed_login_attempts: number | null
          data_export_requested_at: string | null
          deletion_requested_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          updated_at?: string | null
          user_id: string
          last_login_at?: string | null
          last_login_ip?: string | null
          login_count?: number | null
          account_locked?: boolean | null
          locked_until?: string | null
          failed_login_attempts?: number | null
          data_export_requested_at?: string | null
          deletion_requested_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          updated_at?: string | null
          user_id?: string
          last_login_at?: string | null
          last_login_ip?: string | null
          login_count?: number | null
          account_locked?: boolean | null
          locked_until?: string | null
          failed_login_attempts?: number | null
          data_export_requested_at?: string | null
          deletion_requested_at?: string | null
        }
        Relationships: []
      }
      user_authenticators: {
        Row: {
          id: string
          user_id: string
          credential_id: string
          credential_public_key: string
          counter: number
          created_at: string
          last_used_at: string | null
          device_name: string | null
        }
        Insert: {
          id?: string
          user_id: string
          credential_id: string
          credential_public_key: string
          counter?: number
          created_at?: string
          last_used_at?: string | null
          device_name?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          credential_id?: string
          credential_public_key?: string
          counter?: number
          created_at?: string
          last_used_at?: string | null
          device_name?: string | null
        }
        Relationships: []
      }
      webauthn_challenges: {
        Row: {
          id: string
          user_id: string | null
          challenge: string
          type: string
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          challenge: string
          type: string
          expires_at: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          challenge?: string
          type?: string
          expires_at?: string
          created_at?: string
        }
        Relationships: []
      }
      sync_cursors: {
        Row: {
          created_at: string | null
          last_ack_cursor: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          last_ack_cursor?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          last_ack_cursor?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string | null
          cues: Json | null
          deleted: boolean | null
          id: string
          locale: string | null
          owner_id: string | null
          rep_speed_factor: number | null
          units: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          cues?: Json | null
          deleted?: boolean | null
          id?: string
          locale?: string | null
          owner_id?: string | null
          rep_speed_factor?: number | null
          units?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          cues?: Json | null
          deleted?: boolean | null
          id?: string
          locale?: string | null
          owner_id?: string | null
          rep_speed_factor?: number | null
          units?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
      }
      workout_sessions: {
        Row: {
          created_at: string | null
          deleted: boolean | null
          end_time: string | null
          exercises_completed: number | null
          id: string
          is_completed: boolean | null
          notes: string | null
          owner_id: string | null
          start_time: string
          total_exercises: number | null
          updated_at: string | null
          version: number | null
          workout_id: string | null
        }
        Insert: {
          created_at?: string | null
          deleted?: boolean | null
          end_time?: string | null
          exercises_completed?: number | null
          id?: string
          is_completed?: boolean | null
          notes?: string | null
          owner_id?: string | null
          start_time: string
          total_exercises?: number | null
          updated_at?: string | null
          version?: number | null
          workout_id?: string | null
        }
        Update: {
          created_at?: string | null
          deleted?: boolean | null
          end_time?: string | null
          exercises_completed?: number | null
          id?: string
          is_completed?: boolean | null
          notes?: string | null
          owner_id?: string | null
          start_time?: string
          total_exercises?: number | null
          updated_at?: string | null
          version?: number | null
          workout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workouts: {
        Row: {
          created_at: string | null
          deleted: boolean | null
          description: string | null
          exercises: Json
          id: string
          name: string
          owner_id: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          deleted?: boolean | null
          description?: string | null
          exercises?: Json
          id?: string
          name: string
          owner_id?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          deleted?: boolean | null
          description?: string | null
          exercises?: Json
          id?: string
          name?: string
          owner_id?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type { Session, User } from '@supabase/supabase-js';

