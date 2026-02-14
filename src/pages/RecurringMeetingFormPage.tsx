import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect, type FormEvent } from 'react'
import { useRecurringMeeting, useCreateRecurringMeeting, useUpdateRecurringMeeting } from '@/hooks/useSchedule'
import { useObjects } from '@/hooks/useObjects'
import { useIssues } from '@/hooks/useIssues'
import { RECURRENCE_LABELS } from '@/types/database'
import type { RecurrencePattern } from '@/types/database'

const DAY_OPTIONS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]

export function RecurringMeetingFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id
  const { data: existing } = useRecurringMeeting(id)
  const createMeeting = useCreateRecurringMeeting()
  const updateMeeting = useUpdateRecurringMeeting()
  const { data: objects } = useObjects({ is_archived: 'false' })
  const { data: issues } = useIssues()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [recurrence, setRecurrence] = useState<RecurrencePattern>('weekly')
  const [dayOfWeek, setDayOfWeek] = useState<number>(1) // Monday
  const [dayOfMonth, setDayOfMonth] = useState<number>(1)
  const [timeOfDay, setTimeOfDay] = useState('09:00')
  const [durationMinutes, setDurationMinutes] = useState(60)
  const [customIntervalDays, setCustomIntervalDays] = useState(3)
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState('')
  const [linkedObjectIds, setLinkedObjectIds] = useState<string[]>([])
  const [linkedIssueIds, setLinkedIssueIds] = useState<string[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (existing) {
      setName(existing.name)
      setDescription(existing.description || '')
      setRecurrence(existing.recurrence)
      setDayOfWeek(existing.day_of_week ?? 1)
      setDayOfMonth(existing.day_of_month ?? 1)
      setTimeOfDay(existing.time_of_day.slice(0, 5)) // HH:MM
      setDurationMinutes(existing.duration_minutes)
      setCustomIntervalDays(existing.custom_interval_days ?? 3)
      setStartDate(existing.start_date)
      setEndDate(existing.end_date || '')
      setLinkedObjectIds(existing.linked_object_ids)
      setLinkedIssueIds(existing.linked_issue_ids)
    }
  }, [existing])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    const payload = {
      name,
      description: description || null,
      recurrence,
      day_of_week: (recurrence === 'weekly' || recurrence === 'biweekly') ? dayOfWeek : null,
      day_of_month: recurrence === 'monthly' ? dayOfMonth : null,
      time_of_day: timeOfDay,
      duration_minutes: durationMinutes,
      custom_interval_days: recurrence === 'custom' ? customIntervalDays : null,
      start_date: startDate,
      end_date: endDate || null,
      linked_object_ids: linkedObjectIds,
      linked_issue_ids: linkedIssueIds,
      is_active: true,
    }

    try {
      if (isEdit) {
        await updateMeeting.mutateAsync({ id, ...payload })
      } else {
        await createMeeting.mutateAsync(payload)
      }
      navigate('/schedule/manage')
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const toggleLinkedObject = (objId: string) => {
    setLinkedObjectIds(prev =>
      prev.includes(objId) ? prev.filter(x => x !== objId) : [...prev, objId]
    )
  }

  const toggleLinkedIssue = (issueId: string) => {
    setLinkedIssueIds(prev =>
      prev.includes(issueId) ? prev.filter(x => x !== issueId) : [...prev, issueId]
    )
  }

  const isPending = createMeeting.isPending || updateMeeting.isPending

  return (
    <div className="p-4 md:p-6 max-w-2xl">
      <button
        onClick={() => navigate('/schedule/manage')}
        className="text-xs cursor-pointer border-none bg-transparent mb-4"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        &larr; Back to Manage Meetings
      </button>

      <h1 className="text-lg font-bold mb-6">{isEdit ? 'Edit Recurring Meeting' : 'New Recurring Meeting'}</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Name *">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            placeholder="Weekly S&OP Sync"
            className="w-full h-10 px-3 rounded-lg text-sm border outline-none"
            style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
          />
        </Field>

        <Field label="Description">
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
            placeholder="Optional description..."
            className="w-full px-3 py-2 rounded-lg text-sm border outline-none resize-y"
            style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
          />
        </Field>

        <Field label="Recurrence *">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(RECURRENCE_LABELS) as RecurrencePattern[]).map(r => (
              <button
                key={r}
                type="button"
                onClick={() => setRecurrence(r)}
                className="h-9 px-3 rounded-lg text-xs font-medium cursor-pointer border transition-colors"
                style={{
                  borderColor: recurrence === r ? 'var(--color-accent)' : 'var(--color-border)',
                  backgroundColor: recurrence === r ? 'color-mix(in srgb, var(--color-accent) 10%, transparent)' : 'transparent',
                  color: recurrence === r ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                }}
              >
                {RECURRENCE_LABELS[r]}
              </button>
            ))}
          </div>
        </Field>

        {/* Conditional fields */}
        {(recurrence === 'weekly' || recurrence === 'biweekly') && (
          <Field label="Day of Week *">
            <select
              value={dayOfWeek}
              onChange={e => setDayOfWeek(Number(e.target.value))}
              className="w-full h-10 px-3 rounded-lg text-sm border outline-none"
              style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            >
              {DAY_OPTIONS.map(d => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </Field>
        )}

        {recurrence === 'monthly' && (
          <Field label="Day of Month *">
            <input
              type="number"
              min={1}
              max={31}
              value={dayOfMonth}
              onChange={e => setDayOfMonth(Number(e.target.value))}
              className="w-full h-10 px-3 rounded-lg text-sm border outline-none"
              style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            />
            <p className="text-[10px] mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
              If the month has fewer days, the last day of the month will be used.
            </p>
          </Field>
        )}

        {recurrence === 'custom' && (
          <Field label="Repeat Every N Days *">
            <input
              type="number"
              min={1}
              max={365}
              value={customIntervalDays}
              onChange={e => setCustomIntervalDays(Number(e.target.value))}
              className="w-full h-10 px-3 rounded-lg text-sm border outline-none"
              style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            />
          </Field>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Time *">
            <input
              type="time"
              value={timeOfDay}
              onChange={e => setTimeOfDay(e.target.value)}
              required
              className="w-full h-10 px-3 rounded-lg text-sm border outline-none"
              style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            />
          </Field>

          <Field label="Duration (minutes) *">
            <input
              type="number"
              min={5}
              max={480}
              step={5}
              value={durationMinutes}
              onChange={e => setDurationMinutes(Number(e.target.value))}
              required
              className="w-full h-10 px-3 rounded-lg text-sm border outline-none"
              style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Start Date *">
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              required
              className="w-full h-10 px-3 rounded-lg text-sm border outline-none"
              style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            />
          </Field>

          <Field label="End Date">
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full h-10 px-3 rounded-lg text-sm border outline-none"
              style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            />
            <p className="text-[10px] mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
              Leave empty for no end date.
            </p>
          </Field>
        </div>

        {/* Linked Objects */}
        <Field label="Link to Objects (optional)">
          <div className="flex flex-wrap gap-1.5">
            {objects?.map(obj => (
              <button
                key={obj.id}
                type="button"
                onClick={() => toggleLinkedObject(obj.id)}
                className="h-7 px-2.5 rounded-full text-[11px] cursor-pointer border transition-colors"
                style={{
                  borderColor: linkedObjectIds.includes(obj.id) ? 'var(--color-accent)' : 'var(--color-border)',
                  backgroundColor: linkedObjectIds.includes(obj.id) ? 'color-mix(in srgb, var(--color-accent) 15%, transparent)' : 'transparent',
                  color: linkedObjectIds.includes(obj.id) ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                }}
              >
                {obj.name}
              </button>
            ))}
            {objects?.length === 0 && (
              <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>No objects available</span>
            )}
          </div>
        </Field>

        {/* Linked Issues */}
        <Field label="Link to Issues (optional)">
          <div className="flex flex-wrap gap-1.5">
            {issues?.map(issue => (
              <button
                key={issue.id}
                type="button"
                onClick={() => toggleLinkedIssue(issue.id)}
                className="h-7 px-2.5 rounded-full text-[11px] cursor-pointer border transition-colors"
                style={{
                  borderColor: linkedIssueIds.includes(issue.id) ? 'var(--color-accent)' : 'var(--color-border)',
                  backgroundColor: linkedIssueIds.includes(issue.id) ? 'color-mix(in srgb, var(--color-accent) 15%, transparent)' : 'transparent',
                  color: linkedIssueIds.includes(issue.id) ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                }}
              >
                {issue.title}
              </button>
            ))}
            {issues?.length === 0 && (
              <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>No issues available</span>
            )}
          </div>
        </Field>

        {error && <p className="text-xs" style={{ color: 'var(--color-status-red)' }}>{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="h-10 px-6 rounded-lg text-sm font-medium cursor-pointer border-none disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
          >
            {isPending ? 'Saving...' : isEdit ? 'Update Meeting' : 'Create Meeting'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/schedule/manage')}
            className="h-10 px-4 text-sm cursor-pointer border-none bg-transparent"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>{label}</label>
      {children}
    </div>
  )
}
