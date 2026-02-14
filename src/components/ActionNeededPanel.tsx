import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useScheduleOccurrences } from '@/hooks/useSchedule'
import { addDays, getTodayStr, formatTimeDisplay } from '@/lib/recurrence'
import { RECURRENCE_LABELS } from '@/types/database'
import type { ScheduleOccurrence } from '@/types/database'

export function ActionNeededPanel() {
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const today = getTodayStr()
  const lookbackStart = addDays(today, -7)

  const { data: occurrences } = useScheduleOccurrences(lookbackStart, today)

  const actionItems = (occurrences || []).filter(occ => {
    const inviteSent = occ.log?.invite_sent ?? false
    const attended = occ.log?.attended ?? false

    if (!inviteSent) return true
    if (occ.is_past && !attended) return true
    return false
  })

  if (actionItems.length === 0) return null

  const getActionLabel = (occ: ScheduleOccurrence): string => {
    const inviteSent = occ.log?.invite_sent ?? false
    const attended = occ.log?.attended ?? false

    if (!inviteSent) return 'Invite not sent'
    if (occ.is_past && !attended) return 'Not attended'
    return ''
  }

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{ borderColor: 'var(--color-status-amber)', backgroundColor: 'color-mix(in srgb, var(--color-status-amber) 5%, var(--color-bg-secondary))' }}
    >
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-4 py-3 cursor-pointer border-none bg-transparent text-left"
      >
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-status-amber)' }}>
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
            Action Needed
          </span>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: 'var(--color-status-amber)', color: '#fff' }}
          >
            {actionItems.length}
          </span>
        </div>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: 'var(--color-text-tertiary)', transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 150ms' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {!collapsed && (
        <div className="px-4 pb-3 space-y-1">
          {actionItems.map(occ => (
            <button
              key={`${occ.meeting.id}:${occ.date}`}
              onClick={() => navigate(`/schedule?date=${occ.date}&view=day`)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left cursor-pointer border-none transition-colors"
              style={{ backgroundColor: 'var(--color-bg-primary)' }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)' }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'var(--color-bg-primary)' }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xs font-[family-name:var(--font-data)] shrink-0" style={{ color: 'var(--color-text-tertiary)' }}>
                  {formatTimeDisplay(occ.meeting.time_of_day)}
                </span>
                <span className="text-xs font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                  {occ.meeting.name}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0" style={{ backgroundColor: 'color-mix(in srgb, var(--color-text-tertiary) 15%, transparent)', color: 'var(--color-text-tertiary)' }}>
                  {RECURRENCE_LABELS[occ.meeting.recurrence]}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <span className="text-[10px] font-[family-name:var(--font-data)]" style={{ color: 'var(--color-text-tertiary)' }}>
                  {occ.date}
                </span>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap"
                  style={{ backgroundColor: 'color-mix(in srgb, var(--color-status-amber) 15%, transparent)', color: 'var(--color-status-amber)' }}
                >
                  {getActionLabel(occ)}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
