import { getAgingLevel } from '@/lib/aging'

interface Props {
  days: number
  type?: 'object' | 'issue'
}

const LEVEL_COLORS = {
  normal: 'var(--color-status-green)',
  warning: 'var(--color-status-amber)',
  critical: 'var(--color-status-red)',
}

export function AgingBadge({ days, type = 'object' }: Props) {
  const level = getAgingLevel(days, type)
  const color = LEVEL_COLORS[level]

  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-medium font-[family-name:var(--font-data)]"
      style={{ color }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {days}d
    </span>
  )
}
