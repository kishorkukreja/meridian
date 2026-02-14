import { useNavigate } from 'react-router-dom'
import { parseDate, formatTimeDisplay } from '@/lib/recurrence'
import { RECURRENCE_LABELS } from '@/types/database'
import type { ScheduleOccurrence } from '@/types/database'

interface Props {
  occurrences: ScheduleOccurrence[]
  weekStart: string
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function ScheduleWeekView({ occurrences, weekStart }: Props) {
  const navigate = useNavigate()

  // Build 7 days from weekStart (Monday)
  const days: string[] = []
  const cursor = parseDate(weekStart)
  for (let i = 0; i < 7; i++) {
    const y = cursor.getFullYear()
    const m = String(cursor.getMonth() + 1).padStart(2, '0')
    const d = String(cursor.getDate()).padStart(2, '0')
    days.push(`${y}-${m}-${d}`)
    cursor.setDate(cursor.getDate() + 1)
  }

  // Group occurrences by date
  const byDate = new Map<string, ScheduleOccurrence[]>()
  for (const d of days) byDate.set(d, [])
  for (const occ of occurrences) {
    const arr = byDate.get(occ.date)
    if (arr) arr.push(occ)
  }

  const todayStr = new Date().toISOString().slice(0, 10)

  return (
    <>
      {/* Desktop: 7-column grid */}
      <div className="hidden md:grid grid-cols-7 gap-2">
        {days.map((date, i) => {
          const dayOccs = byDate.get(date) || []
          const isToday = date === todayStr
          const dayNum = parseDate(date).getDate()

          return (
            <div
              key={date}
              onClick={() => navigate(`/schedule?date=${date}&view=day`)}
              className="rounded-lg border p-2 min-h-[120px] cursor-pointer transition-colors"
              style={{
                borderColor: isToday ? 'var(--color-accent)' : 'var(--color-border)',
                backgroundColor: isToday ? 'color-mix(in srgb, var(--color-accent) 5%, var(--color-bg-secondary))' : 'var(--color-bg-secondary)',
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)' }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = isToday
                  ? 'color-mix(in srgb, var(--color-accent) 5%, var(--color-bg-secondary))'
                  : 'var(--color-bg-secondary)'
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-medium" style={{ color: 'var(--color-text-tertiary)' }}>
                  {DAY_LABELS[i]}
                </span>
                <span
                  className={`text-xs font-medium ${isToday ? 'w-6 h-6 rounded-full flex items-center justify-center' : ''}`}
                  style={{
                    color: isToday ? '#fff' : 'var(--color-text-secondary)',
                    backgroundColor: isToday ? 'var(--color-accent)' : 'transparent',
                  }}
                >
                  {dayNum}
                </span>
              </div>
              <div className="space-y-1">
                {dayOccs.map(occ => {
                  const inviteSent = occ.log?.invite_sent ?? false
                  const attended = occ.log?.attended ?? false
                  const isComplete = inviteSent && attended
                  const isOverdue = occ.is_past && (!inviteSent || !attended)

                  return (
                    <div
                      key={`${occ.meeting.id}:${occ.date}`}
                      className="rounded px-1.5 py-1 text-[10px]"
                      style={{
                        backgroundColor: isComplete
                          ? 'color-mix(in srgb, var(--color-status-green) 10%, transparent)'
                          : isOverdue
                            ? 'color-mix(in srgb, var(--color-status-amber) 10%, transparent)'
                            : 'var(--color-bg-tertiary)',
                        color: isComplete
                          ? 'var(--color-status-green)'
                          : isOverdue
                            ? 'var(--color-status-amber)'
                            : 'var(--color-text-primary)',
                      }}
                    >
                      <div className="font-medium truncate">{occ.meeting.name}</div>
                      <div style={{ color: 'var(--color-text-tertiary)' }}>
                        {formatTimeDisplay(occ.meeting.time_of_day)}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Mobile: stacked day cards */}
      <div className="md:hidden space-y-3">
        {days.map((date, i) => {
          const dayOccs = byDate.get(date) || []
          const isToday = date === todayStr
          const dayNum = parseDate(date).getDate()

          if (dayOccs.length === 0) return null

          return (
            <div
              key={date}
              className="rounded-lg border p-3"
              style={{
                borderColor: isToday ? 'var(--color-accent)' : 'var(--color-border)',
                backgroundColor: 'var(--color-bg-secondary)',
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium" style={{ color: isToday ? 'var(--color-accent)' : 'var(--color-text-secondary)' }}>
                  {DAY_LABELS[i]} {dayNum}
                </span>
                {isToday && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}>
                    Today
                  </span>
                )}
                <span className="text-[10px] ml-auto" style={{ color: 'var(--color-text-tertiary)' }}>
                  {dayOccs.length} meeting{dayOccs.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="space-y-1.5">
                {dayOccs.map(occ => {
                  const inviteSent = occ.log?.invite_sent ?? false
                  const attended = occ.log?.attended ?? false
                  const isComplete = inviteSent && attended
                  const isOverdue = occ.is_past && (!inviteSent || !attended)

                  return (
                    <button
                      key={`${occ.meeting.id}:${occ.date}`}
                      onClick={() => navigate(`/schedule?date=${occ.date}&view=day`)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left cursor-pointer border-none"
                      style={{
                        backgroundColor: isComplete
                          ? 'color-mix(in srgb, var(--color-status-green) 10%, transparent)'
                          : isOverdue
                            ? 'color-mix(in srgb, var(--color-status-amber) 10%, transparent)'
                            : 'var(--color-bg-tertiary)',
                      }}
                    >
                      <span className="text-[10px] font-[family-name:var(--font-data)] shrink-0" style={{ color: 'var(--color-text-tertiary)' }}>
                        {formatTimeDisplay(occ.meeting.time_of_day)}
                      </span>
                      <span className="text-xs font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                        {occ.meeting.name}
                      </span>
                      <span className="text-[9px] shrink-0" style={{ color: 'var(--color-text-tertiary)' }}>
                        {RECURRENCE_LABELS[occ.meeting.recurrence]}
                      </span>
                      {isComplete && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 ml-auto" style={{ color: 'var(--color-status-green)' }}>
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
