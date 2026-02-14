import { useState, useRef, useEffect } from 'react'
import { useUpsertScheduleLog } from '@/hooks/useSchedule'
import { formatTimeDisplay } from '@/lib/recurrence'
import { RECURRENCE_LABELS } from '@/types/database'
import type { ScheduleOccurrence } from '@/types/database'

interface Props {
  occurrence: ScheduleOccurrence
}

export function ScheduleOccurrenceRow({ occurrence }: Props) {
  const { meeting, date, log, is_past, is_today } = occurrence
  const upsertLog = useUpsertScheduleLog()

  const inviteSent = log?.invite_sent ?? false
  const attended = log?.attended ?? false
  const [notesOpen, setNotesOpen] = useState(false)
  const [notesValue, setNotesValue] = useState(log?.notes ?? '')
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    setNotesValue(log?.notes ?? '')
  }, [log?.notes])

  const handleToggle = (field: 'invite_sent' | 'attended', value: boolean) => {
    upsertLog.mutate({
      recurring_meeting_id: meeting.id,
      occurrence_date: date,
      invite_sent: field === 'invite_sent' ? value : inviteSent,
      attended: field === 'attended' ? value : attended,
      notes: log?.notes ?? null,
    })
  }

  const handleNotesChange = (value: string) => {
    setNotesValue(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      upsertLog.mutate({
        recurring_meeting_id: meeting.id,
        occurrence_date: date,
        invite_sent: inviteSent,
        attended: attended,
        notes: value || null,
      })
    }, 800)
  }

  const isComplete = inviteSent && attended
  const isOverdue = is_past && (!inviteSent || !attended)

  let rowBg = 'var(--color-bg-primary)'
  if (isComplete) rowBg = 'color-mix(in srgb, var(--color-status-green) 5%, var(--color-bg-primary))'
  else if (isOverdue) rowBg = 'color-mix(in srgb, var(--color-status-amber) 5%, var(--color-bg-primary))'
  else if (is_today) rowBg = 'color-mix(in srgb, var(--color-accent) 5%, var(--color-bg-primary))'

  return (
    <div
      className="rounded-lg border px-3 py-2.5"
      style={{ backgroundColor: rowBg, borderColor: is_today ? 'var(--color-accent)' : 'var(--color-border)' }}
    >
      <div className="flex items-center gap-3 flex-wrap">
        {/* Time */}
        <span
          className="text-xs font-[family-name:var(--font-data)] shrink-0 w-16"
          style={{ color: isComplete ? 'var(--color-text-tertiary)' : 'var(--color-text-secondary)' }}
        >
          {formatTimeDisplay(meeting.time_of_day)}
        </span>

        {/* Name */}
        <span
          className="text-sm font-medium flex-1 min-w-0 truncate"
          style={{ color: isComplete ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)' }}
        >
          {meeting.name}
        </span>

        {/* Duration */}
        <span className="text-[10px] shrink-0" style={{ color: 'var(--color-text-tertiary)' }}>
          {meeting.duration_minutes}m
        </span>

        {/* Recurrence badge */}
        <span
          className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0"
          style={{ backgroundColor: 'color-mix(in srgb, var(--color-text-tertiary) 15%, transparent)', color: 'var(--color-text-tertiary)' }}
        >
          {RECURRENCE_LABELS[meeting.recurrence]}
        </span>

        {/* Invite checkbox */}
        <label className="flex items-center gap-1 shrink-0 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={inviteSent}
            onChange={e => handleToggle('invite_sent', e.target.checked)}
            className="w-3.5 h-3.5 accent-[var(--color-accent)] cursor-pointer"
          />
          <span className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>Invite</span>
        </label>

        {/* Attended checkbox */}
        <label className="flex items-center gap-1 shrink-0 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={attended}
            onChange={e => handleToggle('attended', e.target.checked)}
            className="w-3.5 h-3.5 accent-[var(--color-accent)] cursor-pointer"
          />
          <span className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>Attended</span>
        </label>

        {/* Notes toggle */}
        <button
          onClick={() => setNotesOpen(!notesOpen)}
          className="shrink-0 cursor-pointer border-none bg-transparent p-1 rounded"
          style={{ color: log?.notes ? 'var(--color-accent)' : 'var(--color-text-tertiary)' }}
          title="Notes"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
      </div>

      {/* Inline notes */}
      {notesOpen && (
        <div className="mt-2 pl-[76px]">
          <textarea
            value={notesValue}
            onChange={e => handleNotesChange(e.target.value)}
            placeholder="Add notes..."
            rows={2}
            className="w-full px-2 py-1.5 rounded text-xs border outline-none resize-y"
            style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
          />
        </div>
      )}
    </div>
  )
}
