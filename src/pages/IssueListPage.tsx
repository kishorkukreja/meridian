import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useIssues, useUpdateIssue } from '@/hooks/useIssues'
import { useFilters } from '@/hooks/useFilters'
import { AgingBadge } from '@/components/AgingBadge'
import { FilterBar } from '@/components/FilterBar'
import { SummaryBar } from '@/components/SummaryBar'
import { EmptyState } from '@/components/EmptyState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { InlineStatusSelect } from '@/components/InlineStatusSelect'
import { ViewChips } from '@/components/ViewChips'
import { ISSUE_VIEWS } from '@/lib/savedViews'
import { ISSUE_TYPE_LABELS } from '@/lib/constants'
import { STAGE_LABELS } from '@/types/database'
import type { IssueStatus } from '@/types/database'

export function IssueListPage() {
  const navigate = useNavigate()
  const { filters, setFilter, clearFilters, activeFilterCount } = useFilters()
  const { data: issues, isLoading, error } = useIssues(filters)
  const updateIssue = useUpdateIssue()

  // Decision modal state for inline resolve/close
  const [decisionModal, setDecisionModal] = useState<{ issueId: string; status: IssueStatus; existingDecision: string | null } | null>(null)
  const [decisionText, setDecisionText] = useState('')

  const handleStatusChange = (issueId: string, newStatus: string, existingDecision: string | null) => {
    if (newStatus === 'resolved' || newStatus === 'closed') {
      setDecisionModal({ issueId, status: newStatus as IssueStatus, existingDecision })
      setDecisionText(existingDecision || '')
    } else {
      updateIssue.mutate({ id: issueId, status: newStatus as IssueStatus })
    }
  }

  const handleDecisionSubmit = () => {
    if (!decisionText.trim() || !decisionModal) return
    updateIssue.mutate({
      id: decisionModal.issueId,
      status: decisionModal.status,
      decision: decisionText,
      resolved_at: new Date().toISOString(),
    })
    setDecisionModal(null)
  }

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

      {/* View Chips */}
      <ViewChips views={ISSUE_VIEWS} basePath="/issues" />

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
                    <td className="px-3 py-2.5">
                      <InlineStatusSelect
                        status={issue.status}
                        type="issue"
                        onChange={(s) => handleStatusChange(issue.id, s, issue.decision)}
                      />
                    </td>
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
                  <InlineStatusSelect
                    status={issue.status}
                    type="issue"
                    onChange={(s) => handleStatusChange(issue.id, s, issue.decision)}
                  />
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

      {/* Decision Modal */}
      {decisionModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 px-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-md p-6 rounded-xl border" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
            <h2 className="text-base font-bold mb-1">Record Decision</h2>
            <p className="text-xs mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              A decision is required when {decisionModal.status === 'resolved' ? 'resolving' : 'closing'} an issue.
            </p>
            <textarea
              value={decisionText}
              onChange={e => setDecisionText(e.target.value)}
              rows={4}
              placeholder="What was decided?"
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none resize-y mb-4"
              style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDecisionModal(null)}
                className="h-9 px-4 text-sm cursor-pointer border-none bg-transparent"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDecisionSubmit}
                disabled={!decisionText.trim()}
                className="h-9 px-4 rounded-lg text-sm font-medium cursor-pointer border-none disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
              >
                Save & {decisionModal.status === 'resolved' ? 'Resolve' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
