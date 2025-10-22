export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          catalog_id: string | null
          created_at: string | null
          deleted: boolean | null
          duration: number
          exercise_id: string | null
          exercise_name: string | null
          exercises: Json | null
          id: string
          is_workout: boolean | null
          notes: string | null
          owner_id: string | null
          reps_count: number | null
          sets_count: number | null
          timestamp: string
          updated_at: string | null
          version: number | null
          workout_id: string | null
          workout_name: string | null
        }
        Insert: {
          catalog_id?: string | null
          created_at?: string | null
          deleted?: boolean | null
          duration: number
          exercise_id?: string | null
          exercise_name?: string | null
          exercises?: Json | null
          id: string
          is_workout?: boolean | null
          notes?: string | null
          owner_id?: string | null
          reps_count?: number | null
          sets_count?: number | null
          timestamp: string
          updated_at?: string | null
          version?: number | null
          workout_id?: string | null
          workout_name?: string | null
        }
        Update: {
          catalog_id?: string | null
          created_at?: string | null
          deleted?: boolean | null
          duration?: number
          exercise_id?: string | null
          exercise_name?: string | null
          exercises?: Json | null
          id?: string
          is_workout?: boolean | null
          notes?: string | null
          owner_id?: string | null
          reps_count?: number | null
          sets_count?: number | null
          timestamp?: string
          updated_at?: string | null
          version?: number | null
          workout_id?: string | null
          workout_name?: string | null
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          created_at: string
          email: string
          granted_at: string
          granted_by: string | null
          id: string
          is_active: boolean
          permissions: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          is_active?: boolean
          permissions?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          is_active?: boolean
          permissions?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_usage_logs: {
        Row: {
          correlation_id: string
          created_at: string
          error_code: string | null
          id: string
          input_cost_usd: number
          input_tokens: number
          model: string
          output_cost_usd: number
          output_tokens: number
          processing_time_ms: number
          provider: string
          request_type: string
          success: boolean
          total_cost_usd: number
          total_tokens: number
          user_id: string | null
        }
        Insert: {
          correlation_id: string
          created_at?: string
          error_code?: string | null
          id?: string
          input_cost_usd: number
          input_tokens: number
          model: string
          output_cost_usd: number
          output_tokens: number
          processing_time_ms: number
          provider: string
          request_type?: string
          success: boolean
          total_cost_usd: number
          total_tokens: number
          user_id?: string | null
        }
        Update: {
          correlation_id?: string
          created_at?: string
          error_code?: string | null
          id?: string
          input_cost_usd?: number
          input_tokens?: number
          model?: string
          output_cost_usd?: number
          output_tokens?: number
          processing_time_ms?: number
          provider?: string
          request_type?: string
          success?: boolean
          total_cost_usd?: number
          total_tokens?: number
          user_id?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          app_version: string | null
          auto_start_next: boolean | null
          beep_interval_seconds: number | null
          beep_sound_enabled: boolean | null
          beep_volume: number | null
          created_at: string | null
          dark_mode: boolean | null
          data_auto_save: boolean | null
          default_interval_duration: number | null
          default_rest_time: number | null
          deleted: boolean | null
          horizontal_exercise_layout: boolean | null
          id: string
          owner_id: string | null
          pre_timer_countdown: number | null
          reduce_motion: boolean | null
          ring_timer: boolean | null
          show_exercise_videos: boolean | null
          sound_enabled: boolean | null
          updated_at: string | null
          version: number | null
          vibration_enabled: boolean | null
        }
        Insert: {
          app_version?: string | null
          auto_start_next?: boolean | null
          beep_interval_seconds?: number | null
          beep_sound_enabled?: boolean | null
          beep_volume?: number | null
          created_at?: string | null
          dark_mode?: boolean | null
          data_auto_save?: boolean | null
          default_interval_duration?: number | null
          default_rest_time?: number | null
          deleted?: boolean | null
          horizontal_exercise_layout?: boolean | null
          id: string
          owner_id?: string | null
          pre_timer_countdown?: number | null
          reduce_motion?: boolean | null
          ring_timer?: boolean | null
          show_exercise_videos?: boolean | null
          sound_enabled?: boolean | null
          updated_at?: string | null
          version?: number | null
          vibration_enabled?: boolean | null
        }
        Update: {
          app_version?: string | null
          auto_start_next?: boolean | null
          beep_interval_seconds?: number | null
          beep_sound_enabled?: boolean | null
          beep_volume?: number | null
          created_at?: string | null
          dark_mode?: boolean | null
          data_auto_save?: boolean | null
          default_interval_duration?: number | null
          default_rest_time?: number | null
          deleted?: boolean | null
          horizontal_exercise_layout?: boolean | null
          id?: string
          owner_id?: string | null
          pre_timer_countdown?: number | null
          reduce_motion?: boolean | null
          ring_timer?: boolean | null
          show_exercise_videos?: boolean | null
          sound_enabled?: boolean | null
          updated_at?: string | null
          version?: number | null
          vibration_enabled?: boolean | null
        }
        Relationships: []
      }
      app_versions: {
        Row: {
          build_number: string
          changelog: Json | null
          created_at: string
          git_commit_hash: string | null
          id: string
          is_active: boolean
          metadata: Json | null
          release_date: string
          reviewer: string
          update_policy: string
          updated_at: string
          version_number: string
        }
        Insert: {
          build_number: string
          changelog?: Json | null
          created_at?: string
          git_commit_hash?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json | null
          release_date?: string
          reviewer: string
          update_policy: string
          updated_at?: string
          version_number: string
        }
        Update: {
          build_number?: string
          changelog?: Json | null
          created_at?: string
          git_commit_hash?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json | null
          release_date?: string
          reviewer?: string
          update_policy?: string
          updated_at?: string
          version_number?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: string | null
          owner_id: string | null
          resource_id: string | null
          resource_type: string
          success: boolean | null
          user_agent: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          owner_id?: string | null
          resource_id?: string | null
          resource_type: string
          success?: boolean | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          owner_id?: string | null
          resource_id?: string | null
          resource_type?: string
          success?: boolean | null
          user_agent?: string | null
        }
        Relationships: []
      }
      coaching_ai_cache: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          insights_data: Json
          locale: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          insights_data: Json
          locale?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          insights_data?: Json
          locale?: string | null
          user_id?: string
        }
        Relationships: []
      }
      content_moderation: {
        Row: {
          ai_confidence: number | null
          ai_reasoning: string | null
          content_id: string
          content_type: string
          created_at: string | null
          deleted: boolean | null
          human_decision: string | null
          human_notes: string | null
          human_reviewer_id: string | null
          id: string
          reviewed_at: string | null
          status: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          ai_confidence?: number | null
          ai_reasoning?: string | null
          content_id: string
          content_type: string
          created_at?: string | null
          deleted?: boolean | null
          human_decision?: string | null
          human_notes?: string | null
          human_reviewer_id?: string | null
          id?: string
          reviewed_at?: string | null
          status?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          ai_confidence?: number | null
          ai_reasoning?: string | null
          content_id?: string
          content_type?: string
          created_at?: string | null
          deleted?: boolean | null
          human_decision?: string | null
          human_notes?: string | null
          human_reviewer_id?: string | null
          id?: string
          reviewed_at?: string | null
          status?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
      }
      exercise_catalogs: {
        Row: {
          color_theme: string
          created_at: string
          description_key: string
          display_order: number
          icon: string
          id: string
          is_default: boolean
          is_premium: boolean
          name_key: string
          picture_url: string | null
          updated_at: string
        }
        Insert: {
          color_theme: string
          created_at?: string
          description_key: string
          display_order?: number
          icon: string
          id: string
          is_default?: boolean
          is_premium?: boolean
          name_key: string
          picture_url?: string | null
          updated_at?: string
        }
        Update: {
          color_theme?: string
          created_at?: string
          description_key?: string
          display_order?: number
          icon?: string
          id?: string
          is_default?: boolean
          is_premium?: boolean
          name_key?: string
          picture_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      exercise_ratings: {
        Row: {
          created_at: string | null
          deleted: boolean | null
          exercise_id: string | null
          id: string
          is_verified: boolean | null
          owner_id: string | null
          rating: number | null
          review_text: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          deleted?: boolean | null
          exercise_id?: string | null
          id?: string
          is_verified?: boolean | null
          owner_id?: string | null
          rating?: number | null
          review_text?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          deleted?: boolean | null
          exercise_id?: string | null
          id?: string
          is_verified?: boolean | null
          owner_id?: string | null
          rating?: number | null
          review_text?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exercise_ratings_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_shares: {
        Row: {
          created_at: string | null
          deleted: boolean | null
          exercise_id: string | null
          expires_at: string | null
          id: string
          owner_id: string | null
          permission_level: string | null
          share_token: string | null
          shared_with_user_id: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          deleted?: boolean | null
          exercise_id?: string | null
          expires_at?: string | null
          id?: string
          owner_id?: string | null
          permission_level?: string | null
          share_token?: string | null
          shared_with_user_id?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          deleted?: boolean | null
          exercise_id?: string | null
          expires_at?: string | null
          id?: string
          owner_id?: string | null
          permission_level?: string | null
          share_token?: string | null
          shared_with_user_id?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exercise_shares_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_videos: {
        Row: {
          created_at: string | null
          deleted: boolean | null
          duration_seconds: number | null
          exercise_id: string | null
          file_size: number | null
          id: string
          is_approved: boolean | null
          updated_at: string | null
          uploader_id: string | null
          version: number | null
          video_url: string
        }
        Insert: {
          created_at?: string | null
          deleted?: boolean | null
          duration_seconds?: number | null
          exercise_id?: string | null
          file_size?: number | null
          id?: string
          is_approved?: boolean | null
          updated_at?: string | null
          uploader_id?: string | null
          version?: number | null
          video_url: string
        }
        Update: {
          created_at?: string | null
          deleted?: boolean | null
          duration_seconds?: number | null
          exercise_id?: string | null
          file_size?: number | null
          id?: string
          is_approved?: boolean | null
          updated_at?: string | null
          uploader_id?: string | null
          version?: number | null
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_videos_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          benefits: string | null
          best_timing: string | null
          catalog_id: string
          category: string | null
          copy_count: number | null
          created_at: string | null
          custom_video_url: string | null
          default_duration: number | null
          default_reps: number | null
          default_sets: number | null
          deleted: boolean | null
          description: string | null
          difficulty_level: string | null
          equipment_needed: string[] | null
          exercise_references: string[] | null
          exercise_type: string
          has_video: boolean | null
          id: string
          instructions: Json | null
          is_favorite: boolean | null
          is_public: boolean | null
          is_verified: boolean | null
          limitations: string | null
          muscle_groups: string[] | null
          name: string
          notes: string | null
          owner_id: string | null
          rating_average: number | null
          rating_count: number | null
          rep_duration_seconds: number | null
          suggested_combinations: string[] | null
          tags: string[] | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          benefits?: string | null
          best_timing?: string | null
          catalog_id: string
          category?: string | null
          copy_count?: number | null
          created_at?: string | null
          custom_video_url?: string | null
          default_duration?: number | null
          default_reps?: number | null
          default_sets?: number | null
          deleted?: boolean | null
          description?: string | null
          difficulty_level?: string | null
          equipment_needed?: string[] | null
          exercise_references?: string[] | null
          exercise_type: string
          has_video?: boolean | null
          id: string
          instructions?: Json | null
          is_favorite?: boolean | null
          is_public?: boolean | null
          is_verified?: boolean | null
          limitations?: string | null
          muscle_groups?: string[] | null
          name: string
          notes?: string | null
          owner_id?: string | null
          rating_average?: number | null
          rating_count?: number | null
          rep_duration_seconds?: number | null
          suggested_combinations?: string[] | null
          tags?: string[] | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          benefits?: string | null
          best_timing?: string | null
          catalog_id?: string
          category?: string | null
          copy_count?: number | null
          created_at?: string | null
          custom_video_url?: string | null
          default_duration?: number | null
          default_reps?: number | null
          default_sets?: number | null
          deleted?: boolean | null
          description?: string | null
          difficulty_level?: string | null
          equipment_needed?: string[] | null
          exercise_references?: string[] | null
          exercise_type?: string
          has_video?: boolean | null
          id?: string
          instructions?: Json | null
          is_favorite?: boolean | null
          is_public?: boolean | null
          is_verified?: boolean | null
          limitations?: string | null
          muscle_groups?: string[] | null
          name?: string
          notes?: string | null
          owner_id?: string | null
          rating_average?: number | null
          rating_count?: number | null
          rep_duration_seconds?: number | null
          suggested_combinations?: string[] | null
          tags?: string[] | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exercises_profiles_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["owner_id"]
          },
          {
            foreignKeyName: "fk_exercises_catalog_id"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "exercise_catalogs"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string | null
          description: string | null
          flag_name: string
          id: string
          is_enabled: boolean | null
          target_audience: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          flag_name: string
          id?: string
          is_enabled?: boolean | null
          target_audience?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          flag_name?: string
          id?: string
          is_enabled?: boolean | null
          target_audience?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      legal_acceptances: {
        Row: {
          accepted_at: string
          accepted_version: string
          content_hash: string
          doc_id: string
          locale: string
          user_id: string
        }
        Insert: {
          accepted_at?: string
          accepted_version: string
          content_hash: string
          doc_id: string
          locale: string
          user_id: string
        }
        Update: {
          accepted_at?: string
          accepted_version?: string
          content_hash?: string
          doc_id?: string
          locale?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_locked: boolean | null
          avatar_url: string | null
          created_at: string | null
          data_export_requested_at: string | null
          deletion_requested_at: string | null
          display_name: string | null
          failed_login_attempts: number | null
          last_login_at: string | null
          last_login_ip: string | null
          locked_until: string | null
          login_count: number | null
          owner_id: string
          updated_at: string | null
        }
        Insert: {
          account_locked?: boolean | null
          avatar_url?: string | null
          created_at?: string | null
          data_export_requested_at?: string | null
          deletion_requested_at?: string | null
          display_name?: string | null
          failed_login_attempts?: number | null
          last_login_at?: string | null
          last_login_ip?: string | null
          locked_until?: string | null
          login_count?: number | null
          owner_id: string
          updated_at?: string | null
        }
        Update: {
          account_locked?: boolean | null
          avatar_url?: string | null
          created_at?: string | null
          data_export_requested_at?: string | null
          deletion_requested_at?: string | null
          display_name?: string | null
          failed_login_attempts?: number | null
          last_login_at?: string | null
          last_login_ip?: string | null
          locked_until?: string | null
          login_count?: number | null
          owner_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      sync_cursors: {
        Row: {
          created_at: string | null
          last_ack_cursor: string | null
          owner_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          last_ack_cursor?: string | null
          owner_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          last_ack_cursor?: string | null
          owner_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_authenticators: {
        Row: {
          counter: number
          created_at: string | null
          credential_id: string
          credential_public_key: string
          device_name: string | null
          id: string
          last_used_at: string | null
          owner_id: string
        }
        Insert: {
          counter?: number
          created_at?: string | null
          credential_id: string
          credential_public_key: string
          device_name?: string | null
          id?: string
          last_used_at?: string | null
          owner_id: string
        }
        Update: {
          counter?: number
          created_at?: string | null
          credential_id?: string
          credential_public_key?: string
          device_name?: string | null
          id?: string
          last_used_at?: string | null
          owner_id?: string
        }
        Relationships: []
      }
      user_catalog_access: {
        Row: {
          catalog_id: string
          created_at: string | null
          expires_at: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          notes: string | null
          owner_id: string
        }
        Insert: {
          catalog_id: string
          created_at?: string | null
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          notes?: string | null
          owner_id: string
        }
        Update: {
          catalog_id?: string
          created_at?: string | null
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          notes?: string | null
          owner_id?: string
        }
        Relationships: []
      }
      user_favorites: {
        Row: {
          created_at: string | null
          deleted: boolean | null
          exercise_type: string | null
          id: string
          item_id: string
          item_type: string | null
          owner_id: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          deleted?: boolean | null
          exercise_type?: string | null
          id?: string
          item_id: string
          item_type?: string | null
          owner_id?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          deleted?: boolean | null
          exercise_type?: string | null
          id?: string
          item_id?: string
          item_type?: string | null
          owner_id?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string | null
          cues: Json | null
          deleted: boolean | null
          favorite_exercises: string[] | null
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
          favorite_exercises?: string[] | null
          id: string
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
          favorite_exercises?: string[] | null
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
      version_audit: {
        Row: {
          action: string
          changed_by: string
          changes: Json | null
          created_at: string
          id: string
          new_values: Json | null
          old_values: Json | null
          version_id: string
        }
        Insert: {
          action: string
          changed_by: string
          changes?: Json | null
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          version_id: string
        }
        Update: {
          action?: string
          changed_by?: string
          changes?: Json | null
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "version_audit_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "app_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      video_files: {
        Row: {
          created_at: string | null
          deleted: boolean | null
          exercise_id: string
          file_data: string | null
          file_name: string
          file_size: number
          id: string
          mime_type: string
          owner_id: string | null
          storage_path: string | null
          updated_at: string | null
          upload_pending: boolean
          version: number | null
        }
        Insert: {
          created_at?: string | null
          deleted?: boolean | null
          exercise_id: string
          file_data?: string | null
          file_name: string
          file_size: number
          id?: string
          mime_type: string
          owner_id?: string | null
          storage_path?: string | null
          updated_at?: string | null
          upload_pending?: boolean
          version?: number | null
        }
        Update: {
          created_at?: string | null
          deleted?: boolean | null
          exercise_id?: string
          file_data?: string | null
          file_name?: string
          file_size?: number
          id?: string
          mime_type?: string
          owner_id?: string | null
          storage_path?: string | null
          updated_at?: string | null
          upload_pending?: boolean
          version?: number | null
        }
        Relationships: []
      }
      webauthn_challenges: {
        Row: {
          challenge: string
          created_at: string | null
          expires_at: string
          id: string
          owner_id: string | null
          type: string
        }
        Insert: {
          challenge: string
          created_at?: string | null
          expires_at: string
          id?: string
          owner_id?: string | null
          type: string
        }
        Update: {
          challenge?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          owner_id?: string | null
          type?: string
        }
        Relationships: []
      }
      workout_ratings: {
        Row: {
          created_at: string | null
          deleted: boolean | null
          id: string
          is_verified: boolean | null
          owner_id: string | null
          rating: number | null
          review_text: string | null
          updated_at: string | null
          version: number | null
          workout_id: string | null
        }
        Insert: {
          created_at?: string | null
          deleted?: boolean | null
          id?: string
          is_verified?: boolean | null
          owner_id?: string | null
          rating?: number | null
          review_text?: string | null
          updated_at?: string | null
          version?: number | null
          workout_id?: string | null
        }
        Update: {
          created_at?: string | null
          deleted?: boolean | null
          id?: string
          is_verified?: boolean | null
          owner_id?: string | null
          rating?: number | null
          review_text?: string | null
          updated_at?: string | null
          version?: number | null
          workout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_ratings_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sessions: {
        Row: {
          completion_percentage: number | null
          created_at: string | null
          deleted: boolean | null
          end_time: string | null
          exercises: Json | null
          exercises_completed: number | null
          id: string
          is_completed: boolean | null
          notes: string | null
          owner_id: string | null
          start_time: string
          total_duration: number | null
          total_exercises: number | null
          updated_at: string | null
          version: number | null
          workout_id: string | null
          workout_name: string | null
        }
        Insert: {
          completion_percentage?: number | null
          created_at?: string | null
          deleted?: boolean | null
          end_time?: string | null
          exercises?: Json | null
          exercises_completed?: number | null
          id: string
          is_completed?: boolean | null
          notes?: string | null
          owner_id?: string | null
          start_time: string
          total_duration?: number | null
          total_exercises?: number | null
          updated_at?: string | null
          version?: number | null
          workout_id?: string | null
          workout_name?: string | null
        }
        Update: {
          completion_percentage?: number | null
          created_at?: string | null
          deleted?: boolean | null
          end_time?: string | null
          exercises?: Json | null
          exercises_completed?: number | null
          id?: string
          is_completed?: boolean | null
          notes?: string | null
          owner_id?: string | null
          start_time?: string
          total_duration?: number | null
          total_exercises?: number | null
          updated_at?: string | null
          version?: number | null
          workout_id?: string | null
          workout_name?: string | null
        }
        Relationships: []
      }
      workout_shares: {
        Row: {
          created_at: string | null
          deleted: boolean | null
          id: string
          owner_id: string | null
          permission_level: string | null
          shared_with_user_id: string | null
          updated_at: string | null
          version: number | null
          workout_id: string | null
        }
        Insert: {
          created_at?: string | null
          deleted?: boolean | null
          id?: string
          owner_id?: string | null
          permission_level?: string | null
          shared_with_user_id?: string | null
          updated_at?: string | null
          version?: number | null
          workout_id?: string | null
        }
        Update: {
          created_at?: string | null
          deleted?: boolean | null
          id?: string
          owner_id?: string | null
          permission_level?: string | null
          shared_with_user_id?: string | null
          updated_at?: string | null
          version?: number | null
          workout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_shares_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workouts: {
        Row: {
          copy_count: number | null
          created_at: string | null
          deleted: boolean | null
          description: string | null
          difficulty_level: string | null
          estimated_duration: number | null
          exercises: Json
          id: string
          is_active: boolean | null
          is_public: boolean | null
          is_verified: boolean | null
          name: string
          owner_id: string | null
          rating_average: number | null
          rating_count: number | null
          scheduled_days: string[] | null
          tags: string[] | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          copy_count?: number | null
          created_at?: string | null
          deleted?: boolean | null
          description?: string | null
          difficulty_level?: string | null
          estimated_duration?: number | null
          exercises?: Json
          id: string
          is_active?: boolean | null
          is_public?: boolean | null
          is_verified?: boolean | null
          name: string
          owner_id?: string | null
          rating_average?: number | null
          rating_count?: number | null
          scheduled_days?: string[] | null
          tags?: string[] | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          copy_count?: number | null
          created_at?: string | null
          deleted?: boolean | null
          description?: string | null
          difficulty_level?: string | null
          estimated_duration?: number | null
          exercises?: Json
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          is_verified?: boolean | null
          name?: string
          owner_id?: string | null
          rating_average?: number | null
          rating_count?: number | null
          scheduled_days?: string[] | null
          tags?: string[] | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      ai_usage_daily: {
        Row: {
          avg_cost_per_request: number | null
          avg_input_tokens: number | null
          avg_output_tokens: number | null
          avg_processing_time_ms: number | null
          date: string | null
          failed_requests: number | null
          max_processing_time_ms: number | null
          min_processing_time_ms: number | null
          model: string | null
          provider: string | null
          success_rate_percent: number | null
          successful_requests: number | null
          total_cost_usd: number | null
          total_input_tokens: number | null
          total_output_tokens: number | null
          total_requests: number | null
          total_tokens: number | null
        }
        Relationships: []
      }
      ai_usage_errors: {
        Row: {
          avg_processing_time_ms: number | null
          date: string | null
          error_code: string | null
          error_count: number | null
          first_occurrence: string | null
          last_occurrence: string | null
          model: string | null
          provider: string | null
        }
        Relationships: []
      }
      ai_usage_monthly: {
        Row: {
          avg_cost_per_request: number | null
          avg_input_tokens: number | null
          avg_output_tokens: number | null
          avg_processing_time_ms: number | null
          failed_requests: number | null
          model: string | null
          month: string | null
          provider: string | null
          success_rate_percent: number | null
          successful_requests: number | null
          total_cost_usd: number | null
          total_input_tokens: number | null
          total_output_tokens: number | null
          total_requests: number | null
          total_tokens: number | null
        }
        Relationships: []
      }
      ai_usage_per_user: {
        Row: {
          avg_cost_per_request: number | null
          email: string | null
          failed_requests: number | null
          first_request_at: string | null
          last_request_at: string | null
          successful_requests: number | null
          total_cost_usd: number | null
          total_requests: number | null
          total_tokens: number | null
          user_id: string | null
        }
        Relationships: []
      }
      ai_usage_summary: {
        Row: {
          avg_cost_per_request: number | null
          avg_processing_time_ms: number | null
          failed_requests: number | null
          first_request_at: string | null
          last_request_at: string | null
          model: string | null
          provider: string | null
          success_rate_percent: number | null
          successful_requests: number | null
          total_cost_usd: number | null
          total_requests: number | null
          total_tokens: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      cleanup_expired_challenges: { Args: never; Returns: undefined }
      cleanup_expired_coaching_cache: { Args: never; Returns: number }
      cleanup_expired_shares: { Args: never; Returns: number }
      exec_sql: { Args: { params?: string[]; sql: string }; Returns: Json }
      generate_share_token: { Args: never; Returns: string }
      get_avg_ai_cost_per_request: { Args: { days?: number }; Returns: number }
      get_current_month_ai_cost: { Args: never; Returns: number }
      get_today_ai_cost: { Args: never; Returns: number }
      grant_catalog_access: {
        Args: {
          granted_by_email: string
          p_catalog_id: string
          p_expires_at?: string
          p_notes?: string
          user_email: string
        }
        Returns: undefined
      }
      revoke_catalog_access: {
        Args: { p_catalog_id: string; user_email: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
