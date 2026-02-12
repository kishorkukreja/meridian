// Auto-generated types matching Supabase schema
// These should be regenerated if the schema changes using:
// npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts

// ============================================
// Enums
// ============================================

export type LifecycleStage =
  | 'requirements'
  | 'mapping'
  | 'extraction'
  | 'ingestion'
  | 'transformation'
  | 'push_to_target'
  | 'validation'
  | 'signoff'
  | 'live';

export type ModuleType = 'demand_planning' | 'supply_planning';

export type ObjectCategory =
  | 'master_data'
  | 'drivers'
  | 'priority_1'
  | 'priority_2'
  | 'priority_3';

export type SourceSystem =
  | 'erp_primary'
  | 'manual_file'
  | 'external_1'
  | 'external_2'
  | 'data_lake'
  | 'sub_system'
  | 'other';

export type IssueType =
  | 'mapping'
  | 'data_quality'
  | 'dependency'
  | 'signoff'
  | 'technical'
  | 'clarification'
  | 'other';

export type IssueStatus =
  | 'open'
  | 'in_progress'
  | 'blocked'
  | 'resolved'
  | 'closed';

export type ObjectStatus =
  | 'on_track'
  | 'at_risk'
  | 'blocked'
  | 'completed'
  | 'archived';

export type RegionType =
  | 'region_eu'
  | 'region_na'
  | 'region_apac'
  | 'region_latam'
  | 'region_mea'
  | 'global';

// ============================================
// Ordered constants (for UI rendering)
// ============================================

export const LIFECYCLE_STAGES: LifecycleStage[] = [
  'requirements',
  'mapping',
  'extraction',
  'ingestion',
  'transformation',
  'push_to_target',
  'validation',
  'signoff',
  'live',
];

export const STAGE_LABELS: Record<LifecycleStage, string> = {
  requirements: 'Requirements',
  mapping: 'Mapping',
  extraction: 'Extraction',
  ingestion: 'Ingestion',
  transformation: 'Transformation',
  push_to_target: 'Push to Target',
  validation: 'Validation',
  signoff: 'Sign-off',
  live: 'Live',
};

export const MODULE_LABELS: Record<ModuleType, string> = {
  demand_planning: 'Demand Planning',
  supply_planning: 'Supply Planning',
};

export const CATEGORY_LABELS: Record<ObjectCategory, string> = {
  master_data: 'Master Data',
  drivers: 'Drivers',
  priority_1: 'Priority 1',
  priority_2: 'Priority 2',
  priority_3: 'Priority 3',
};

export const MODULE_CATEGORIES: Record<ModuleType, ObjectCategory[]> = {
  demand_planning: ['master_data', 'drivers'],
  supply_planning: ['master_data', 'priority_1', 'priority_2', 'priority_3'],
};

// ============================================
// Database Row Types
// ============================================

export type ObjectRow = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  module: ModuleType;
  category: ObjectCategory;
  region: RegionType;
  source_system: SourceSystem;
  current_stage: LifecycleStage;
  stage_entered_at: string;
  status: ObjectStatus;
  owner_alias: string | null;
  team_alias: string | null;
  notes: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export type IssueRow = {
  id: string;
  user_id: string;
  object_id: string;
  title: string;
  description: string | null;
  issue_type: IssueType;
  lifecycle_stage: LifecycleStage;
  status: IssueStatus;
  owner_alias: string | null;
  raised_by_alias: string | null;
  blocked_by_object_id: string | null;
  blocked_by_note: string | null;
  decision: string | null;
  resolved_at: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export type StageHistoryRow = {
  id: string;
  object_id: string;
  from_stage: LifecycleStage;
  to_stage: LifecycleStage;
  transitioned_at: string;
  note: string | null;
}

export type CommentRow = {
  id: string;
  user_id: string;
  entity_type: 'object' | 'issue';
  entity_id: string;
  body: string;
  author_alias: string | null;
  created_at: string;
}

export type NextStep = {
  action: string;
  owner: string;
  due_date: string;
}

export type MeetingType = 'full_mom' | 'quick_summary' | 'ai_conversation';

export type MeetingRow = {
  id: string;
  user_id: string;
  title: string;
  meeting_date: string;
  transcript: string;
  meeting_type: MeetingType;
  tldr: string | null;
  discussion_points: string[] | null;
  next_steps: NextStep[] | null;
  action_log: string | null;
  model_used: string | null;
  linked_object_ids: string[];
  linked_issue_ids: string[];
  created_at: string;
  updated_at: string;
}

export type MeetingWithLinks = MeetingRow & {
  linked_object_names: string[];
  linked_issue_titles: string[];
}

// ============================================
// Computed / Enriched Types (for UI)
// ============================================

export type ObjectWithComputed = ObjectRow & {
  aging_days: number;
  open_issue_count: number;
  progress_percent: number;
}

export type IssueWithObject = IssueRow & {
  object_name: string;
  object_module: ModuleType;
  age_days: number;
}

// ============================================
// Supabase Database Type (for client typing)
// ============================================

export type Database = {
  public: {
    Tables: {
      meridian_objects: {
        Row: ObjectRow;
        Insert: Omit<ObjectRow, 'id' | 'created_at' | 'updated_at' | 'stage_entered_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
          stage_entered_at?: string;
        };
        Update: Partial<Omit<ObjectRow, 'id' | 'user_id'>>;
        Relationships: [
          {
            foreignKeyName: 'meridian_objects_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      meridian_issues: {
        Row: IssueRow;
        Insert: Omit<IssueRow, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<IssueRow, 'id' | 'user_id'>>;
        Relationships: [
          {
            foreignKeyName: 'meridian_issues_object_id_fkey';
            columns: ['object_id'];
            isOneToOne: false;
            referencedRelation: 'meridian_objects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'meridian_issues_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'meridian_issues_blocked_by_object_id_fkey';
            columns: ['blocked_by_object_id'];
            isOneToOne: false;
            referencedRelation: 'meridian_objects';
            referencedColumns: ['id'];
          },
        ];
      };
      meridian_stage_history: {
        Row: StageHistoryRow;
        Insert: Omit<StageHistoryRow, 'id' | 'transitioned_at'> & {
          id?: string;
          transitioned_at?: string;
        };
        Update: Partial<Omit<StageHistoryRow, 'id'>>;
        Relationships: [
          {
            foreignKeyName: 'meridian_stage_history_object_id_fkey';
            columns: ['object_id'];
            isOneToOne: false;
            referencedRelation: 'meridian_objects';
            referencedColumns: ['id'];
          },
        ];
      };
      meridian_comments: {
        Row: CommentRow;
        Insert: Omit<CommentRow, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<CommentRow, 'id' | 'user_id'>>;
        Relationships: [
          {
            foreignKeyName: 'meridian_comments_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      meridian_meetings: {
        Row: MeetingRow;
        Insert: Omit<MeetingRow, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<MeetingRow, 'id' | 'user_id'>>;
        Relationships: [
          {
            foreignKeyName: 'meridian_meetings_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      lifecycle_stage: LifecycleStage;
      module_type: ModuleType;
      object_category: ObjectCategory;
      source_system: SourceSystem;
      issue_type: IssueType;
      issue_status: IssueStatus;
      object_status: ObjectStatus;
      region_type: RegionType;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
