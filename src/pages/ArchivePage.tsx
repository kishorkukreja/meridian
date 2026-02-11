import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useObjects, useUpdateObject } from '@/hooks/useObjects'
import { useIssues, useUpdateIssue } from '@/hooks/useIssues'
import { StatusBadge } from '@/components/StatusBadge'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { EmptyState } from '@/components/EmptyState'
import { MODULE_LABELS, CATEGORY_LABELS, ISSUE_TYPE_LABELS } from '@/lib/constants'

export function ArchivePage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<'objects' | 'issues'>('objects')
  const { data: archivedObjects, isLoading: loadingObjects } = useObjects({ is_archived: 'true' })
  const { data: archivedIssues, isLoading: loadingIssues } = useIssues({ is_archived: 'true', status: 'open,in_progress,blocked,resolved,closed' })
  const updateObject = useUpdateObject()
  const updateIssue = useUpdateIssue()

  const handleRestoreObject = (id: string) => {
    updateObject.mutate({ id, is_archived: false, status: 'on_track' })
  }

  const handleRestoreIssue = (id: string) => {
    updateIssue.mutate({ id, is_archived: false, status: 'open' })
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="text-lg font-bold">Archive</h1>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
        {(['objects', 'issues'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="h-8 px-4 rounded text-sm capitalize cursor-pointer border-none"
            style={{
              backgroundColor: tab === t ? 'var(--color-bg-tertiary)' : 'transparent',
              color: tab === t ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Objects Tab */}
      {tab === 'objects' && (
        <>
          {loadingObjects && <LoadingSkeleton />}
          {archivedObjects && archivedObjects.length === 0 && (
            <EmptyState message="No archived objects." />
          )}
          {archivedObjects && archivedObjects.length > 0 && (
            <div className="space-y-2">
              {archivedObjects.map(obj => (
                <div
                  key={obj.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                  style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}
                >
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => navigate(`/objects/${obj.id}`)}
                  >
                    <span className="text-sm font-medium font-[family-name:var(--font-data)]">{obj.name}</span>
                    <div className="flex items-center gap-2 text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                      <span>{MODULE_LABELS[obj.module]}</span>
                      <span>{CATEGORY_LABELS[obj.category]}</span>
                      <StatusBadge status={obj.status} />
                    </div>
                  </div>
                  <button
                    onClick={() => handleRestoreObject(obj.id)}
                    className="h-7 px-3 rounded text-xs cursor-pointer border"
                    style={{ borderColor: 'var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text-secondary)' }}
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Issues Tab */}
      {tab === 'issues' && (
        <>
          {loadingIssues && <LoadingSkeleton />}
          {archivedIssues && archivedIssues.length === 0 && (
            <EmptyState message="No archived issues." />
          )}
          {archivedIssues && archivedIssues.length > 0 && (
            <div className="space-y-2">
              {archivedIssues.map(issue => (
                <div
                  key={issue.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                  style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}
                >
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => navigate(`/issues/${issue.id}`)}
                  >
                    <span className="text-sm font-medium">{issue.title}</span>
                    <div className="flex items-center gap-2 text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                      <span className="font-[family-name:var(--font-data)]">{issue.object_name}</span>
                      <span>{ISSUE_TYPE_LABELS[issue.issue_type]}</span>
                      <StatusBadge status={issue.status} type="issue" />
                    </div>
                  </div>
                  <button
                    onClick={() => handleRestoreIssue(issue.id)}
                    className="h-7 px-3 rounded text-xs cursor-pointer border"
                    style={{ borderColor: 'var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text-secondary)' }}
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
