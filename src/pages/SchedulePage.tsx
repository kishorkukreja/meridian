import { useSearchParams, useNavigate } from 'react-router-dom'
import { useScheduleOccurrences } from '@/hooks/useSchedule'
import { getWeekRange, getTodayStr, addDays, parseDate, formatDate } from '@/lib/recurrence'
import { ActionNeededPanel } from '@/components/ActionNeededPanel'
import { ScheduleDayView } from '@/components/ScheduleDayView'
import { ScheduleWeekView } from '@/components/ScheduleWeekView'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'

const DAY_NAMES_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export function SchedulePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const today = getTodayStr()

  const dateParam = searchParams.get('date') || today
  const viewParam = (searchParams.get('view') || 'day') as 'day' | 'week'

  const weekRange = getWeekRange(dateParam)
  const rangeStart = viewParam === 'week' ? weekRange.start : dateParam
  const rangeEnd = viewParam === 'week' ? weekRange.end : dateParam

  const { data: occurrences, isLoading, error } = useScheduleOccurrences(rangeStart, rangeEnd)

  const setView = (view: 'day' | 'week') => {
    const params = new URLSearchParams(searchParams)
    params.set('view', view)
    setSearchParams(params)
  }

  const setDate = (date: string) => {
    const params = new URLSearchParams(searchParams)
    params.set('date', date)
    setSearchParams(params)
  }

  const goToday = () => setDate(today)

  const goPrev = () => {
    if (viewParam === 'day') {
      setDate(addDays(dateParam, -1))
    } else {
      setDate(addDays(dateParam, -7))
    }
  }

  const goNext = () => {
    if (viewParam === 'day') {
      setDate(addDays(dateParam, 1))
    } else {
      setDate(addDays(dateParam, 7))
    }
  }

  const d = parseDate(dateParam)
  const dateLabel = viewParam === 'day'
    ? `${DAY_NAMES_FULL[d.getDay()]}, ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
    : (() => {
        const ws = parseDate(weekRange.start)
        const we = parseDate(weekRange.end)
        const sameMonth = ws.getMonth() === we.getMonth()
        if (sameMonth) {
          return `${MONTH_NAMES[ws.getMonth()]} ${ws.getDate()} – ${we.getDate()}, ${ws.getFullYear()}`
        }
        return `${MONTH_NAMES[ws.getMonth()]} ${ws.getDate()} – ${MONTH_NAMES[we.getMonth()]} ${we.getDate()}, ${we.getFullYear()}`
      })()

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-lg font-bold">Schedule</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/schedule/manage')}
            className="h-8 px-3 rounded-lg text-xs cursor-pointer border"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text-secondary)' }}
          >
            Manage Meetings
          </button>
          <button
            onClick={() => navigate('/schedule/new')}
            className="h-8 px-4 rounded-lg text-sm font-medium cursor-pointer border-none"
            style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
          >
            + New Meeting
          </button>
        </div>
      </div>

      {/* Action Needed */}
      <ActionNeededPanel />

      {/* Date navigation + view toggle */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={goPrev}
            className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer border"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text-secondary)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            onClick={goToday}
            className="h-8 px-3 rounded-lg text-xs cursor-pointer border"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text-secondary)' }}
          >
            Today
          </button>
          <button
            onClick={goNext}
            className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer border"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text-secondary)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
          <span className="text-sm font-medium ml-2" style={{ color: 'var(--color-text-primary)' }}>
            {dateLabel}
          </span>
        </div>

        <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
          <button
            onClick={() => setView('day')}
            className="h-8 px-3 text-xs cursor-pointer border-none"
            style={{
              backgroundColor: viewParam === 'day' ? 'var(--color-accent)' : 'transparent',
              color: viewParam === 'day' ? '#fff' : 'var(--color-text-secondary)',
            }}
          >
            Day
          </button>
          <button
            onClick={() => setView('week')}
            className="h-8 px-3 text-xs cursor-pointer border-none"
            style={{
              backgroundColor: viewParam === 'week' ? 'var(--color-accent)' : 'transparent',
              color: viewParam === 'week' ? '#fff' : 'var(--color-text-secondary)',
            }}
          >
            Week
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading && <LoadingSkeleton rows={5} type="card" />}
      {error && <p className="text-sm" style={{ color: 'var(--color-status-red)' }}>Failed to load schedule.</p>}

      {occurrences && viewParam === 'day' && (
        <ScheduleDayView occurrences={occurrences} date={dateParam} />
      )}

      {occurrences && viewParam === 'week' && (
        <ScheduleWeekView occurrences={occurrences} weekStart={weekRange.start} />
      )}
    </div>
  )
}
