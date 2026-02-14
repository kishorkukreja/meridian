import type { ObjectStatus, IssueStatus, LifecycleStage, NextAction } from '@/types/database'
export { MODULE_LABELS, CATEGORY_LABELS } from '@/types/database'

export const OBJECT_AGING_THRESHOLDS = {
  warning: 8,
  critical: 15,
} as const

export const ISSUE_AGING_THRESHOLDS = {
  warning: 4,
  critical: 8,
} as const

export const STATUS_COLORS: Record<ObjectStatus, string> = {
  on_track: 'var(--color-status-green)',
  at_risk: 'var(--color-status-amber)',
  blocked: 'var(--color-status-red)',
  completed: 'var(--color-status-grey)',
  archived: 'var(--color-status-grey)',
}

export const ISSUE_STATUS_COLORS: Record<IssueStatus, string> = {
  open: 'var(--color-status-amber)',
  in_progress: 'var(--color-status-blue)',
  blocked: 'var(--color-status-red)',
  resolved: 'var(--color-status-green)',
  closed: 'var(--color-status-grey)',
}

export const STAGE_COLORS: Record<LifecycleStage, string> = {
  requirements: 'var(--color-stage-1)',
  mapping: 'var(--color-stage-2)',
  extraction: 'var(--color-stage-3)',
  ingestion: 'var(--color-stage-4)',
  transformation: 'var(--color-stage-5)',
  push_to_target: 'var(--color-stage-6)',
  validation: 'var(--color-stage-7)',
  signoff: 'var(--color-stage-8)',
  live: 'var(--color-stage-9)',
}

export const STATUS_LABELS: Record<ObjectStatus, string> = {
  on_track: 'On Track',
  at_risk: 'At Risk',
  blocked: 'Blocked',
  completed: 'Completed',
  archived: 'Archived',
}

export const ISSUE_STATUS_LABELS: Record<IssueStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  blocked: 'Blocked',
  resolved: 'Resolved',
  closed: 'Closed',
}

export const ISSUE_TYPE_LABELS: Record<string, string> = {
  mapping: 'Mapping',
  data_quality: 'Data Quality',
  dependency: 'Dependency',
  signoff: 'Sign-off',
  technical: 'Technical',
  clarification: 'Clarification',
  other: 'Other',
}

export const NEXT_ACTION_LABELS: Record<NextAction, string> = {
  observe: 'Observe',
  follow_up: 'Follow Up',
  set_meeting: 'Set Meeting in Calendar',
}

export const NEXT_ACTION_COLORS: Record<NextAction, string> = {
  observe: 'var(--color-status-blue)',
  follow_up: 'var(--color-status-amber)',
  set_meeting: 'var(--color-status-green)',
}

export const SOURCE_SYSTEM_LABELS: Record<string, string> = {
  erp_primary: 'ERP Primary',
  manual_file: 'Manual File',
  external_1: 'External 1',
  external_2: 'External 2',
  data_lake: 'Data Lake',
  sub_system: 'Sub-System',
  other: 'Other',
}

export const REGION_LABELS: Record<string, string> = {
  region_eu: 'EU',
  region_na: 'NA',
  region_apac: 'APAC',
  region_latam: 'LATAM',
  region_mea: 'MEA',
  global: 'Global',
}
