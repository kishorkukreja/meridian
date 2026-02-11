import { OBJECT_AGING_THRESHOLDS, ISSUE_AGING_THRESHOLDS } from './constants'

export function computeAgingDays(stageEnteredAt: string): number {
  return Math.floor(
    (Date.now() - new Date(stageEnteredAt).getTime()) / (1000 * 60 * 60 * 24)
  )
}

export function computeIssueAgeDays(createdAt: string, resolvedAt: string | null): number {
  const endTime = resolvedAt ? new Date(resolvedAt).getTime() : Date.now()
  return Math.floor(
    (endTime - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
  )
}

export function getAgingLevel(days: number, type: 'object' | 'issue'): 'normal' | 'warning' | 'critical' {
  const thresholds = type === 'object' ? OBJECT_AGING_THRESHOLDS : ISSUE_AGING_THRESHOLDS
  if (days >= thresholds.critical) return 'critical'
  if (days >= thresholds.warning) return 'warning'
  return 'normal'
}

export function computeProgressPercent(currentStage: string): number {
  const stages = [
    'requirements', 'mapping', 'extraction', 'ingestion',
    'transformation', 'push_to_target', 'validation', 'signoff', 'live',
  ]
  return Math.round(((stages.indexOf(currentStage) + 1) / stages.length) * 100)
}
