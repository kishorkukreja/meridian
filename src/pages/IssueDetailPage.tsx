import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useIssue, useUpdateIssue } from '@/hooks/useIssues'
import { StatusBadge } from '@/components/StatusBadge'
import { AgingBadge } from '@/components/AgingBadge'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { ISSUE_TYPE_LABELS, ISSUE_STATUS_LABELS } from '@/lib/constants'
import { STAGE_LABELS } from '@/types/database'
import type { IssueStatus } from '@/types/database'

export function IssueDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: issue, isLoading } = useIssue(id)
  const updateIssue = useUpdateIssue()
  const [showDecisionModal, setShowDecisionModal] = useState(false)
  const [decisionText, setDecisionText] = useState('')
  const [pendingStatus, setPendingStatus] = useState<IssueStatus | null>(null)

  if (isLoading) return <LoadingSkeleton type="detail" />
  if (!issue) return <p className="p-6 text-sm" style={{ color: 'var(--color-status-red)' }}>Issue not found.</p>

  const handleStatusChange = (newStatus: IssueStatus) => {
    if (newStatus === 'resolved' || newStatus === 'closed') {
      setPendingStatus(newStatus)
      setDecisionText(issue.decision || '')
      setShowDecisionModal(true)
    } else {
      updateIssue.mutate({ id: issue.id, status: newStatus })
    }
  }

  const handleDecisionSubmit = () => {
    if (!decisionText.trim()) return
    updateIssue.mutate({
      id: issue.id,
      status: pendingStatus!,
      decision: decisionText,
      resolved_at: new Date().toISOString(),
    })
    setShowDecisionModal(false)
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl">
      <button
        onClick={() => navigate('/issues')}
        className="text-xs cursor-pointer border-none bg-transparent"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        &larr; Back to Issues
      </button>

      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-4 mb-2">
          <h1 className="text-xl font-bold">{issue.title}</h1>
          <div className="flex items-center gap-2 shrink-0">
            <AgingBadge days={issue.age_days} type="issue" />
            <StatusBadge status={issue.status} type="issue" />
          </div>
        </div>
        {issue.description && (
          <p className="text-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>{issue.description}</p>
        )}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          <span>Type: {ISSUE_TYPE_LABELS[issue.issue_type]}</span>
          <span>Stage: {STAGE_LABELS[issue.lifecycle_stage]}</span>
          {issue.owner_alias && <span>Owner: <span className="font-[family-name:var(--font-data)]">{issue.owner_alias}</span></span>}
          {issue.raised_by_alias && <span>Raised by: <span className="font-[family-name:var(--font-data)]">{issue.raised_by_alias}</span></span>}
          <span>Created: {new Date(issue.created_at).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Parent Object */}
      <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
        <h2 className="text-sm font-semibold mb-2">Parent Object</h2>
        <button
          onClick={() => navigate(`/objects/${issue.object_id}`)}
          className="text-sm cursor-pointer border-none bg-transparent font-[family-name:var(--font-data)]"
          style={{ color: 'var(--color-accent)' }}
        >
          {issue.object_name}
        </button>
      </div>

      {/* Dependencies */}
      {(issue.blocked_by_object_id || issue.blocked_by_note) && (
        <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
          <h2 className="text-sm font-semibold mb-2">Dependencies</h2>
          {issue.blocked_by_object_id && (
            <button
              onClick={() => navigate(`/objects/${issue.blocked_by_object_id}`)}
              className="text-sm cursor-pointer border-none bg-transparent"
              style={{ color: 'var(--color-accent)' }}
            >
              View blocking object
            </button>
          )}
          {issue.blocked_by_note && (
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>{issue.blocked_by_note}</p>
          )}
        </div>
      )}

      {/* Status Change */}
      <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
        <h2 className="text-sm font-semibold mb-3">Change Status</h2>
        <div className="flex flex-wrap gap-2">
          {(Object.entries(ISSUE_STATUS_LABELS) as [IssueStatus, string][]).map(([statusVal, label]) => (
            <button
              key={statusVal}
              onClick={() => handleStatusChange(statusVal)}
              disabled={statusVal === issue.status}
              className="h-8 px-3 rounded text-xs cursor-pointer border disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                borderColor: statusVal === issue.status ? 'var(--color-accent)' : 'var(--color-border)',
                backgroundColor: statusVal === issue.status ? 'var(--color-bg-tertiary)' : 'transparent',
                color: statusVal === issue.status ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Decision (shown when resolved/closed) */}
      {issue.decision && (
        <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
          <h2 className="text-sm font-semibold mb-2">Decision</h2>
          <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--color-text-primary)' }}>{issue.decision}</p>
          {issue.resolved_at && (
            <p className="text-[10px] mt-2" style={{ color: 'var(--color-text-tertiary)' }}>
              Resolved: {new Date(issue.resolved_at).toLocaleDateString()}
            </p>
          )}
        </div>
      )}

      {/* Edit button */}
      <button
        onClick={() => navigate(`/issues/${id}/edit`)}
        className="h-8 px-4 rounded text-xs cursor-pointer border"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text-secondary)' }}
      >
        Edit Issue
      </button>

      {/* Decision Modal */}
      {showDecisionModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 px-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-md p-6 rounded-xl border" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
            <h2 className="text-base font-bold mb-1">Record Decision</h2>
            <p className="text-xs mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              A decision is required when resolving or closing an issue.
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
                onClick={() => setShowDecisionModal(false)}
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
                Save & {pendingStatus === 'resolved' ? 'Resolve' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
