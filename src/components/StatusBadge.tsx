import { STATUS_COLORS, ISSUE_STATUS_COLORS, STATUS_LABELS, ISSUE_STATUS_LABELS } from '@/lib/constants'
import type { ObjectStatus, IssueStatus } from '@/types/database'

interface Props {
  status: ObjectStatus | IssueStatus
  type?: 'object' | 'issue'
}

export function StatusBadge({ status, type = 'object' }: Props) {
  const color = type === 'object'
    ? STATUS_COLORS[status as ObjectStatus]
    : ISSUE_STATUS_COLORS[status as IssueStatus]
  const label = type === 'object'
    ? STATUS_LABELS[status as ObjectStatus]
    : ISSUE_STATUS_LABELS[status as IssueStatus]

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium font-[family-name:var(--font-data)]"
      style={{
        backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`,
        color: color,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  )
}
