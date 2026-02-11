import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMeetings } from '@/hooks/useMeetings'
import { EmptyState } from '@/components/EmptyState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'

export function MeetingListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const { data: meetings, isLoading, error } = useMeetings(search || undefined)

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Meetings</h1>
        <button
          onClick={() => navigate('/meetings/new')}
          className="h-8 px-4 rounded-lg text-sm font-medium cursor-pointer border-none"
          style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
        >
          + New Meeting
        </button>
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search meetings..."
        className="w-full md:w-80 h-9 px-3 rounded-lg text-sm border outline-none"
        style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
      />

      {isLoading && <LoadingSkeleton />}
      {error && <p className="text-sm" style={{ color: 'var(--color-status-red)' }}>Failed to load meetings.</p>}
      {meetings && meetings.length === 0 && (
        <EmptyState
          message="No meetings yet. Generate your first meeting minutes."
          actionLabel="New Meeting"
          onAction={() => navigate('/meetings/new')}
        />
      )}

      {meetings && meetings.length > 0 && (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                  {['Title', 'Type', 'Date', 'TLDR', 'Linked', 'Created'].map(col => (
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
                    onClick={() => navigate(`/meetings/${meeting.id}`)}
                    className="cursor-pointer transition-colors duration-150"
                    style={{ backgroundColor: i % 2 === 0 ? 'var(--color-bg-primary)' : 'var(--color-bg-secondary)' }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)' }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = i % 2 === 0 ? 'var(--color-bg-primary)' : 'var(--color-bg-secondary)' }}
                  >
                    <td className="px-3 py-2.5 text-xs font-medium max-w-[200px] truncate">{meeting.title}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap"
                        style={{
                          backgroundColor: meeting.meeting_type === 'quick_summary'
                            ? 'color-mix(in srgb, var(--color-status-amber) 15%, transparent)'
                            : 'color-mix(in srgb, var(--color-accent) 15%, transparent)',
                          color: meeting.meeting_type === 'quick_summary' ? 'var(--color-status-amber)' : 'var(--color-accent)',
                        }}
                      >
                        {meeting.meeting_type === 'quick_summary' ? 'Summary' : 'MoM'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs font-[family-name:var(--font-data)] whitespace-nowrap" style={{ color: 'var(--color-text-secondary)' }}>
                      {new Date(meeting.meeting_date).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2.5 text-xs max-w-[300px] truncate" style={{ color: 'var(--color-text-secondary)' }}>
                      {meeting.tldr || '-'}
                    </td>
                    <td className="px-3 py-2.5 text-xs font-[family-name:var(--font-data)]" style={{ color: 'var(--color-text-secondary)' }}>
                      {meeting.linked_object_ids.length + meeting.linked_issue_ids.length || '-'}
                    </td>
                    <td className="px-3 py-2.5 text-xs font-[family-name:var(--font-data)] whitespace-nowrap" style={{ color: 'var(--color-text-tertiary)' }}>
                      {new Date(meeting.created_at).toLocaleDateString()}
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
                onClick={() => navigate(`/meetings/${meeting.id}`)}
                className="p-4 rounded-lg border cursor-pointer"
                style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2 truncate flex-1">
                    <span className="font-medium text-sm truncate">{meeting.title}</span>
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: meeting.meeting_type === 'quick_summary'
                          ? 'color-mix(in srgb, var(--color-status-amber) 15%, transparent)'
                          : 'color-mix(in srgb, var(--color-accent) 15%, transparent)',
                        color: meeting.meeting_type === 'quick_summary' ? 'var(--color-status-amber)' : 'var(--color-accent)',
                      }}
                    >
                      {meeting.meeting_type === 'quick_summary' ? 'Summary' : 'MoM'}
                    </span>
                  </div>
                  <span className="text-[10px] font-[family-name:var(--font-data)] shrink-0 ml-2" style={{ color: 'var(--color-text-tertiary)' }}>
                    {new Date(meeting.meeting_date).toLocaleDateString()}
                  </span>
                </div>
                {meeting.tldr && (
                  <p className="text-xs line-clamp-2 mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                    {meeting.tldr}
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
