import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useObject, useObjectIssues, useStageHistory, useUpdateObject } from '@/hooks/useObjects'
import { StatusBadge } from '@/components/StatusBadge'
import { AgingBadge } from '@/components/AgingBadge'
import { LifecycleStepper } from '@/components/LifecycleStepper'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { MODULE_LABELS, CATEGORY_LABELS, SOURCE_SYSTEM_LABELS, REGION_LABELS, ISSUE_TYPE_LABELS } from '@/lib/constants'
import { LIFECYCLE_STAGES, STAGE_LABELS } from '@/types/database'
import type { LifecycleStage } from '@/types/database'

export function ObjectDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: object, isLoading } = useObject(id)
  const { data: issues } = useObjectIssues(id)
  const { data: stageHistory } = useStageHistory(id)
  const updateObject = useUpdateObject()
  const [showHistory, setShowHistory] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'advance' | 'regress' | null>(null)

  if (isLoading) return <LoadingSkeleton type="detail" />
  if (!object) return <p className="p-6 text-sm" style={{ color: 'var(--color-status-red)' }}>Object not found.</p>

  const currentIdx = LIFECYCLE_STAGES.indexOf(object.current_stage)
  const canAdvance = currentIdx < LIFECYCLE_STAGES.length - 1
  const canRegress = currentIdx > 0

  const handleStageChange = (direction: 'advance' | 'regress') => {
    const newIdx = direction === 'advance' ? currentIdx + 1 : currentIdx - 1
    const newStage = LIFECYCLE_STAGES[newIdx] as LifecycleStage
    updateObject.mutate({ id: object.id, current_stage: newStage })
    setConfirmAction(null)
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl">
      {/* Back + Header */}
      <button
        onClick={() => navigate('/objects')}
        className="text-xs cursor-pointer border-none bg-transparent"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        &larr; Back to Objects
      </button>

      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-bold font-[family-name:var(--font-data)]">{object.name}</h1>
            <StatusBadge status={object.status} />
          </div>
          {object.description && (
            <p className="text-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>{object.description}</p>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            <span>{MODULE_LABELS[object.module]}</span>
            <span>{CATEGORY_LABELS[object.category]}</span>
            <span>{REGION_LABELS[object.region]}</span>
            <span>{SOURCE_SYSTEM_LABELS[object.source_system]}</span>
            {object.owner_alias && <span>Owner: <span className="font-[family-name:var(--font-data)]">{object.owner_alias}</span></span>}
            {object.team_alias && <span>Team: <span className="font-[family-name:var(--font-data)]">{object.team_alias}</span></span>}
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          <AgingBadge days={object.aging_days} />
          <button
            onClick={() => navigate(`/objects/${id}/edit`)}
            className="h-8 px-3 rounded text-xs cursor-pointer border"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text-secondary)' }}
          >
            Edit
          </button>
        </div>
      </div>

      {/* Lifecycle Stepper */}
      <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">Lifecycle Progress</h2>
          <span className="text-xs font-[family-name:var(--font-data)]" style={{ color: 'var(--color-text-secondary)' }}>
            {object.progress_percent}%
          </span>
        </div>

        <LifecycleStepper currentStage={object.current_stage} stageHistory={stageHistory} />

        <div className="flex gap-2 mt-4">
          {canRegress && (
            <button
              onClick={() => setConfirmAction('regress')}
              className="h-8 px-3 rounded text-xs cursor-pointer border"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text-secondary)' }}
            >
              &larr; Previous Stage
            </button>
          )}
          {canAdvance && (
            <button
              onClick={() => setConfirmAction('advance')}
              className="h-8 px-4 rounded text-xs font-medium cursor-pointer border-none"
              style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
            >
              Advance to {STAGE_LABELS[LIFECYCLE_STAGES[currentIdx + 1]]} &rarr;
            </button>
          )}
        </div>

        {/* Confirm Dialog */}
        {confirmAction && (
          <div className="mt-3 p-3 rounded border flex items-center justify-between" style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)' }}>
            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {confirmAction === 'advance'
                ? `Move to ${STAGE_LABELS[LIFECYCLE_STAGES[currentIdx + 1]]}?`
                : `Go back to ${STAGE_LABELS[LIFECYCLE_STAGES[currentIdx - 1]]}?`
              }
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmAction(null)}
                className="h-7 px-3 rounded text-xs cursor-pointer border-none"
                style={{ backgroundColor: 'transparent', color: 'var(--color-text-secondary)' }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleStageChange(confirmAction)}
                className="h-7 px-3 rounded text-xs font-medium cursor-pointer border-none"
                style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
              >
                Confirm
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Linked Issues */}
      <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">
            Linked Issues {issues && issues.length > 0 && <span style={{ color: 'var(--color-text-tertiary)' }}>({issues.length})</span>}
          </h2>
          <button
            onClick={() => navigate(`/issues/new?object_id=${id}&lifecycle_stage=${object.current_stage}`)}
            className="h-7 px-3 rounded text-xs cursor-pointer border-none"
            style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
          >
            + Add Issue
          </button>
        </div>

        {(!issues || issues.length === 0) ? (
          <p className="text-xs py-4 text-center" style={{ color: 'var(--color-text-tertiary)' }}>No issues linked to this object.</p>
        ) : (
          <div className="space-y-2">
            {issues.map(issue => (
              <div
                key={issue.id}
                onClick={() => navigate(`/issues/${issue.id}`)}
                className="flex items-center justify-between p-2.5 rounded cursor-pointer transition-colors duration-150"
                style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
              >
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium truncate block">{issue.title}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
                      {ISSUE_TYPE_LABELS[issue.issue_type]} &middot; {STAGE_LABELS[issue.lifecycle_stage]}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {issue.owner_alias && (
                    <span className="text-[10px] font-[family-name:var(--font-data)]" style={{ color: 'var(--color-text-tertiary)' }}>
                      {issue.owner_alias}
                    </span>
                  )}
                  <StatusBadge status={issue.status} type="issue" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stage History */}
      <div className="rounded-lg border" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full flex items-center justify-between p-4 cursor-pointer border-none bg-transparent text-left"
          style={{ color: 'var(--color-text-primary)' }}
        >
          <h2 className="text-sm font-semibold">Stage History</h2>
          <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{showHistory ? '▲' : '▼'}</span>
        </button>

        {showHistory && stageHistory && (
          <div className="px-4 pb-4 space-y-2">
            {stageHistory.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>No transitions yet.</p>
            ) : (
              stageHistory.map(entry => (
                <div key={entry.id} className="flex items-center gap-3 text-xs">
                  <span className="font-[family-name:var(--font-data)]" style={{ color: 'var(--color-text-tertiary)' }}>
                    {new Date(entry.transitioned_at).toLocaleDateString()}
                  </span>
                  <span style={{ color: 'var(--color-text-secondary)' }}>
                    {STAGE_LABELS[entry.from_stage]} &rarr; {STAGE_LABELS[entry.to_stage]}
                  </span>
                  {entry.note && <span style={{ color: 'var(--color-text-tertiary)' }}>{entry.note}</span>}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Notes */}
      {object.notes && (
        <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
          <h2 className="text-sm font-semibold mb-2">Notes</h2>
          <p className="text-xs whitespace-pre-wrap" style={{ color: 'var(--color-text-secondary)' }}>
            {object.notes}
          </p>
        </div>
      )}
    </div>
  )
}
