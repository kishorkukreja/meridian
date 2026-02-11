import { useState, useMemo } from 'react'
import { useObjects, useCreateObject, useObjectNames } from '@/hooks/useObjects'
import { useCreateIssue } from '@/hooks/useIssues'
import { useUpdateMeeting } from '@/hooks/useMeetings'
import { computeNextCode } from '@/lib/objectUtils'
import { MODULE_LABELS, CATEGORY_LABELS, LIFECYCLE_STAGES, STAGE_LABELS, MODULE_CATEGORIES } from '@/types/database'
import { STATUS_LABELS, SOURCE_SYSTEM_LABELS, REGION_LABELS, ISSUE_TYPE_LABELS, ISSUE_STATUS_LABELS } from '@/lib/constants'
import type { NextStep, ModuleType, ObjectCategory, LifecycleStage, ObjectStatus, RegionType, SourceSystem, IssueType, IssueStatus } from '@/types/database'

type Props = {
  nextSteps: NextStep[]
  meetingId: string
  existingLinkedIssueIds: string[]
  onClose: () => void
  onComplete: () => void
}

type IssueEntry = {
  title: string
  owner: string
}

export function ConvertToIssueDialog({ nextSteps, meetingId, existingLinkedIssueIds, onClose, onComplete }: Props) {
  const { data: objects } = useObjects({ is_archived: 'false' })
  const { data: existingNames } = useObjectNames()
  const createObject = useCreateObject()
  const createIssue = useCreateIssue()
  const updateMeeting = useUpdateMeeting()

  // Step tracking
  const [step, setStep] = useState<1 | 2>(1)

  // Step 1: Object selection
  const [selectedObjectId, setSelectedObjectId] = useState('')
  const [selectedObjectName, setSelectedObjectName] = useState('')
  const [showCreateObject, setShowCreateObject] = useState(false)

  // Inline object creation fields
  const [objModule, setObjModule] = useState<ModuleType>('demand_planning')
  const [objCategory, setObjCategory] = useState<ObjectCategory>('master_data')
  const [objRegion, setObjRegion] = useState<RegionType>('region_eu')
  const [objSourceSystem, setObjSourceSystem] = useState<SourceSystem>('erp_primary')
  const [objStage, setObjStage] = useState<LifecycleStage>('requirements')
  const [objStatus, setObjStatus] = useState<ObjectStatus>('on_track')

  // Step 2: Issue configuration
  const [issueType, setIssueType] = useState<IssueType>('clarification')
  const [lifecycleStage, setLifecycleStage] = useState<LifecycleStage>('requirements')
  const [issueStatus, setIssueStatus] = useState<IssueStatus>('open')
  const [entries, setEntries] = useState<IssueEntry[]>(
    nextSteps.map(s => ({ title: s.action, owner: s.owner }))
  )

  // Progress
  const [creating, setCreating] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [error, setError] = useState('')

  const availableCategories = MODULE_CATEGORIES[objModule]

  const suggestedObjectName = useMemo(() => {
    if (!existingNames) return ''
    return computeNextCode(existingNames, objModule, objCategory)
  }, [existingNames, objModule, objCategory])

  // Fix category when module changes
  const handleModuleChange = (m: ModuleType) => {
    setObjModule(m)
    const cats = MODULE_CATEGORIES[m]
    if (!cats.includes(objCategory)) {
      setObjCategory(cats[0])
    }
  }

  const handleObjectSelect = (id: string) => {
    setSelectedObjectId(id)
    const obj = objects?.find(o => o.id === id)
    setSelectedObjectName(obj?.name || '')
    setShowCreateObject(false)
  }

  const handleCreateObjectAndProceed = async () => {
    setError('')
    try {
      const result = await createObject.mutateAsync({
        name: suggestedObjectName,
        description: null,
        module: objModule,
        category: objCategory,
        region: objRegion,
        source_system: objSourceSystem,
        current_stage: objStage,
        status: objStatus,
        owner_alias: null,
        team_alias: null,
        notes: null,
      })
      setSelectedObjectId(result.id)
      setSelectedObjectName(result.name)
      setStep(2)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const handleNext = () => {
    if (selectedObjectId) setStep(2)
  }

  const updateEntry = (index: number, field: keyof IssueEntry, value: string) => {
    setEntries(prev => prev.map((e, i) => i === index ? { ...e, [field]: value } : e))
  }

  const handleCreateIssues = async () => {
    setCreating(true)
    setError('')
    const validEntries = entries.filter(e => e.title.trim())
    const total = validEntries.length
    setProgress({ current: 0, total })

    const newIssueIds: string[] = []

    try {
      for (let i = 0; i < validEntries.length; i++) {
        const entry = validEntries[i]
        setProgress({ current: i + 1, total })
        const result = await createIssue.mutateAsync({
          object_id: selectedObjectId,
          title: entry.title,
          description: null,
          issue_type: issueType,
          lifecycle_stage: lifecycleStage,
          status: issueStatus,
          owner_alias: entry.owner || null,
          raised_by_alias: null,
          blocked_by_object_id: null,
          blocked_by_note: null,
          decision: null,
          resolved_at: null,
        })
        newIssueIds.push(result.id)

        // Incrementally link to meeting so partial failures don't orphan issues
        await updateMeeting.mutateAsync({
          id: meetingId,
          linked_issue_ids: [...existingLinkedIssueIds, ...newIssueIds],
        })
      }

      onComplete()
    } catch (err) {
      setError((err as Error).message)
      setCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 px-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div
        className="w-full max-w-lg rounded-xl border"
        style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="text-sm font-bold">
            {step === 1 ? 'Step 1: Select Object' : `Step 2: Create ${entries.length} Issue(s)`}
          </h2>
          <button
            onClick={onClose}
            className="h-7 w-7 rounded flex items-center justify-center text-xs cursor-pointer border-none bg-transparent"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            &times;
          </button>
        </div>

        <div className="p-4 space-y-4">
          {step === 1 && (
            <>
              {/* Object dropdown */}
              {!showCreateObject && (
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                    Assign to Object
                  </label>
                  <select
                    value={selectedObjectId}
                    onChange={e => handleObjectSelect(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg text-sm border outline-none cursor-pointer"
                    style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                  >
                    <option value="">Select an object...</option>
                    {objects?.map(obj => (
                      <option key={obj.id} value={obj.id}>{obj.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowCreateObject(!showCreateObject)}
                className="text-xs cursor-pointer border-none bg-transparent"
                style={{ color: 'var(--color-accent)' }}
              >
                {showCreateObject ? 'Select existing object instead' : '+ Create New Object'}
              </button>

              {/* Inline object creation */}
              {showCreateObject && (
                <div className="space-y-3 p-3 rounded-lg border" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-tertiary)' }}>
                  <div className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>New Object</div>

                  <div>
                    <label className="block text-[10px] mb-1" style={{ color: 'var(--color-text-tertiary)' }}>Name (auto-generated)</label>
                    <div
                      className="h-9 px-3 flex items-center rounded-lg text-xs border font-[family-name:var(--font-data)]"
                      style={{ backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                    >
                      {suggestedObjectName || 'Loading...'}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <MiniSelect label="Module" value={objModule} onChange={v => handleModuleChange(v as ModuleType)} options={MODULE_LABELS} />
                    <MiniSelect
                      label="Category"
                      value={objCategory}
                      onChange={v => setObjCategory(v as ObjectCategory)}
                      options={Object.fromEntries(availableCategories.map(c => [c, CATEGORY_LABELS[c]]))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <MiniSelect label="Region" value={objRegion} onChange={v => setObjRegion(v as RegionType)} options={REGION_LABELS} />
                    <MiniSelect label="Source System" value={objSourceSystem} onChange={v => setObjSourceSystem(v as SourceSystem)} options={SOURCE_SYSTEM_LABELS} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <MiniSelect
                      label="Stage"
                      value={objStage}
                      onChange={v => setObjStage(v as LifecycleStage)}
                      options={Object.fromEntries(LIFECYCLE_STAGES.map(s => [s, STAGE_LABELS[s]]))}
                    />
                    <MiniSelect label="Status" value={objStatus} onChange={v => setObjStatus(v as ObjectStatus)} options={STATUS_LABELS} />
                  </div>

                  <button
                    onClick={handleCreateObjectAndProceed}
                    disabled={createObject.isPending}
                    className="h-9 px-4 rounded-lg text-xs font-medium cursor-pointer border-none disabled:opacity-50"
                    style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
                  >
                    {createObject.isPending ? 'Creating...' : 'Create Object & Continue'}
                  </button>
                </div>
              )}

              {error && <p className="text-xs" style={{ color: 'var(--color-status-red)' }}>{error}</p>}

              {/* Next button */}
              {!showCreateObject && (
                <div className="flex justify-end gap-2 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
                  <button
                    onClick={onClose}
                    className="h-9 px-4 text-sm cursor-pointer border-none bg-transparent"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleNext}
                    disabled={!selectedObjectId}
                    className="h-9 px-5 rounded-lg text-sm font-medium cursor-pointer border-none disabled:opacity-50"
                    style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                Creating {entries.length} issue(s) under <strong style={{ color: 'var(--color-text-primary)' }}>{selectedObjectName}</strong>
              </p>

              {/* Shared defaults */}
              <div className="grid grid-cols-3 gap-2">
                <MiniSelect label="Type" value={issueType} onChange={v => setIssueType(v as IssueType)} options={ISSUE_TYPE_LABELS} />
                <MiniSelect
                  label="Stage"
                  value={lifecycleStage}
                  onChange={v => setLifecycleStage(v as LifecycleStage)}
                  options={Object.fromEntries(LIFECYCLE_STAGES.map(s => [s, STAGE_LABELS[s]]))}
                />
                <MiniSelect label="Status" value={issueStatus} onChange={v => setIssueStatus(v as IssueStatus)} options={ISSUE_STATUS_LABELS} />
              </div>

              {/* Per-item entries */}
              <div className="max-h-[50vh] overflow-y-auto space-y-2">
                {entries.map((entry, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <span className="text-[10px] w-5 shrink-0 text-right" style={{ color: 'var(--color-text-tertiary)' }}>{i + 1}.</span>
                    <input
                      value={entry.title}
                      onChange={e => updateEntry(i, 'title', e.target.value)}
                      placeholder="Issue title"
                      className="flex-1 h-8 px-2 rounded text-xs border outline-none"
                      style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                    />
                    <input
                      value={entry.owner}
                      onChange={e => updateEntry(i, 'owner', e.target.value)}
                      placeholder="Owner"
                      className="w-28 h-8 px-2 rounded text-xs border outline-none font-[family-name:var(--font-data)]"
                      style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                    />
                  </div>
                ))}
              </div>

              {error && <p className="text-xs" style={{ color: 'var(--color-status-red)' }}>{error}</p>}

              {/* Actions */}
              <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <button
                  onClick={() => setStep(1)}
                  disabled={creating}
                  className="text-xs cursor-pointer border-none bg-transparent disabled:opacity-50"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  &larr; Back
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={onClose}
                    disabled={creating}
                    className="h-9 px-4 text-sm cursor-pointer border-none bg-transparent disabled:opacity-50"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateIssues}
                    disabled={creating || entries.every(e => !e.title.trim())}
                    className="h-9 px-5 rounded-lg text-sm font-medium cursor-pointer border-none disabled:opacity-50"
                    style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
                  >
                    {creating
                      ? `Creating (${progress.current}/${progress.total})...`
                      : `Create ${entries.length} Issue(s)`}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function MiniSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: Record<string, string> }) {
  return (
    <div>
      <label className="block text-[10px] mb-1" style={{ color: 'var(--color-text-tertiary)' }}>{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full h-8 px-2 rounded text-xs border outline-none cursor-pointer"
        style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
      >
        {Object.entries(options).map(([val, lbl]) => (
          <option key={val} value={val}>{lbl}</option>
        ))}
      </select>
    </div>
  )
}
