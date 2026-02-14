import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useState, useEffect, type FormEvent } from 'react'
import { useIssue, useCreateIssue, useUpdateIssue } from '@/hooks/useIssues'
import { useObjects } from '@/hooks/useObjects'
import { SearchableSelect } from '@/components/SearchableSelect'
import { LIFECYCLE_STAGES, STAGE_LABELS } from '@/types/database'
import { ISSUE_TYPE_LABELS, ISSUE_STATUS_LABELS, NEXT_ACTION_LABELS } from '@/lib/constants'
import type { LifecycleStage, IssueType, IssueStatus, NextAction } from '@/types/database'

export function IssueFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isEdit = !!id
  const copyFromId = searchParams.get('copy_from') || undefined
  const { data: existing } = useIssue(id)
  const { data: copySource } = useIssue(copyFromId)
  const { data: objects } = useObjects({ is_archived: 'false' })
  const createIssue = useCreateIssue()
  const updateIssue = useUpdateIssue()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [objectId, setObjectId] = useState(searchParams.get('object_id') || '')
  const [lifecycleStage, setLifecycleStage] = useState<LifecycleStage>(
    (searchParams.get('lifecycle_stage') as LifecycleStage) || 'requirements'
  )
  const [issueType, setIssueType] = useState<IssueType>('clarification')
  const [status, setStatus] = useState<IssueStatus>('open')
  const [ownerAlias, setOwnerAlias] = useState('')
  const [raisedByAlias, setRaisedByAlias] = useState('')
  const [blockedByObjectId, setBlockedByObjectId] = useState('')
  const [blockedByNote, setBlockedByNote] = useState('')
  const [nextAction, setNextAction] = useState<NextAction | ''>('')
  const [linkedObjectIds, setLinkedObjectIds] = useState<string[]>([])
  const [error, setError] = useState('')

  const toggleLinkedObject = (oid: string) => {
    setLinkedObjectIds(prev =>
      prev.includes(oid) ? prev.filter(x => x !== oid) : [...prev, oid]
    )
  }

  useEffect(() => {
    if (existing) {
      setTitle(existing.title)
      setDescription(existing.description || '')
      setObjectId(existing.object_id)
      setLifecycleStage(existing.lifecycle_stage)
      setIssueType(existing.issue_type)
      setStatus(existing.status)
      setOwnerAlias(existing.owner_alias || '')
      setRaisedByAlias(existing.raised_by_alias || '')
      setBlockedByObjectId(existing.blocked_by_object_id || '')
      setBlockedByNote(existing.blocked_by_note || '')
      setNextAction(existing.next_action || '')
      setLinkedObjectIds(existing.linked_object_ids || [])
    }
  }, [existing])

  // Pre-fill from source issue when duplicating
  useEffect(() => {
    if (copySource && !isEdit) {
      setTitle(`Copy of ${copySource.title}`)
      setDescription(copySource.description || '')
      setObjectId(copySource.object_id)
      setLifecycleStage(copySource.lifecycle_stage)
      setIssueType(copySource.issue_type)
      setStatus('open')
      setOwnerAlias(copySource.owner_alias || '')
      setRaisedByAlias(copySource.raised_by_alias || '')
      setBlockedByObjectId(copySource.blocked_by_object_id || '')
      setBlockedByNote(copySource.blocked_by_note || '')
      setNextAction(copySource.next_action || '')
      setLinkedObjectIds(copySource.linked_object_ids || [])
    }
  }, [copySource, isEdit])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    const payload = {
      title,
      description: description || null,
      object_id: objectId,
      lifecycle_stage: lifecycleStage,
      issue_type: issueType,
      status,
      owner_alias: ownerAlias || null,
      raised_by_alias: raisedByAlias || null,
      blocked_by_object_id: blockedByObjectId || null,
      blocked_by_note: blockedByNote || null,
      next_action: (nextAction as NextAction) || null,
      linked_object_ids: linkedObjectIds,
      decision: null,
      resolved_at: null,
    }

    try {
      if (isEdit) {
        await updateIssue.mutateAsync({ id, ...payload })
        navigate(`/issues/${id}`)
      } else {
        const result = await createIssue.mutateAsync(payload)
        navigate(`/issues/${result.id}`)
      }
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl">
      <button
        onClick={() => navigate(isEdit ? `/issues/${id}` : '/issues')}
        className="text-xs cursor-pointer border-none bg-transparent mb-4"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        &larr; Back
      </button>

      <h1 className="text-lg font-bold mb-6">{isEdit ? 'Edit Issue' : copyFromId ? 'Duplicate Issue' : 'Log Issue'}</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Title *">
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            placeholder="What's the issue?"
            className="w-full h-10 px-3 rounded-lg text-sm border outline-none"
            style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
          />
        </Field>

        <Field label="Description">
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-lg text-sm border outline-none resize-y"
            style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Object *">
            <SearchableSelect
              options={(objects || []).map(o => ({ value: o.id, label: o.name }))}
              value={objectId}
              onChange={setObjectId}
              placeholder="Select object..."
              required
            />
          </Field>

          <Field label="Lifecycle Stage *">
            <select
              value={lifecycleStage}
              onChange={e => setLifecycleStage(e.target.value as LifecycleStage)}
              className="w-full h-10 px-3 rounded-lg text-sm border outline-none cursor-pointer"
              style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            >
              {LIFECYCLE_STAGES.map(s => (
                <option key={s} value={s}>{STAGE_LABELS[s]}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Also Linked To (optional)">
          <div className="flex flex-wrap gap-1.5">
            {(objects || [])
              .filter(o => o.id !== objectId)
              .map(obj => (
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
            {(objects || []).filter(o => o.id !== objectId).length === 0 && (
              <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>No other objects available</span>
            )}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Issue Type *">
            <select
              value={issueType}
              onChange={e => setIssueType(e.target.value as IssueType)}
              className="w-full h-10 px-3 rounded-lg text-sm border outline-none cursor-pointer"
              style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            >
              {Object.entries(ISSUE_TYPE_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </Field>

          <Field label="Status *">
            <select
              value={status}
              onChange={e => setStatus(e.target.value as IssueStatus)}
              className="w-full h-10 px-3 rounded-lg text-sm border outline-none cursor-pointer"
              style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            >
              {Object.entries(ISSUE_STATUS_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Next Action">
          <select
            value={nextAction}
            onChange={e => setNextAction(e.target.value as NextAction | '')}
            className="w-full h-10 px-3 rounded-lg text-sm border outline-none cursor-pointer"
            style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
          >
            <option value="">None</option>
            {Object.entries(NEXT_ACTION_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Owner">
            <input
              type="text"
              value={ownerAlias}
              onChange={e => setOwnerAlias(e.target.value)}
              placeholder="LEAD-DNA-01"
              className="w-full h-10 px-3 rounded-lg text-sm border outline-none font-[family-name:var(--font-data)]"
              style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            />
          </Field>
          <Field label="Raised By">
            <input
              type="text"
              value={raisedByAlias}
              onChange={e => setRaisedByAlias(e.target.value)}
              placeholder="SME-BIZ-DP-01"
              className="w-full h-10 px-3 rounded-lg text-sm border outline-none font-[family-name:var(--font-data)]"
              style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            />
          </Field>
        </div>

        <Field label="Blocked By Object">
          <SearchableSelect
            options={(objects || []).filter(o => o.id !== objectId).map(o => ({ value: o.id, label: o.name }))}
            value={blockedByObjectId}
            onChange={setBlockedByObjectId}
            placeholder="Select blocking object..."
            emptyLabel="None"
          />
        </Field>

        <Field label="Blocked By Note">
          <input
            type="text"
            value={blockedByNote}
            onChange={e => setBlockedByNote(e.target.value)}
            placeholder="Waiting for X from Y"
            className="w-full h-10 px-3 rounded-lg text-sm border outline-none"
            style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
          />
        </Field>

        {error && <p className="text-xs" style={{ color: 'var(--color-status-red)' }}>{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={createIssue.isPending || updateIssue.isPending}
            className="h-10 px-6 rounded-lg text-sm font-medium cursor-pointer border-none disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
          >
            {isEdit ? 'Save Changes' : 'Log Issue'}
          </button>
          <button
            type="button"
            onClick={() => navigate(isEdit ? `/issues/${id}` : '/issues')}
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
