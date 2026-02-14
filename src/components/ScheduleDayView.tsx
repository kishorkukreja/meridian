import { ScheduleOccurrenceRow } from '@/components/ScheduleOccurrenceRow'
import type { ScheduleOccurrence } from '@/types/database'

interface Props {
  occurrences: ScheduleOccurrence[]
  date: string
}

export function ScheduleDayView({ occurrences, date }: Props) {
  const dayOccurrences = occurrences.filter(o => o.date === date)

  if (dayOccurrences.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
          No meetings scheduled for this day.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {dayOccurrences.map(occ => (
        <ScheduleOccurrenceRow
          key={`${occ.meeting.id}:${occ.date}`}
          occurrence={occ}
        />
      ))}
    </div>
  )
}
