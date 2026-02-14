import { useNavigate } from 'react-router-dom'
import { useRecurringMeetings, useUpdateRecurringMeeting, useDeleteRecurringMeeting } from '@/hooks/useSchedule'
import { RECURRENCE_LABELS } from '@/types/database'
import { dayOfWeekLabelFull, formatTimeDisplay } from '@/lib/recurrence'
import { EmptyState } from '@/components/EmptyState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'

export function RecurringMeetingListPage() {
  const navigate = useNavigate()
  const { data: meetings, isLoading, error } = useRecurringMeetings()
  const updateMeeting = useUpdateRecurringMeeting()
  const deleteMeeting = useDeleteRecurringMeeting()

  const handleToggleActive = (id: string, currentActive: boolean) => {
    updateMeeting.mutate({ id, is_active: !currentActive })
  }

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Delete "${name}"? This will also remove all schedule logs for this meeting.`)) {
      deleteMeeting.mutate(id)
    }
  }

  const getScheduleLabel = (meeting: { recurrence: string; day_of_week: number | null; day_of_month: number | null; custom_interval_days: number | null }) => {
    switch (meeting.recurrence) {
      case 'weekly':
      case 'biweekly':
        return meeting.day_of_week !== null ? dayOfWeekLabelFull(meeting.day_of_week) : '-'
      case 'monthly':
        return meeting.day_of_month !== null ? `Day ${meeting.day_of_month}` : '-'
      case 'custom':
        return meeting.custom_interval_days ? `Every ${meeting.custom_interval_days}d` : '-'
      default:
        return '-'
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/schedule')}
            className="text-xs cursor-pointer border-none bg-transparent"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            &larr; Schedule
          </button>
          <h1 className="text-lg font-bold">Manage Meetings</h1>
        </div>
        <button
          onClick={() => navigate('/schedule/new')}
          className="h-8 px-4 rounded-lg text-sm font-medium cursor-pointer border-none"
          style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
        >
          + New Meeting
        </button>
      </div>

      {isLoading && <LoadingSkeleton />}
      {error && <p className="text-sm" style={{ color: 'var(--color-status-red)' }}>Failed to load meetings.</p>}
      {meetings && meetings.length === 0 && (
        <EmptyState
          message="No recurring meetings defined. Set up your first one."
          actionLabel="New Meeting"
          onAction={() => navigate('/schedule/new')}
        />
      )}

      {meetings && meetings.length > 0 && (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                  {['Name', 'Recurrence', 'Day/Date', 'Time', 'Duration', 'Active', 'Actions'].map(col => (
                    <th key={col} className="text-left px-3 py-2.5 text-xs font-medium whitespace-nowrap" style={{ color: 'var(--color-text-secondary)' }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {meetings.map((meeting, i) => (
                  <tr
                    key={meeting.id}
                    className="transition-colors duration-150"
                    style={{ backgroundColor: i % 2 === 0 ? 'var(--color-bg-primary)' : 'var(--color-bg-secondary)' }}
                  >
                    <td className="px-3 py-2.5 text-xs font-medium max-w-[200px] truncate">{meeting.name}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap"
                        style={{ backgroundColor: 'color-mix(in srgb, var(--color-accent) 15%, transparent)', color: 'var(--color-accent)' }}
                      >
                        {RECURRENCE_LABELS[meeting.recurrence]}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs font-[family-name:var(--font-data)]" style={{ color: 'var(--color-text-secondary)' }}>
                      {getScheduleLabel(meeting)}
                    </td>
                    <td className="px-3 py-2.5 text-xs font-[family-name:var(--font-data)] whitespace-nowrap" style={{ color: 'var(--color-text-secondary)' }}>
                      {formatTimeDisplay(meeting.time_of_day)}
                    </td>
                    <td className="px-3 py-2.5 text-xs font-[family-name:var(--font-data)]" style={{ color: 'var(--color-text-secondary)' }}>
                      {meeting.duration_minutes}m
                    </td>
                    <td className="px-3 py-2.5">
                      <button
                        onClick={() => handleToggleActive(meeting.id, meeting.is_active)}
                        className="h-6 px-2 rounded text-[10px] cursor-pointer border"
                        style={{
                          borderColor: meeting.is_active ? 'var(--color-status-green)' : 'var(--color-border)',
                          backgroundColor: meeting.is_active ? 'color-mix(in srgb, var(--color-status-green) 10%, transparent)' : 'transparent',
                          color: meeting.is_active ? 'var(--color-status-green)' : 'var(--color-text-tertiary)',
                        }}
                      >
                        {meeting.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1">
                        <button
                          onClick={() => navigate(`/schedule/${meeting.id}/edit`)}
                          className="h-6 px-2 rounded text-[10px] cursor-pointer border"
                          style={{ borderColor: 'var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text-secondary)' }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(meeting.id, meeting.name)}
                          className="h-6 px-2 rounded text-[10px] cursor-pointer border"
                          style={{ borderColor: 'var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-status-red)' }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {meetings.map(meeting => (
              <div
                key={meeting.id}
                className="p-4 rounded-lg border"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderColor: 'var(--color-border)',
                  opacity: meeting.is_active ? 1 : 0.6,
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 truncate flex-1">
                    <span className="font-medium text-sm truncate">{meeting.name}</span>
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded-full shrink-0"
                      style={{ backgroundColor: 'color-mix(in srgb, var(--color-accent) 15%, transparent)', color: 'var(--color-accent)' }}
                    >
                      {RECURRENCE_LABELS[meeting.recurrence]}
                    </span>
                  </div>
                  <button
                    onClick={() => handleToggleActive(meeting.id, meeting.is_active)}
                    className="h-6 px-2 rounded text-[10px] cursor-pointer border shrink-0 ml-2"
                    style={{
                      borderColor: meeting.is_active ? 'var(--color-status-green)' : 'var(--color-border)',
                      backgroundColor: meeting.is_active ? 'color-mix(in srgb, var(--color-status-green) 10%, transparent)' : 'transparent',
                      color: meeting.is_active ? 'var(--color-status-green)' : 'var(--color-text-tertiary)',
                    }}
                  >
                    {meeting.is_active ? 'Active' : 'Inactive'}
                  </button>
                </div>
                <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  <span className="font-[family-name:var(--font-data)]">{getScheduleLabel(meeting)}</span>
                  <span>&middot;</span>
                  <span className="font-[family-name:var(--font-data)]">{formatTimeDisplay(meeting.time_of_day)}</span>
                  <span>&middot;</span>
                  <span className="font-[family-name:var(--font-data)]">{meeting.duration_minutes}m</span>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => navigate(`/schedule/${meeting.id}/edit`)}
                    className="h-7 px-3 rounded text-xs cursor-pointer border"
                    style={{ borderColor: 'var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text-secondary)' }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(meeting.id, meeting.name)}
                    className="h-7 px-3 rounded text-xs cursor-pointer border"
                    style={{ borderColor: 'var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-status-red)' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
