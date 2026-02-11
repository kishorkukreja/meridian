import type { ObjectWithComputed, IssueWithObject } from '@/types/database'

interface ObjectSummaryProps {
  type: 'objects'
  data: ObjectWithComputed[]
}

interface IssueSummaryProps {
  type: 'issues'
  data: IssueWithObject[]
}

type Props = ObjectSummaryProps | IssueSummaryProps

export function SummaryBar(props: Props) {
  if (props.type === 'objects') {
    const objects = props.data
    const onTrack = objects.filter(o => o.status === 'on_track').length
    const atRisk = objects.filter(o => o.status === 'at_risk').length
    const blocked = objects.filter(o => o.status === 'blocked').length
    const completed = objects.filter(o => o.status === 'completed').length
    const avgAging = objects.length > 0
      ? Math.round(objects.reduce((sum, o) => sum + o.aging_days, 0) / objects.length)
      : 0

    return (
      <div className="flex flex-wrap gap-4 p-3 rounded-lg text-sm" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
        <Stat label="Total" value={objects.length} />
        <Stat label="On Track" value={onTrack} color="var(--color-status-green)" />
        <Stat label="At Risk" value={atRisk} color="var(--color-status-amber)" />
        <Stat label="Blocked" value={blocked} color="var(--color-status-red)" />
        <Stat label="Completed" value={completed} color="var(--color-status-grey)" />
        <Stat label="Avg Aging" value={`${avgAging}d`} />
      </div>
    )
  }

  const issues = props.data
  const open = issues.filter(i => i.status === 'open').length
  const inProgress = issues.filter(i => i.status === 'in_progress').length
  const blocked = issues.filter(i => i.status === 'blocked').length
  const oldest = issues.length > 0 ? Math.max(...issues.map(i => i.age_days)) : 0

  return (
    <div className="flex flex-wrap gap-4 p-3 rounded-lg text-sm" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
      <Stat label="Total Open" value={issues.length} />
      <Stat label="Open" value={open} color="var(--color-status-amber)" />
      <Stat label="In Progress" value={inProgress} color="var(--color-status-blue)" />
      <Stat label="Blocked" value={blocked} color="var(--color-status-red)" />
      <Stat label="Oldest" value={`${oldest}d`} />
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span style={{ color: 'var(--color-text-secondary)' }} className="text-xs">{label}</span>
      <span
        className="font-semibold font-[family-name:var(--font-data)]"
        style={{ color: color || 'var(--color-text-primary)' }}
      >
        {value}
      </span>
    </div>
  )
}
