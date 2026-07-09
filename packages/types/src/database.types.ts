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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_internal_config: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      appointment_participants: {
        Row: {
          appointment_id: string
          created_at: string
          id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          appointment_id: string
          created_at?: string
          id?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          appointment_id?: string
          created_at?: string
          id?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_participants_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_participants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_type: string | null
          client_id: string
          coach_id: string | null
          created_at: string | null
          description: string | null
          end_time: string
          group_mode: string | null
          id: string
          location: string | null
          meeting_url: string | null
          notes: string | null
          reminder_sent_at: string | null
          start_time: string
          status: string | null
          tenant_id: string
          title: string | null
          updated_at: string | null
        }
        Insert: {
          appointment_type?: string | null
          client_id: string
          coach_id?: string | null
          created_at?: string | null
          description?: string | null
          end_time: string
          group_mode?: string | null
          id?: string
          location?: string | null
          meeting_url?: string | null
          notes?: string | null
          reminder_sent_at?: string | null
          start_time: string
          status?: string | null
          tenant_id: string
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          appointment_type?: string | null
          client_id?: string
          coach_id?: string | null
          created_at?: string | null
          description?: string | null
          end_time?: string
          group_mode?: string | null
          id?: string
          location?: string | null
          meeting_url?: string | null
          notes?: string | null
          reminder_sent_at?: string | null
          start_time?: string
          status?: string | null
          tenant_id?: string
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      badge_definitions: {
        Row: {
          condition_type: string | null
          condition_value: number | null
          description: string | null
          icon: string
          id: string
          is_active: boolean | null
          name: string
          rarity: string | null
          slug: string
          sort_order: number | null
          xp_reward: number | null
        }
        Insert: {
          condition_type?: string | null
          condition_value?: number | null
          description?: string | null
          icon: string
          id?: string
          is_active?: boolean | null
          name: string
          rarity?: string | null
          slug: string
          sort_order?: number | null
          xp_reward?: number | null
        }
        Update: {
          condition_type?: string | null
          condition_value?: number | null
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean | null
          name?: string
          rarity?: string | null
          slug?: string
          sort_order?: number | null
          xp_reward?: number | null
        }
        Relationships: []
      }
      body_measurements: {
        Row: {
          abdomen_cm: number | null
          arm_cm: number | null
          body_fat_pct: number | null
          calf_cm: number | null
          chest_cm: number | null
          client_id: string
          created_at: string | null
          height_cm: number | null
          hip_cm: number | null
          id: string
          measured_at: string
          muscle_mass_kg: number | null
          neck_cm: number | null
          notes: string | null
          shoulder_cm: number | null
          tenant_id: string
          thigh_cm: number | null
          waist_cm: number | null
          weight_kg: number | null
        }
        Insert: {
          abdomen_cm?: number | null
          arm_cm?: number | null
          body_fat_pct?: number | null
          calf_cm?: number | null
          chest_cm?: number | null
          client_id: string
          created_at?: string | null
          height_cm?: number | null
          hip_cm?: number | null
          id?: string
          measured_at?: string
          muscle_mass_kg?: number | null
          neck_cm?: number | null
          notes?: string | null
          shoulder_cm?: number | null
          tenant_id: string
          thigh_cm?: number | null
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Update: {
          abdomen_cm?: number | null
          arm_cm?: number | null
          body_fat_pct?: number | null
          calf_cm?: number | null
          chest_cm?: number | null
          client_id?: string
          created_at?: string | null
          height_cm?: number | null
          hip_cm?: number | null
          id?: string
          measured_at?: string
          muscle_mass_kg?: number | null
          neck_cm?: number | null
          notes?: string | null
          shoulder_cm?: number | null
          tenant_id?: string
          thigh_cm?: number | null
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      branches: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          phone: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_participants: {
        Row: {
          challenge_id: string
          completed_at: string | null
          id: string
          invited_by: string | null
          joined_at: string | null
          progress: number | null
          status: string | null
          user_id: string
        }
        Insert: {
          challenge_id: string
          completed_at?: string | null
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          progress?: number | null
          status?: string | null
          user_id: string
        }
        Update: {
          challenge_id?: string
          completed_at?: string | null
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          progress?: number | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_participants_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_participants_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          badge_id: string | null
          challenge_type: string | null
          created_at: string | null
          creator_id: string
          description: string | null
          expires_at: string | null
          id: string
          max_participants: number | null
          promotion_id: string | null
          starts_at: string | null
          status: string | null
          target_metric: string | null
          target_value: number | null
          tenant_id: string
          title: string
          updated_at: string | null
          xp_reward: number | null
        }
        Insert: {
          badge_id?: string | null
          challenge_type?: string | null
          created_at?: string | null
          creator_id: string
          description?: string | null
          expires_at?: string | null
          id?: string
          max_participants?: number | null
          promotion_id?: string | null
          starts_at?: string | null
          status?: string | null
          target_metric?: string | null
          target_value?: number | null
          tenant_id: string
          title: string
          updated_at?: string | null
          xp_reward?: number | null
        }
        Update: {
          badge_id?: string | null
          challenge_type?: string | null
          created_at?: string | null
          creator_id?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          max_participants?: number | null
          promotion_id?: string | null
          starts_at?: string | null
          status?: string | null
          target_metric?: string | null
          target_value?: number | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
          xp_reward?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "challenges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badge_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_client_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          client_id: string
          coach_id: string
          id: string
          tenant_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          client_id: string
          coach_id: string
          id?: string
          tenant_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          client_id?: string
          coach_id?: string
          id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_client_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_client_assignments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_client_assignments_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_client_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_rules: {
        Row: {
          created_at: string
          delay_minutes: number
          event_type: string
          id: string
          is_active: boolean
          name: string
          recipients: string
          template_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          delay_minutes?: number
          event_type: string
          id?: string
          is_active?: boolean
          name: string
          recipients?: string
          template_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          delay_minutes?: number
          event_type?: string
          id?: string
          is_active?: boolean
          name?: string
          recipients?: string
          template_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_rules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      device_tokens: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          platform: Database["public"]["Enums"]["platform_type"]
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          platform: Database["public"]["Enums"]["platform_type"]
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          platform?: Database["public"]["Enums"]["platform_type"]
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          body_html: string | null
          created_at: string
          error_msg: string | null
          id: string
          last_retry_at: string | null
          retry_count: number
          rule_id: string | null
          sent_at: string | null
          status: string
          subject: string
          template_id: string | null
          tenant_id: string
          to_email: string
        }
        Insert: {
          body_html?: string | null
          created_at?: string
          error_msg?: string | null
          id?: string
          last_retry_at?: string | null
          retry_count?: number
          rule_id?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          template_id?: string | null
          tenant_id: string
          to_email: string
        }
        Update: {
          body_html?: string | null
          created_at?: string
          error_msg?: string | null
          id?: string
          last_retry_at?: string | null
          retry_count?: number
          rule_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          template_id?: string | null
          tenant_id?: string
          to_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "communication_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body_html: string
          created_at: string
          id: string
          name: string
          subject: string
          tenant_id: string
          updated_at: string
          variables: string[]
        }
        Insert: {
          body_html?: string
          created_at?: string
          id?: string
          name: string
          subject: string
          tenant_id: string
          updated_at?: string
          variables?: string[]
        }
        Update: {
          body_html?: string
          created_at?: string
          id?: string
          name?: string
          subject?: string
          tenant_id?: string
          updated_at?: string
          variables?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_progress: {
        Row: {
          client_id: string
          completed: boolean
          completed_at: string | null
          exercise_id: string
          id: string
          routine_id: string
          session_date: string
          tenant_id: string
        }
        Insert: {
          client_id: string
          completed?: boolean
          completed_at?: string | null
          exercise_id: string
          id?: string
          routine_id: string
          session_date?: string
          tenant_id: string
        }
        Update: {
          client_id?: string
          completed?: boolean
          completed_at?: string | null
          exercise_id?: string
          id?: string
          routine_id?: string
          session_date?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_progress_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_progress_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_progress_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          demo_duration_seconds: number | null
          demo_video_bucket: string | null
          demo_video_mime_type: string | null
          demo_video_storage_path: string | null
          id: string
          muscle: Database["public"]["Enums"]["exercise_muscle"]
          name: string
          notes: string | null
          reps: number
          rest_seconds: number
          routine_id: string
          sets: number
          sort_order: number
          tenant_id: string
        }
        Insert: {
          demo_duration_seconds?: number | null
          demo_video_bucket?: string | null
          demo_video_mime_type?: string | null
          demo_video_storage_path?: string | null
          id?: string
          muscle?: Database["public"]["Enums"]["exercise_muscle"]
          name: string
          notes?: string | null
          reps?: number
          rest_seconds?: number
          routine_id: string
          sets?: number
          sort_order?: number
          tenant_id: string
        }
        Update: {
          demo_duration_seconds?: number | null
          demo_video_bucket?: string | null
          demo_video_mime_type?: string | null
          demo_video_storage_path?: string | null
          id?: string
          muscle?: Database["public"]["Enums"]["exercise_muscle"]
          name?: string
          notes?: string | null
          reps?: number
          rest_seconds?: number
          routine_id?: string
          sets?: number
          sort_order?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercises_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercises_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_checkins: {
        Row: {
          branch_id: string | null
          checked_in_at: string | null
          id: string
          method: string | null
          tenant_id: string
          user_id: string
          xp_earned: number | null
        }
        Insert: {
          branch_id?: string | null
          checked_in_at?: string | null
          id?: string
          method?: string | null
          tenant_id: string
          user_id: string
          xp_earned?: number | null
        }
        Update: {
          branch_id?: string | null
          checked_in_at?: string | null
          id?: string
          method?: string | null
          tenant_id?: string
          user_id?: string
          xp_earned?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gym_checkins_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_checkins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          due_date: string | null
          id: string
          invoice_number: string
          issue_date: string
          notes: string | null
          paid_at: string | null
          status: string
          subscription_id: string | null
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string
          issue_date?: string
          notes?: string | null
          paid_at?: string | null
          status?: string
          subscription_id?: string | null
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string
          issue_date?: string
          notes?: string | null
          paid_at?: string | null
          status?: string
          subscription_id?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "user_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      level_definitions: {
        Row: {
          color: string
          level: number
          name: string
          unlocks: Json | null
          xp_required: number
        }
        Insert: {
          color: string
          level: number
          name: string
          unlocks?: Json | null
          xp_required: number
        }
        Update: {
          color?: string
          level?: number
          name?: string
          unlocks?: Json | null
          xp_required?: number
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          related_entity_id: string | null
          related_entity_type: string | null
          tenant_id: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          tenant_id: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          tenant_id?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          client_id: string
          id: string
          note: string | null
          nutrition_plan_id: string
          tenant_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          client_id: string
          id?: string
          note?: string | null
          nutrition_plan_id: string
          tenant_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          client_id?: string
          id?: string
          note?: string | null
          nutrition_plan_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nutrition_assignments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nutrition_assignments_nutrition_plan_id_fkey"
            columns: ["nutrition_plan_id"]
            isOneToOne: false
            referencedRelation: "nutrition_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nutrition_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_plans: {
        Row: {
          calories_target: number | null
          carbs_g: number | null
          created_at: string
          created_by: string | null
          description: string | null
          fat_g: number | null
          goal: string | null
          id: string
          is_template: boolean
          name: string
          protein_g: number | null
          sort_order: number
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          calories_target?: number | null
          carbs_g?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          fat_g?: number | null
          goal?: string | null
          id?: string
          is_template?: boolean
          name: string
          protein_g?: number | null
          sort_order?: number
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          calories_target?: number | null
          carbs_g?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          fat_g?: number | null
          goal?: string | null
          id?: string
          is_template?: boolean
          name?: string
          protein_g?: number | null
          sort_order?: number
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nutrition_plans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_plans: {
        Row: {
          offer_id: string
          plan_id: string
        }
        Insert: {
          offer_id: string
          plan_id: string
        }
        Update: {
          offer_id?: string
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_plans_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_plans_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          code: string
          description: string | null
          id: string
          module: string
        }
        Insert: {
          code: string
          description?: string | null
          id?: string
          module: string
        }
        Update: {
          code?: string
          description?: string | null
          id?: string
          module?: string
        }
        Relationships: []
      }
      plan_nutritions: {
        Row: {
          created_at: string
          nutrition_plan_id: string
          plan_id: string
        }
        Insert: {
          created_at?: string
          nutrition_plan_id: string
          plan_id: string
        }
        Update: {
          created_at?: string
          nutrition_plan_id?: string
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_nutritions_nutrition_plan_id_fkey"
            columns: ["nutrition_plan_id"]
            isOneToOne: false
            referencedRelation: "nutrition_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_nutritions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_routines: {
        Row: {
          created_at: string
          plan_id: string
          routine_id: string
        }
        Insert: {
          created_at?: string
          plan_id: string
          routine_id: string
        }
        Update: {
          created_at?: string
          plan_id?: string
          routine_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_routines_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_routines_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_videos: {
        Row: {
          created_at: string
          plan_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          plan_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          plan_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_videos_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_videos_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          billing_cycle: Database["public"]["Enums"]["billing_cycle_type"]
          branch_id: string | null
          created_at: string
          currency: string
          description: string | null
          expiry_date: string | null
          features: Json
          id: string
          is_active: boolean
          name: string
          plan_tier: string | null
          price: number
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          billing_cycle?: Database["public"]["Enums"]["billing_cycle_type"]
          branch_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          expiry_date?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          name: string
          plan_tier?: string | null
          price?: number
          sort_order?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          billing_cycle?: Database["public"]["Enums"]["billing_cycle_type"]
          branch_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          expiry_date?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          name?: string
          plan_tier?: string | null
          price?: number
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plans_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          avatar_url: string | null
          branch_id: string | null
          client_level: string | null
          created_at: string
          date_of_birth: string | null
          fitness_level: string | null
          full_name: string
          gender: string | null
          id: string
          is_active: boolean
          locale: string
          phone: string | null
          rejection_reason: string | null
          requested_role: string | null
          stripe_customer_id: string | null
          tenant_id: string
          theme: string
          updated_at: string
        }
        Insert: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          branch_id?: string | null
          client_level?: string | null
          created_at?: string
          date_of_birth?: string | null
          fitness_level?: string | null
          full_name: string
          gender?: string | null
          id: string
          is_active?: boolean
          locale?: string
          phone?: string | null
          rejection_reason?: string | null
          requested_role?: string | null
          stripe_customer_id?: string | null
          tenant_id: string
          theme?: string
          updated_at?: string
        }
        Update: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          branch_id?: string | null
          client_level?: string | null
          created_at?: string
          date_of_birth?: string | null
          fitness_level?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          is_active?: boolean
          locale?: string
          phone?: string | null
          rejection_reason?: string | null
          requested_role?: string | null
          stripe_customer_id?: string | null
          tenant_id?: string
          theme?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion_nutritions: {
        Row: {
          created_at: string
          nutrition_plan_id: string
          promotion_id: string
        }
        Insert: {
          created_at?: string
          nutrition_plan_id: string
          promotion_id: string
        }
        Update: {
          created_at?: string
          nutrition_plan_id?: string
          promotion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotion_nutritions_nutrition_plan_id_fkey"
            columns: ["nutrition_plan_id"]
            isOneToOne: false
            referencedRelation: "nutrition_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_nutritions_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion_routines: {
        Row: {
          created_at: string
          promotion_id: string
          routine_id: string
        }
        Insert: {
          created_at?: string
          promotion_id: string
          routine_id: string
        }
        Update: {
          created_at?: string
          promotion_id?: string
          routine_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotion_routines_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_routines_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion_targets: {
        Row: {
          created_at: string
          id: string
          plan_id: string | null
          promotion_id: string
          target_type: Database["public"]["Enums"]["promotion_target_type"]
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          plan_id?: string | null
          promotion_id: string
          target_type?: Database["public"]["Enums"]["promotion_target_type"]
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          plan_id?: string | null
          promotion_id?: string
          target_type?: Database["public"]["Enums"]["promotion_target_type"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promotion_targets_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_targets_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_targets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion_videos: {
        Row: {
          created_at: string
          promotion_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          promotion_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          promotion_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotion_videos_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_videos_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          applies_to_plan_id: string | null
          branch_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          discount_amount: number | null
          discount_percentage: number | null
          end_date: string | null
          id: string
          is_active: boolean
          start_date: string
          target_level: string
          tenant_id: string
          title: string
          type: Database["public"]["Enums"]["promotion_type"]
          updated_at: string
        }
        Insert: {
          applies_to_plan_id?: string | null
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          start_date?: string
          target_level?: string
          tenant_id: string
          title: string
          type?: Database["public"]["Enums"]["promotion_type"]
          updated_at?: string
        }
        Update: {
          applies_to_plan_id?: string | null
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          start_date?: string
          target_level?: string
          tenant_id?: string
          title?: string
          type?: Database["public"]["Enums"]["promotion_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotions_applies_to_plan_id_fkey"
            columns: ["applies_to_plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          permission_id: string
          role_id: string
        }
        Insert: {
          permission_id: string
          role_id: string
        }
        Update: {
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          description: string | null
          id: string
          is_system: boolean
          name: string
        }
        Insert: {
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
        }
        Update: {
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
        }
        Relationships: []
      }
      routine_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          client_id: string
          id: string
          routine_id: string
          tenant_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          client_id: string
          id?: string
          routine_id: string
          tenant_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          client_id?: string
          id?: string
          routine_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routine_assignments_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      routines: {
        Row: {
          allowed_levels: string[]
          allowed_plans: string[]
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          is_template: boolean
          level: Database["public"]["Enums"]["routine_level"]
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          allowed_levels?: string[]
          allowed_plans?: string[]
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_template?: boolean
          level?: Database["public"]["Enums"]["routine_level"]
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          allowed_levels?: string[]
          allowed_plans?: string[]
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_template?: boolean
          level?: Database["public"]["Enums"]["routine_level"]
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "routines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      smtp_configs: {
        Row: {
          created_at: string
          from_email: string
          from_name: string
          host: string
          id: string
          is_active: boolean
          password: string
          port: number
          tenant_id: string
          updated_at: string
          use_tls: boolean
          username: string
        }
        Insert: {
          created_at?: string
          from_email?: string
          from_name?: string
          host?: string
          id?: string
          is_active?: boolean
          password?: string
          port?: number
          tenant_id: string
          updated_at?: string
          use_tls?: boolean
          username?: string
        }
        Update: {
          created_at?: string
          from_email?: string
          from_name?: string
          host?: string
          id?: string
          is_active?: boolean
          password?: string
          port?: number
          tenant_id?: string
          updated_at?: string
          use_tls?: boolean
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "smtp_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string
          currency: string
          id: string
          is_active: boolean
          max_clients: number | null
          max_staff: number | null
          modules: string[]
          name: string
          price_monthly: number
          price_yearly: number
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          max_clients?: number | null
          max_staff?: number | null
          modules?: string[]
          name: string
          price_monthly: number
          price_yearly: number
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          max_clients?: number | null
          max_staff?: number | null
          modules?: string[]
          name?: string
          price_monthly?: number
          price_yearly?: number
        }
        Relationships: []
      }
      tenant_modules: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          module: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          module: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          module?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_modules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_subscriptions: {
        Row: {
          billing_cycle: Database["public"]["Enums"]["billing_cycle"]
          cancelled_at: string | null
          created_at: string
          current_period_end: string
          current_period_start: string
          id: string
          plan_id: string
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_sub_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"]
          cancelled_at?: string | null
          created_at?: string
          current_period_end: string
          current_period_start: string
          id?: string
          plan_id: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_sub_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"]
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          plan_id?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_sub_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          currency: string
          id: string
          is_active: boolean
          locale: string
          logo_url: string | null
          name: string
          slug: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          locale?: string
          logo_url?: string | null
          name: string
          slug: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          locale?: string
          logo_url?: string | null
          name?: string
          slug?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string | null
          id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string | null
          id?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string | null
          id?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badge_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_game_stats: {
        Row: {
          current_streak: number | null
          last_checkin_date: string | null
          level: number | null
          longest_streak: number | null
          streak_shield_count: number | null
          tenant_id: string
          total_challenges_completed: number | null
          total_challenges_won: number | null
          total_checkins: number | null
          updated_at: string | null
          user_id: string
          xp_this_month: number | null
          xp_this_week: number | null
          xp_total: number | null
        }
        Insert: {
          current_streak?: number | null
          last_checkin_date?: string | null
          level?: number | null
          longest_streak?: number | null
          streak_shield_count?: number | null
          tenant_id: string
          total_challenges_completed?: number | null
          total_challenges_won?: number | null
          total_checkins?: number | null
          updated_at?: string | null
          user_id: string
          xp_this_month?: number | null
          xp_this_week?: number | null
          xp_total?: number | null
        }
        Update: {
          current_streak?: number | null
          last_checkin_date?: string | null
          level?: number | null
          longest_streak?: number | null
          streak_shield_count?: number | null
          tenant_id?: string
          total_challenges_completed?: number | null
          total_challenges_won?: number | null
          total_checkins?: number | null
          updated_at?: string | null
          user_id?: string
          xp_this_month?: number | null
          xp_this_week?: number | null
          xp_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_game_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_by: string | null
          created_at: string
          id: string
          role_id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          role_id: string
          tenant_id: string
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          role_id?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_subscriptions: {
        Row: {
          auto_renew: boolean
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string
          end_date: string | null
          expiry_warning_sent_at: string | null
          final_price: number | null
          id: string
          next_billing_date: string | null
          payment_reference: string | null
          plan_id: string
          promotion_id: string | null
          start_date: string
          status: Database["public"]["Enums"]["subscription_status_type"]
          stripe_subscription_id: string | null
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_renew?: boolean
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          end_date?: string | null
          expiry_warning_sent_at?: string | null
          final_price?: number | null
          id?: string
          next_billing_date?: string | null
          payment_reference?: string | null
          plan_id: string
          promotion_id?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["subscription_status_type"]
          stripe_subscription_id?: string | null
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_renew?: boolean
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          end_date?: string | null
          expiry_warning_sent_at?: string | null
          final_price?: number | null
          id?: string
          next_billing_date?: string | null
          payment_reference?: string | null
          plan_id?: string
          promotion_id?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["subscription_status_type"]
          stripe_subscription_id?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_subscriptions_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      video_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          client_id: string
          id: string
          note: string | null
          tenant_id: string
          video_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          client_id: string
          id?: string
          note?: string | null
          tenant_id: string
          video_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          client_id?: string
          id?: string
          note?: string | null
          tenant_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_assignments_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_categories: {
        Row: {
          icon: string | null
          id: string
          is_active: boolean
          label: string
          slug: string
          sort_order: number
          tenant_id: string | null
        }
        Insert: {
          icon?: string | null
          id?: string
          is_active?: boolean
          label: string
          slug: string
          sort_order?: number
          tenant_id?: string | null
        }
        Update: {
          icon?: string | null
          id?: string
          is_active?: boolean
          label?: string
          slug?: string
          sort_order?: number
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      video_progress: {
        Row: {
          client_id: string
          completed: boolean
          id: string
          last_watched_at: string
          tenant_id: string
          video_id: string
          watched_seconds: number
        }
        Insert: {
          client_id: string
          completed?: boolean
          id?: string
          last_watched_at?: string
          tenant_id: string
          video_id: string
          watched_seconds?: number
        }
        Update: {
          client_id?: string
          completed?: boolean
          id?: string
          last_watched_at?: string
          tenant_id?: string
          video_id?: string
          watched_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "video_progress_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_progress_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_view_events: {
        Row: {
          client_id: string
          id: string
          session_seconds: number | null
          tenant_id: string
          video_id: string
          viewed_at: string
        }
        Insert: {
          client_id: string
          id?: string
          session_seconds?: number | null
          tenant_id: string
          video_id: string
          viewed_at?: string
        }
        Update: {
          client_id?: string
          id?: string
          session_seconds?: number | null
          tenant_id?: string
          video_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_view_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_view_events_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          allowed_levels: Database["public"]["Enums"]["video_level"][]
          allowed_plans: Database["public"]["Enums"]["video_plan"][]
          category: string
          category_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          duration_seconds: number | null
          id: string
          is_active: boolean
          is_featured: boolean
          is_free: boolean
          level: Database["public"]["Enums"]["video_level"]
          sort_order: number
          status: Database["public"]["Enums"]["video_status"] | null
          tenant_id: string
          thumbnail_bucket: string
          thumbnail_color: string
          thumbnail_storage_path: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          updated_by: string | null
          video_bucket: string
          video_file_size_bytes: number | null
          video_mime_type: string | null
          video_storage_path: string | null
          video_url: string | null
          views_count: number
        }
        Insert: {
          allowed_levels?: Database["public"]["Enums"]["video_level"][]
          allowed_plans?: Database["public"]["Enums"]["video_plan"][]
          category?: string
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          is_free?: boolean
          level?: Database["public"]["Enums"]["video_level"]
          sort_order?: number
          status?: Database["public"]["Enums"]["video_status"] | null
          tenant_id: string
          thumbnail_bucket?: string
          thumbnail_color?: string
          thumbnail_storage_path?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
          video_bucket?: string
          video_file_size_bytes?: number | null
          video_mime_type?: string | null
          video_storage_path?: string | null
          video_url?: string | null
          views_count?: number
        }
        Update: {
          allowed_levels?: Database["public"]["Enums"]["video_level"][]
          allowed_plans?: Database["public"]["Enums"]["video_plan"][]
          category?: string
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          is_free?: boolean
          level?: Database["public"]["Enums"]["video_level"]
          sort_order?: number
          status?: Database["public"]["Enums"]["video_status"] | null
          tenant_id?: string
          thumbnail_bucket?: string
          thumbnail_color?: string
          thumbnail_storage_path?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
          video_bucket?: string
          video_file_size_bytes?: number | null
          video_mime_type?: string | null
          video_storage_path?: string | null
          video_url?: string | null
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "videos_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "video_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      xp_transactions: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          note: string | null
          source: string
          source_ref: string | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          note?: string | null
          source: string
          source_ref?: string | null
          tenant_id: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          note?: string | null
          source?: string
          source_ref?: string | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "xp_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _gam_award_xp: {
        Args: {
          p_amount: number
          p_note?: string
          p_source: string
          p_source_ref?: string
          p_tenant_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      _gam_check_badges: {
        Args: { p_tenant_id: string; p_user_id: string }
        Returns: {
          condition_type: string | null
          condition_value: number | null
          description: string | null
          icon: string
          id: string
          is_active: boolean | null
          name: string
          rarity: string | null
          slug: string
          sort_order: number | null
          xp_reward: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "badge_definitions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      _gam_update_level: {
        Args: { p_tenant_id: string; p_user_id: string }
        Returns: number
      }
      analytics_branch_performance:
        | {
            Args: { p_tenant_id: string }
            Returns: {
              appointments: number
              branch_name: string
              clients: number
              coaches: number
              revenue: number
            }[]
          }
        | {
            Args: { p_from: string; p_tenant_id: string; p_to: string }
            Returns: {
              appointments: number
              branch_name: string
              clients: number
              coaches: number
              revenue: number
            }[]
          }
      analytics_detailed_appointments: {
        Args: { p_from?: string; p_tenant_id: string; p_to?: string }
        Returns: {
          appointment_date: string
          appointment_type: string
          client_email: string
          client_name: string
          coach_name: string
          duration_minutes: number
          end_time: string
          location: string
          notes: string
          status: string
          title: string
        }[]
      }
      analytics_detailed_clients: {
        Args: { p_from?: string; p_tenant_id: string; p_to?: string }
        Returns: {
          active_plans: number
          approval_status: string
          branch_name: string
          client_level: string
          completed_appointments: number
          email: string
          full_name: string
          is_active: boolean
          join_date: string
          last_appointment_date: string
          last_subscription_date: string
          measurements_count: number
          phone: string
          total_appointments: number
          total_revenue: number
          total_subscriptions: number
        }[]
      }
      analytics_detailed_subscriptions: {
        Args: { p_from?: string; p_tenant_id: string; p_to?: string }
        Returns: {
          amount: number
          billing_cycle: string
          client_email: string
          client_name: string
          currency: string
          days_remaining: number
          end_date: string
          payment_reference: string
          plan_name: string
          promotion_applied: string
          start_date: string
          status: string
          stripe_subscription_id: string
        }[]
      }
      analytics_detailed_transactions: {
        Args: { p_from?: string; p_tenant_id: string; p_to?: string }
        Returns: {
          amount: number
          billing_cycle: string
          client_email: string
          client_name: string
          currency: string
          discount_applied: string
          invoice_date: string
          invoice_number: string
          invoice_status: string
          payment_reference: string
          plan_name: string
          promotion_title: string
          stripe_subscription_id: string
        }[]
      }
      analytics_executive_kpis: {
        Args: { p_from?: string; p_tenant_id: string; p_to?: string }
        Returns: {
          active_clients: number
          appointment_fill_rate: number
          arpu: number
          arr: number
          avg_subscription_value: number
          cancellation_rate: number
          cancelled_appointments: number
          cancelled_subscriptions: number
          churn_rate_pct: number
          completed_appointments: number
          mrr: number
          new_subscriptions: number
          period_revenue: number
          prev_period_revenue: number
          total_appointments: number
        }[]
      }
      analytics_monthly_revenue:
        | {
            Args: { p_tenant_id: string }
            Returns: {
              count: number
              revenue: number
              year_month: string
            }[]
          }
        | {
            Args: { p_from: string; p_tenant_id: string; p_to: string }
            Returns: {
              count: number
              revenue: number
              year_month: string
            }[]
          }
      analytics_revenue_summary:
        | {
            Args: { p_tenant_id: string }
            Returns: {
              active_subscriptions: number
              last_month_revenue: number
              new_clients_this_month: number
              new_subs_this_month: number
              pending_approvals: number
              this_month_revenue: number
              total_clients: number
              total_revenue: number
              ytd_revenue: number
            }[]
          }
        | {
            Args: { p_from: string; p_tenant_id: string; p_to: string }
            Returns: {
              active_subscriptions: number
              last_month_revenue: number
              new_clients_this_month: number
              new_subs_this_month: number
              pending_approvals: number
              this_month_revenue: number
              total_clients: number
              total_revenue: number
              ytd_revenue: number
            }[]
          }
      analytics_top_plans:
        | {
            Args: { p_tenant_id: string }
            Returns: {
              currency: string
              plan_name: string
              purchases: number
              revenue: number
            }[]
          }
        | {
            Args: { p_from: string; p_tenant_id: string; p_to: string }
            Returns: {
              currency: string
              plan_name: string
              purchases: number
              revenue: number
            }[]
          }
      analytics_top_promotions:
        | {
            Args: { p_tenant_id: string }
            Returns: {
              avg_discount: number
              promo_title: string
              uses: number
            }[]
          }
        | {
            Args: { p_from: string; p_tenant_id: string; p_to: string }
            Returns: {
              avg_discount: number
              promo_title: string
              uses: number
            }[]
          }
      analytics_top_users:
        | {
            Args: { p_tenant_id: string }
            Returns: {
              appointments: number
              full_name: string
              measurements: number
              revenue: number
              subscriptions: number
            }[]
          }
        | {
            Args: { p_from: string; p_tenant_id: string; p_to: string }
            Returns: {
              appointments: number
              full_name: string
              measurements: number
              revenue: number
              subscriptions: number
            }[]
          }
      analytics_top_videos:
        | {
            Args: { p_tenant_id: string }
            Returns: {
              assignments: number
              video_title: string
            }[]
          }
        | {
            Args: { p_from: string; p_tenant_id: string; p_to: string }
            Returns: {
              assignments: number
              video_title: string
            }[]
          }
      analytics_weekly_activity:
        | {
            Args: { p_tenant_id: string }
            Returns: {
              appointments: number
              new_subscriptions: number
              revenue: number
              year_week: string
            }[]
          }
        | {
            Args: { p_from: string; p_tenant_id: string; p_to: string }
            Returns: {
              appointments: number
              new_subscriptions: number
              revenue: number
              year_week: string
            }[]
          }
      approve_user: {
        Args: { p_admin_id: string; p_role_name: string; p_user_id: string }
        Returns: undefined
      }
      archive_video: {
        Args: { p_user_id: string; p_video_id: string }
        Returns: undefined
      }
      assign_plan: {
        Args: {
          p_plan_id: string
          p_price: number
          p_tenant_id: string
          p_user_id: string
        }
        Returns: string
      }
      assign_user_to_branch: {
        Args: { p_branch_id: string; p_user_id: string }
        Returns: undefined
      }
      auto_cancel_unconfirmed_appointments: { Args: never; Returns: undefined }
      award_checkin: {
        Args: { p_branch_id?: string; p_tenant_id: string; p_user_id: string }
        Returns: Json
      }
      can_manage_users: { Args: never; Returns: boolean }
      cancel_client_subscription: {
        Args: { p_stripe_subscription_id: string }
        Returns: string
      }
      cancel_subscription: {
        Args: { p_reason?: string; p_subscription_id: string }
        Returns: undefined
      }
      complete_challenge_entry: {
        Args: { p_challenge_id: string; p_user_id: string }
        Returns: Json
      }
      create_appointment: {
        Args: {
          p_appointment_type: string
          p_client_id: string
          p_coach_id: string
          p_description: string
          p_end_time: string
          p_group_mode?: string
          p_location: string
          p_meeting_url: string
          p_participant_ids?: string[]
          p_start_time: string
          p_status: string
          p_title: string
        }
        Returns: string
      }
      create_client_subscription: {
        Args: {
          p_billing_cycle: string
          p_final_price: number
          p_payment_ref: string
          p_plan_id: string
          p_promotion_id: string
          p_tenant_id: string
          p_user_id: string
        }
        Returns: string
      }
      create_notifications_for_users: {
        Args: { p_rows: Json; p_tenant_id: string }
        Returns: number
      }
      elevate_user_to_coach: {
        Args: { p_admin_id: string; p_user_id: string }
        Returns: undefined
      }
      expire_due_subscriptions: { Args: never; Returns: number }
      expire_subscriptions_for_expired_plans: { Args: never; Returns: number }
      get_approval_status_counts: {
        Args: never
        Returns: {
          cnt: number
          status: string
        }[]
      }
      get_approved_client_count: { Args: never; Returns: number }
      get_billing_summary: {
        Args: { p_tenant_id: string }
        Returns: {
          invoices_overdue: number
          invoices_pending: number
          mrr: number
          subscriptions_active: number
          subscriptions_expiring_7d: number
        }[]
      }
      get_branches_with_stats: {
        Args: never
        Returns: {
          address: string
          client_count: number
          coach_count: number
          created_at: string
          email: string
          id: string
          is_active: boolean
          name: string
          phone: string
          tenant_id: string
          updated_at: string
        }[]
      }
      get_clients_with_plan: {
        Args: never
        Returns: {
          approval_status: string
          client_level: string
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          plan_name: string
          plan_tier: string
          promotion_id: string
          promotion_title: string
        }[]
      }
      get_leaderboard: {
        Args: { p_limit?: number; p_period?: string; p_tenant_id: string }
        Returns: {
          current_streak: number
          full_name: string
          is_me: boolean
          level: number
          rank: number
          total_challenges_won: number
          total_checkins: number
          user_id: string
          xp_this_month: number
          xp_this_week: number
          xp_total: number
        }[]
      }
      get_profiles_by_role: {
        Args: { role_name: string }
        Returns: {
          approval_status: string
          avatar_url: string
          client_level: string
          created_at: string
          date_of_birth: string
          full_name: string
          id: string
          is_active: boolean
          phone: string
          tenant_id: string
        }[]
      }
      get_tenant_admin_ids: { Args: never; Returns: string[] }
      get_tenant_id: { Args: never; Returns: string }
      get_user_challenges: {
        Args: { p_tenant_id: string; p_user_id: string }
        Returns: {
          badge_id: string
          challenge_type: string
          created_at: string
          creator_id: string
          creator_name: string
          description: string
          expires_at: string
          id: string
          max_participants: number
          my_status: string
          participant_count: number
          promotion_id: string
          starts_at: string
          status: string
          target_metric: string
          target_value: number
          tenant_id: string
          title: string
          xp_reward: number
        }[]
      }
      get_users_by_approval_status: {
        Args: { p_status: string }
        Returns: {
          approval_status: string
          avatar_url: string
          created_at: string
          full_name: string
          id: string
          rejection_reason: string
          requested_role: string
        }[]
      }
      get_webhook_secret: { Args: never; Returns: string }
      has_permission: { Args: { permission_code: string }; Returns: boolean }
      increment_video_views: {
        Args: { p_video_id: string }
        Returns: undefined
      }
      is_staff_in_tenant: { Args: { p_tenant_id: string }; Returns: boolean }
      list_appointments: {
        Args: { p_end_time?: string; p_start_time?: string }
        Returns: {
          appointment_type: string
          client_avatar: string
          client_id: string
          client_name: string
          coach_id: string
          coach_name: string
          description: string
          end_time: string
          group_mode: string
          id: string
          location: string
          meeting_url: string
          participants: Json
          start_time: string
          status: string
          title: string
        }[]
      }
      mark_invoice_paid: {
        Args: { p_invoice_id: string; p_notes?: string }
        Returns: undefined
      }
      my_tenant_id: { Args: never; Returns: string }
      next_invoice_number: { Args: never; Returns: string }
      publish_video: {
        Args: { p_user_id: string; p_video_id: string }
        Returns: undefined
      }
      record_video_view: {
        Args: {
          p_client_id: string
          p_session_secs?: number
          p_tenant_id: string
          p_video_id: string
        }
        Returns: undefined
      }
      reject_user: {
        Args: { p_admin_id: string; p_reason: string; p_user_id: string }
        Returns: undefined
      }
      renew_client_subscription: {
        Args: {
          p_final_price?: number
          p_payment_ref?: string
          p_stripe_subscription_id: string
        }
        Returns: string
      }
      send_appointment_reminders: { Args: never; Returns: number }
      send_expiring_plan_warnings: { Args: never; Returns: number }
      set_client_level: {
        Args: { p_client_id: string; p_client_level: string }
        Returns: {
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          avatar_url: string | null
          branch_id: string | null
          client_level: string | null
          created_at: string
          date_of_birth: string | null
          fitness_level: string | null
          full_name: string
          gender: string | null
          id: string
          is_active: boolean
          locale: string
          phone: string | null
          rejection_reason: string | null
          requested_role: string | null
          stripe_customer_id: string | null
          tenant_id: string
          theme: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_own_branch: { Args: { p_branch_id: string }; Returns: undefined }
      subscription_end_date: {
        Args: { p_cycle: string; p_start: string }
        Returns: string
      }
      update_profile_by_staff:
        | {
            Args: {
              p_clear_client_level?: boolean
              p_client_level?: string
              p_date_of_birth?: string
              p_full_name?: string
              p_is_active?: boolean
              p_phone?: string
              p_target_user_id: string
            }
            Returns: {
              approval_status: string
              approved_at: string | null
              approved_by: string | null
              avatar_url: string | null
              branch_id: string | null
              client_level: string | null
              created_at: string
              date_of_birth: string | null
              fitness_level: string | null
              full_name: string
              gender: string | null
              id: string
              is_active: boolean
              locale: string
              phone: string | null
              rejection_reason: string | null
              requested_role: string | null
              stripe_customer_id: string | null
              tenant_id: string
              theme: string
              updated_at: string
            }[]
            SetofOptions: {
              from: "*"
              to: "profiles"
              isOneToOne: false
              isSetofReturn: true
            }
          }
        | {
            Args: {
              p_client_level?: string
              p_date_of_birth?: string
              p_full_name?: string
              p_is_active?: boolean
              p_phone?: string
              p_target_user_id: string
            }
            Returns: {
              approval_status: string
              approved_at: string | null
              approved_by: string | null
              avatar_url: string | null
              branch_id: string | null
              client_level: string | null
              created_at: string
              date_of_birth: string | null
              fitness_level: string | null
              full_name: string
              gender: string | null
              id: string
              is_active: boolean
              locale: string
              phone: string | null
              rejection_reason: string | null
              requested_role: string | null
              stripe_customer_id: string | null
              tenant_id: string
              theme: string
              updated_at: string
            }[]
            SetofOptions: {
              from: "*"
              to: "profiles"
              isOneToOne: false
              isSetofReturn: true
            }
          }
    }
    Enums: {
      appointment_status:
        | "scheduled"
        | "confirmed"
        | "completed"
        | "cancelled"
        | "no_show"
        | "pending_confirmation"
        | "postpone_requested"
      appointment_type: "in_person" | "virtual"
      audit_action: "create" | "update" | "delete" | "login" | "logout"
      billing_cycle: "monthly" | "yearly"
      billing_cycle_type: "monthly" | "yearly" | "one_time"
      client_status: "active" | "inactive" | "archived"
      conversation_type: "direct" | "group"
      exercise_muscle:
        | "Pecho"
        | "Espalda"
        | "Hombros"
        | "Bíceps"
        | "Tríceps"
        | "Piernas"
        | "Glúteos"
        | "Core"
        | "Cardio"
        | "General"
      id_type: "cedula" | "dimex" | "nite" | "passport"
      invoice_status:
        | "draft"
        | "submitted"
        | "accepted"
        | "rejected"
        | "cancelled"
      invoice_type: "FE" | "TE" | "NC" | "ND"
      message_status: "sent" | "delivered" | "read" | "failed"
      notification_channel: "push" | "email" | "in_app"
      notification_status: "pending" | "delivered" | "failed"
      participant_role: "client" | "coach" | "observer"
      payment_status: "pending" | "succeeded" | "failed" | "refunded"
      platform_type: "ios" | "android"
      progress_entry_type:
        | "weight"
        | "body_measurement"
        | "workout_completion"
        | "photo"
      promotion_target_type: "all_users" | "specific_users" | "plan_users"
      promotion_type: "discount" | "announcement" | "bundle"
      routine_level: "beginner" | "intermediate" | "advanced"
      routine_status: "active" | "completed" | "paused"
      subscription_status:
        | "trialing"
        | "active"
        | "past_due"
        | "cancelled"
        | "expired"
      subscription_status_type: "active" | "cancelled" | "expired" | "pending"
      video_level: "beginner" | "intermediate" | "advanced"
      video_plan: "basic" | "medium" | "premium"
      video_provider: "webrtc" | "zoom"
      video_status:
        | "draft"
        | "uploading"
        | "processing"
        | "published"
        | "archived"
        | "failed"
      virtual_class_status: "scheduled" | "live" | "completed" | "cancelled"
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
    Enums: {
      appointment_status: [
        "scheduled",
        "confirmed",
        "completed",
        "cancelled",
        "no_show",
        "pending_confirmation",
        "postpone_requested",
      ],
      appointment_type: ["in_person", "virtual"],
      audit_action: ["create", "update", "delete", "login", "logout"],
      billing_cycle: ["monthly", "yearly"],
      billing_cycle_type: ["monthly", "yearly", "one_time"],
      client_status: ["active", "inactive", "archived"],
      conversation_type: ["direct", "group"],
      exercise_muscle: [
        "Pecho",
        "Espalda",
        "Hombros",
        "Bíceps",
        "Tríceps",
        "Piernas",
        "Glúteos",
        "Core",
        "Cardio",
        "General",
      ],
      id_type: ["cedula", "dimex", "nite", "passport"],
      invoice_status: [
        "draft",
        "submitted",
        "accepted",
        "rejected",
        "cancelled",
      ],
      invoice_type: ["FE", "TE", "NC", "ND"],
      message_status: ["sent", "delivered", "read", "failed"],
      notification_channel: ["push", "email", "in_app"],
      notification_status: ["pending", "delivered", "failed"],
      participant_role: ["client", "coach", "observer"],
      payment_status: ["pending", "succeeded", "failed", "refunded"],
      platform_type: ["ios", "android"],
      progress_entry_type: [
        "weight",
        "body_measurement",
        "workout_completion",
        "photo",
      ],
      promotion_target_type: ["all_users", "specific_users", "plan_users"],
      promotion_type: ["discount", "announcement", "bundle"],
      routine_level: ["beginner", "intermediate", "advanced"],
      routine_status: ["active", "completed", "paused"],
      subscription_status: [
        "trialing",
        "active",
        "past_due",
        "cancelled",
        "expired",
      ],
      subscription_status_type: ["active", "cancelled", "expired", "pending"],
      video_level: ["beginner", "intermediate", "advanced"],
      video_plan: ["basic", "medium", "premium"],
      video_provider: ["webrtc", "zoom"],
      video_status: [
        "draft",
        "uploading",
        "processing",
        "published",
        "archived",
        "failed",
      ],
      virtual_class_status: ["scheduled", "live", "completed", "cancelled"],
    },
  },
} as const
