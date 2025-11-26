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
      agents: {
        Row: {
          id: string
          agent_code: string
          name: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          agent_code: string
          name: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          agent_code?: string
          name?: string
          description?: string | null
          created_at?: string
        }
        Relationships: []
      }
      answers: {
        Row: {
          id: string
          org_id: string
          session_id: string
          topic_code: string
          user_id: string
          agent_code: string
          answer_text: string | null
          answer_number: number | null
          answer_json: Json | null
          transcript_json: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          session_id: string
          topic_code: string
          user_id: string
          agent_code: string
          answer_text?: string | null
          answer_number?: number | null
          answer_json?: Json | null
          transcript_json?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          session_id?: string
          topic_code?: string
          user_id?: string
          agent_code?: string
          answer_text?: string | null
          answer_number?: number | null
          answer_json?: Json | null
          transcript_json?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "answers_org_id_fkey"
            columns: ["org_id"]
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_session_id_fkey"
            columns: ["session_id"]
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_agent_code_fkey"
            columns: ["agent_code"]
            referencedRelation: "agents"
            referencedColumns: ["agent_code"]
          }
        ]
      }
      departments: {
        Row: {
          id: string
          org_id: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          name?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_org_id_fkey"
            columns: ["org_id"]
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      organization_members: {
        Row: {
          id: string
          org_id: string
          user_id: string
          role: 'owner' | 'admin' | 'member'
          level: 'exec' | 'manager' | 'ic' | null
          department_id: string | null
          supervisor_user_id: string | null
          status: 'invited' | 'active' | 'inactive'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          user_id: string
          role?: 'owner' | 'admin' | 'member'
          level?: 'exec' | 'manager' | 'ic' | null
          department_id?: string | null
          supervisor_user_id?: string | null
          status?: 'invited' | 'active' | 'inactive'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          user_id?: string
          role?: 'owner' | 'admin' | 'member'
          level?: 'exec' | 'manager' | 'ic' | null
          department_id?: string | null
          supervisor_user_id?: string | null
          status?: 'invited' | 'active' | 'inactive'
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_org_id_fkey"
            columns: ["org_id"]
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_department_id_fkey"
            columns: ["department_id"]
            referencedRelation: "departments"
            referencedColumns: ["id"]
          }
        ]
      }
      organizations: {
        Row: {
          id: string
          name: string
          timezone: string
          size_band: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          timezone?: string
          size_band?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          timezone?: string
          size_band?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      session_topics: {
        Row: {
          id: string
          session_id: string
          topic_code: string
          sequence: number
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          topic_code: string
          sequence?: number
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          topic_code?: string
          sequence?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_topics_session_id_fkey"
            columns: ["session_id"]
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_topics_topic_code_fkey"
            columns: ["topic_code"]
            referencedRelation: "topic_archetypes"
            referencedColumns: ["topic_code"]
          }
        ]
      }
      sessions: {
        Row: {
          id: string
          org_id: string
          user_id: string
          agent_code: string
          scheduled_for: string
          started_at: string | null
          completed_at: string | null
          source: 'autopilot' | 'manual' | 'triggered'
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          user_id: string
          agent_code: string
          scheduled_for: string
          started_at?: string | null
          completed_at?: string | null
          source?: 'autopilot' | 'manual' | 'triggered'
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          user_id?: string
          agent_code?: string
          scheduled_for?: string
          started_at?: string | null
          completed_at?: string | null
          source?: 'autopilot' | 'manual' | 'triggered'
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_org_id_fkey"
            columns: ["org_id"]
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_agent_code_fkey"
            columns: ["agent_code"]
            referencedRelation: "agents"
            referencedColumns: ["agent_code"]
          }
        ]
      }
      topic_archetypes: {
        Row: {
          id: string
          agent_code: string
          topic_code: string
          display_name: string
          kind: 'morale' | 'role' | 'workflow' | 'tools' | 'pain' | 'focus'
          level: 'exec' | 'manager' | 'ic' | 'all'
          dept_tags_json: Json
          frequency_hint: 'core_weekly' | 'onboarding' | 'periodic' | 'rare'
          output_schema_json: Json | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          agent_code: string
          topic_code: string
          display_name: string
          kind: 'morale' | 'role' | 'workflow' | 'tools' | 'pain' | 'focus'
          level?: 'exec' | 'manager' | 'ic' | 'all'
          dept_tags_json?: Json
          frequency_hint?: 'core_weekly' | 'onboarding' | 'periodic' | 'rare'
          output_schema_json?: Json | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          agent_code?: string
          topic_code?: string
          display_name?: string
          kind?: 'morale' | 'role' | 'workflow' | 'tools' | 'pain' | 'focus'
          level?: 'exec' | 'manager' | 'ic' | 'all'
          dept_tags_json?: Json
          frequency_hint?: 'core_weekly' | 'onboarding' | 'periodic' | 'rare'
          output_schema_json?: Json | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_archetypes_agent_code_fkey"
            columns: ["agent_code"]
            referencedRelation: "agents"
            referencedColumns: ["agent_code"]
          }
        ]
      }
      user_profiles: {
        Row: {
          id: string
          org_id: string
          user_id: string
          profile_json: ProfileJson
          version: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          user_id: string
          profile_json?: ProfileJson
          version?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          user_id?: string
          profile_json?: ProfileJson
          version?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_org_id_fkey"
            columns: ["org_id"]
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      user_topic_history: {
        Row: {
          id: string
          org_id: string
          user_id: string
          topic_code: string
          last_asked_at: string
          times_answered: number
        }
        Insert: {
          id?: string
          org_id: string
          user_id: string
          topic_code: string
          last_asked_at?: string
          times_answered?: number
        }
        Update: {
          id?: string
          org_id?: string
          user_id?: string
          topic_code?: string
          last_asked_at?: string
          times_answered?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_topic_history_org_id_fkey"
            columns: ["org_id"]
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_org_admin: {
        Args: { check_org_id: string }
        Returns: boolean
      }
      is_org_member: {
        Args: { check_org_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Profile JSON schema type
export interface ProfileJson {
  role_summary?: string
  primary_duties?: string[]
  customer_facing?: boolean
  main_workflows?: {
    workflow_ref: string
    display_label: string
    tools: string[]
    data_sources: string[]
  }[]
  primary_tools?: string[]
  current_focus?: {
    label: string
    tags: string[]
    last_updated: string
  }
  pain_points?: {
    id: string
    label: string
    related_workflow_ref: string
    severity_trend: string
  }[]
  morale_trend?: string
  open_profile_gaps?: {
    id: string
    priority: string
    description: string
    suggested_agent: string
  }[]
}

// Agent output schemas
export interface PulseOutput {
  rating: number // 1-5
  reason: string
  workload_rating: number // 1-5
  burnout_risk: 'low' | 'medium' | 'high'
}

export interface RoleMapperOutput {
  role_summary: string
  primary_duties: string[]
  customer_facing: boolean
  kpis_known: boolean
}

export interface WorkflowMapperOutput {
  workflow_name: string
  display_label: string
  steps: string[]
  tools: string[]
  data_sources: string[]
}

export interface PainScannerOutput {
  workflow_ref: string
  tool_ref: string
  pain_rating: number // 1-5
  reason: string
  frequency: string
  impact: string
}

export interface FocusTrackerOutput {
  current_focus_label: string
  current_focus_tags: string[]
  still_primary_focus: boolean
  focus_rating: number // 1-5
  change_vs_last_time: string
  reason: string
}

// Convenience type aliases
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Insertable<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Updatable<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Common entity types
export type Organization = Tables<'organizations'>
export type Department = Tables<'departments'>
export type OrganizationMember = Tables<'organization_members'>
export type Agent = Tables<'agents'>
export type TopicArchetype = Tables<'topic_archetypes'>
export type Session = Tables<'sessions'>
export type SessionTopic = Tables<'session_topics'>
export type Answer = Tables<'answers'>
export type UserProfile = Tables<'user_profiles'>
export type UserTopicHistory = Tables<'user_topic_history'>
