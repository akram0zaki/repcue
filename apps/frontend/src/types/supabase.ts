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
          created_at: string | null
          deleted: boolean | null
          duration: number
          exercise_id: string
          exercise_name: string
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
        }
        Insert: {
          created_at?: string | null
          deleted?: boolean | null
          duration: number
          exercise_id: string
          exercise_name: string
          exercises?: Json | null
          id?: string
          is_workout?: boolean | null
          notes?: string | null
          owner_id?: string | null
          reps_count?: number | null
          sets_count?: number | null
          timestamp: string
          updated_at?: string | null
          version?: number | null
          workout_id?: string | null
        }
        Update: {
          created_at?: string | null
          deleted?: boolean | null
          duration?: number
          exercise_id?: string
          exercise_name?: string
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
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          auto_save: boolean | null
          auto_start_next: boolean | null
          beep_volume: number | null
          created_at: string | null
          dark_mode: boolean | null
          default_rest_time: number | null
          deleted: boolean | null
          id: string
          interval_duration: number | null
          last_selected_exercise_id: string | null
          owner_id: string | null
          pre_timer_countdown: number | null
          reduce_motion: boolean | null
          rep_speed_factor: number | null
          show_exercise_videos: boolean | null
          sound_enabled: boolean | null
          updated_at: string | null
          version: number | null
          vibration_enabled: boolean | null
        }
        Insert: {
          auto_save?: boolean | null
          auto_start_next?: boolean | null
          beep_volume?: number | null
          created_at?: string | null
          dark_mode?: boolean | null
          default_rest_time?: number | null
          deleted?: boolean | null
          id?: string
          interval_duration?: number | null
          last_selected_exercise_id?: string | null
          owner_id?: string | null
          pre_timer_countdown?: number | null
          reduce_motion?: boolean | null
          rep_speed_factor?: number | null
          show_exercise_videos?: boolean | null
          sound_enabled?: boolean | null
          updated_at?: string | null
          version?: number | null
          vibration_enabled?: boolean | null
        }
        Update: {
          auto_save?: boolean | null
          auto_start_next?: boolean | null
          beep_volume?: number | null
          created_at?: string | null
          dark_mode?: boolean | null
          default_rest_time?: number | null
          deleted?: boolean | null
          id?: string
          interval_duration?: number | null
          last_selected_exercise_id?: string | null
          owner_id?: string | null
          pre_timer_countdown?: number | null
          reduce_motion?: boolean | null
          rep_speed_factor?: number | null
          show_exercise_videos?: boolean | null
          sound_enabled?: boolean | null
          updated_at?: string | null
          version?: number | null
          vibration_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_app_settings_last_selected_exercise"
            columns: ["last_selected_exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: unknown | null
          resource_id: string | null
          resource_type: string
          success: boolean
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          resource_id?: string | null
          resource_type: string
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          resource_id?: string | null
          resource_type?: string
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
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
          human_decision: string | null
          human_notes: string | null
          human_reviewer_id: string | null
          id: string
          reviewed_at: string | null
          status: string | null
        }
        Insert: {
          ai_confidence?: number | null
          ai_reasoning?: string | null
          content_id: string
          content_type: string
          created_at?: string | null
          human_decision?: string | null
          human_notes?: string | null
          human_reviewer_id?: string | null
          id?: string
          reviewed_at?: string | null
          status?: string | null
        }
        Update: {
          ai_confidence?: number | null
          ai_reasoning?: string | null
          content_id?: string
          content_type?: string
          created_at?: string | null
          human_decision?: string | null
          human_notes?: string | null
          human_reviewer_id?: string | null
          id?: string
          reviewed_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      exercise_ratings: {
        Row: {
          created_at: string | null
          deleted: boolean
          exercise_id: string
          id: string
          is_verified: boolean | null
          rating: number
          review_text: string | null
          updated_at: string | null
          user_id: string
          version: number | null
        }
        Insert: {
          created_at?: string | null
          deleted?: boolean
          exercise_id: string
          id?: string
          is_verified?: boolean | null
          rating: number
          review_text?: string | null
          updated_at?: string | null
          user_id: string
          version?: number | null
        }
        Update: {
          created_at?: string | null
          deleted?: boolean
          exercise_id?: string
          id?: string
          is_verified?: boolean | null
          rating?: number
          review_text?: string | null
          updated_at?: string | null
          user_id?: string
          version?: number | null
        }
        Relationships: []
      }
      exercise_shares: {
        Row: {
          created_at: string | null
          deleted: boolean
          exercise_id: string
          id: string
          owner_id: string
          permission_level: string | null
          shared_with_user_id: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          deleted?: boolean
          exercise_id: string
          id?: string
          owner_id: string
          permission_level?: string | null
          shared_with_user_id?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          deleted?: boolean
          exercise_id?: string
          id?: string
          owner_id?: string
          permission_level?: string | null
          shared_with_user_id?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
      }
      exercise_videos: {
        Row: {
          created_at: string | null
          deleted: boolean
          duration_seconds: number | null
          exercise_id: string
          file_size: number | null
          id: string
          is_approved: boolean | null
          updated_at: string | null
          uploader_id: string
          version: number | null
          video_url: string
        }
        Insert: {
          created_at?: string | null
          deleted?: boolean
          duration_seconds?: number | null
          exercise_id: string
          file_size?: number | null
          id?: string
          is_approved?: boolean | null
          updated_at?: string | null
          uploader_id: string
          version?: number | null
          video_url: string
        }
        Update: {
          created_at?: string | null
          deleted?: boolean
          duration_seconds?: number | null
          exercise_id?: string
          file_size?: number | null
          id?: string
          is_approved?: boolean | null
          updated_at?: string | null
          uploader_id?: string
          version?: number | null
          video_url?: string
        }
        Relationships: []
      }
      exercises: {
        Row: {
          category: string
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
          exercise_type: string
          has_video: boolean | null
          id: string
          instructions: Json | null
          is_favorite: boolean | null
          is_public: boolean | null
          is_verified: boolean | null
          muscle_groups: string[] | null
          name: string
          owner_id: string | null
          rating_average: number | null
          rating_count: number | null
          rep_duration_seconds: number | null
          tags: Json | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          category: string
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
          exercise_type: string
          has_video?: boolean | null
          id?: string
          instructions?: Json | null
          is_favorite?: boolean | null
          is_public?: boolean | null
          is_verified?: boolean | null
          muscle_groups?: string[] | null
          name: string
          owner_id?: string | null
          rating_average?: number | null
          rating_count?: number | null
          rep_duration_seconds?: number | null
          tags?: Json | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          category?: string
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
          exercise_type?: string
          has_video?: boolean | null
          id?: string
          instructions?: Json | null
          is_favorite?: boolean | null
          is_public?: boolean | null
          is_verified?: boolean | null
          muscle_groups?: string[] | null
          name?: string
          owner_id?: string | null
          rating_average?: number | null
          rating_count?: number | null
          rep_duration_seconds?: number | null
          tags?: Json | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          deletion_requested_at: string | null
          display_name: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          deletion_requested_at?: string | null
          display_name?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          deletion_requested_at?: string | null
          display_name?: string | null
          updated_at?: string | null
          user_id?: string
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
      user_authenticators: {
        Row: {
          counter: number
          created_at: string
          credential_id: string
          credential_public_key: string
          device_name: string | null
          id: string
          last_used_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          counter?: number
          created_at?: string
          credential_id: string
          credential_public_key: string
          device_name?: string | null
          id?: string
          last_used_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          counter?: number
          created_at?: string
          credential_id?: string
          credential_public_key?: string
          device_name?: string | null
          id?: string
          last_used_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_favorites: {
        Row: {
          created_at: string | null
          deleted: boolean
          exercise_type: string | null
          id: string
          item_id: string
          item_type: string | null
          updated_at: string | null
          user_id: string
          version: number | null
        }
        Insert: {
          created_at?: string | null
          deleted?: boolean
          exercise_type?: string | null
          id?: string
          item_id: string
          item_type?: string | null
          updated_at?: string | null
          user_id: string
          version?: number | null
        }
        Update: {
          created_at?: string | null
          deleted?: boolean
          exercise_type?: string | null
          id?: string
          item_id?: string
          item_type?: string | null
          updated_at?: string | null
          user_id?: string
          version?: number | null
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string | null
          cues: Json | null
          dark_mode: boolean | null
          default_interval_duration: number | null
          deleted: boolean | null
          favorite_exercises: string[] | null
          id: string
          locale: string | null
          owner_id: string | null
          rep_speed_factor: number | null
          sound_enabled: boolean | null
          units: string | null
          updated_at: string | null
          version: number | null
          vibration_enabled: boolean | null
        }
        Insert: {
          created_at?: string | null
          cues?: Json | null
          dark_mode?: boolean | null
          default_interval_duration?: number | null
          deleted?: boolean | null
          favorite_exercises?: string[] | null
          id?: string
          locale?: string | null
          owner_id?: string | null
          rep_speed_factor?: number | null
          sound_enabled?: boolean | null
          units?: string | null
          updated_at?: string | null
          version?: number | null
          vibration_enabled?: boolean | null
        }
        Update: {
          created_at?: string | null
          cues?: Json | null
          dark_mode?: boolean | null
          default_interval_duration?: number | null
          deleted?: boolean | null
          favorite_exercises?: string[] | null
          id?: string
          locale?: string | null
          owner_id?: string | null
          rep_speed_factor?: number | null
          sound_enabled?: boolean | null
          units?: string | null
          updated_at?: string | null
          version?: number | null
          vibration_enabled?: boolean | null
        }
        Relationships: []
      }
      webauthn_challenges: {
        Row: {
          challenge: string
          created_at: string
          expires_at: string
          id: string
          type: string
          user_id: string | null
        }
        Insert: {
          challenge: string
          created_at?: string
          expires_at: string
          id?: string
          type: string
          user_id?: string | null
        }
        Update: {
          challenge?: string
          created_at?: string
          expires_at?: string
          id?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      workout_ratings: {
        Row: {
          created_at: string | null
          deleted: boolean
          id: string
          is_verified: boolean | null
          rating: number
          review_text: string | null
          updated_at: string | null
          user_id: string
          version: number | null
          workout_id: string
        }
        Insert: {
          created_at?: string | null
          deleted?: boolean
          id?: string
          is_verified?: boolean | null
          rating: number
          review_text?: string | null
          updated_at?: string | null
          user_id: string
          version?: number | null
          workout_id: string
        }
        Update: {
          created_at?: string | null
          deleted?: boolean
          id?: string
          is_verified?: boolean | null
          rating?: number
          review_text?: string | null
          updated_at?: string | null
          user_id?: string
          version?: number | null
          workout_id?: string
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
          exercises: Json
          id: string
          is_completed: boolean | null
          notes: string | null
          owner_id: string | null
          start_time: string
          total_duration: number | null
          updated_at: string | null
          version: number | null
          workout_id: string | null
          workout_name: string
        }
        Insert: {
          completion_percentage?: number | null
          created_at?: string | null
          deleted?: boolean | null
          end_time?: string | null
          exercises?: Json
          id?: string
          is_completed?: boolean | null
          notes?: string | null
          owner_id?: string | null
          start_time: string
          total_duration?: number | null
          updated_at?: string | null
          version?: number | null
          workout_id?: string | null
          workout_name: string
        }
        Update: {
          completion_percentage?: number | null
          created_at?: string | null
          deleted?: boolean | null
          end_time?: string | null
          exercises?: Json
          id?: string
          is_completed?: boolean | null
          notes?: string | null
          owner_id?: string | null
          start_time?: string
          total_duration?: number | null
          updated_at?: string | null
          version?: number | null
          workout_id?: string | null
          workout_name?: string
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
      workout_shares: {
        Row: {
          created_at: string | null
          deleted: boolean
          id: string
          owner_id: string
          permission_level: string | null
          shared_with_user_id: string | null
          updated_at: string | null
          version: number | null
          workout_id: string
        }
        Insert: {
          created_at?: string | null
          deleted?: boolean
          id?: string
          owner_id: string
          permission_level?: string | null
          shared_with_user_id?: string | null
          updated_at?: string | null
          version?: number | null
          workout_id: string
        }
        Update: {
          created_at?: string | null
          deleted?: boolean
          id?: string
          owner_id?: string
          permission_level?: string | null
          shared_with_user_id?: string | null
          updated_at?: string | null
          version?: number | null
          workout_id?: string
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
          id?: string
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
