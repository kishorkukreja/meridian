import { useNavigate } from 'react-router-dom'
import { useIssues } from '@/hooks/useIssues'
import { useFilters } from '@/hooks/useFilters'
import { StatusBadge } from '@/components/StatusBadge'
import { AgingBadge } from '@/components/AgingBadge'
import { FilterBar } from '@/components/FilterBar'
import { SummaryBar } from '@/components/SummaryBar'
import { EmptyState } from '@/components/EmptyState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { ISSUE_TYPE_LABELS } from '@/lib/constants'
import { STAGE_LABELS } from '@/types/database'

export function IssueListPage() {
  const navigate = useNavigate()
  const { filters, setFilter, clearFilters, activeFilterCount } = useFilters()
  const { data: issues, isLoading, error } = useIssues(filters)

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Issues</h1>
        <button
          onClick={() => navigate('/issues/new')}
          className="h-8 px-4 rounded-lg text-sm font-medium cursor-pointer border-none"
          style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
        >
          + New Issue
        </button>
      </div>

      <FilterBar
        type="issues"
        filters={filters}
        onFilterChange={setFilter}
        onClear={clearFilters}
        activeCount={activeFilterCount}
      />

      {issues && issues.length > 0 && <SummaryBar type="issues" data={issues} />}

      {isLoading && <LoadingSkeleton />}
      {error && <p className="text-sm" style={{ color: 'var(--color-status-red)' }}>Failed to load issues.</p>}
      {issues && issues.length === 0 && (
        <EmptyState
          message="No issues found. Everything is moving."
          actionLabel="Log an Issue"
          onAction={() => navigate('/issues/new')}
        />
      )}

      {issues && issues.length > 0 && (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                  {['Title', 'Object', 'Type', 'Stage', 'Status', 'Owner', 'Age'].map(col => (
                    <th key={col} className="text-left px-3 py-2.5 text-xs font-medium whitespace-nowrap" style={{ color: 'var(--color-text-secondary)' }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {issues.map((issue, i) => (
                  <tr
                    key={issue.id}
                    onClick={() => navigate(`/issues/${issue.id}`)}
                    className="cursor-pointer transition-colors duration-150"
                    style={{ backgroundColor: i % 2 === 0 ? 'var(--color-bg-primary)' : 'var(--color-bg-secondary)' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = i % 2 === 0 ? 'var(--color-bg-primary)' : 'var(--color-bg-secondary)')}
                  >
                    <td className="px-3 py-2.5 text-xs font-medium max-w-[200px] truncate">{issue.title}</td>
                    <td className="px-3 py-2.5 text-xs font-[family-name:var(--font-data)]" style={{ color: 'var(--color-text-secondary)' }}>
                      {issue.object_name}
                    </td>
                    <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      {ISSUE_TYPE_LABELS[issue.issue_type]}
                    </td>
                    <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      {STAGE_LABELS[issue.lifecycle_stage]}
                    </td>
                    <td className="px-3 py-2.5"><StatusBadge status={issue.status} type="issue" /></td>
                    <td className="px-3 py-2.5 text-xs font-[family-name:var(--font-data)]" style={{ color: 'var(--color-text-secondary)' }}>
                      {issue.owner_alias || '-'}
                    </td>
                    <td className="px-3 py-2.5"><AgingBadge days={issue.age_days} type="issue" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {issues.map(issue => (
              <div
                key={issue.id}
                onClick={() => navigate(`/issues/${issue.id}`)}
                className="p-4 rounded-lg border cursor-pointer"
                style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="font-medium text-sm truncate flex-1">{issue.title}</span>
                  <StatusBadge status={issue.status} type="issue" />
                </div>
                <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  <span className="font-[family-name:var(--font-data)]">{issue.object_name}</span>
                  <span>&middot;</span>
                  <span>{ISSUE_TYPE_LABELS[issue.issue_type]}</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <AgingBadge days={issue.age_days} type="issue" />
                  {issue.owner_alias && (
                    <span className="text-[10px] font-[family-name:var(--font-data)]" style={{ color: 'var(--color-text-tertiary)' }}>
                      {issue.owner_alias}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
