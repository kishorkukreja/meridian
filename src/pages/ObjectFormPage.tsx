import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect, type FormEvent } from 'react'
import { useObject, useCreateObject, useUpdateObject } from '@/hooks/useObjects'
import { LIFECYCLE_STAGES, STAGE_LABELS, MODULE_LABELS, CATEGORY_LABELS, MODULE_CATEGORIES } from '@/types/database'
import { STATUS_LABELS, SOURCE_SYSTEM_LABELS, REGION_LABELS } from '@/lib/constants'
import type { ModuleType, ObjectCategory, LifecycleStage, ObjectStatus, RegionType } from '@/types/database'
import type { SourceSystem } from '@/types/database'

export function ObjectFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id
  const { data: existing } = useObject(id)
  const createObject = useCreateObject()
  const updateObject = useUpdateObject()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [module, setModule] = useState<ModuleType>('demand_planning')
  const [category, setCategory] = useState<ObjectCategory>('master_data')
  const [region, setRegion] = useState<RegionType>('region_eu')
  const [sourceSystem, setSourceSystem] = useState<SourceSystem>('erp_primary')
  const [currentStage, setCurrentStage] = useState<LifecycleStage>('requirements')
  const [status, setStatus] = useState<ObjectStatus>('on_track')
  const [ownerAlias, setOwnerAlias] = useState('')
  const [teamAlias, setTeamAlias] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (existing) {
      setName(existing.name)
      setDescription(existing.description || '')
      setModule(existing.module)
      setCategory(existing.category)
      setRegion(existing.region)
      setSourceSystem(existing.source_system)
      setCurrentStage(existing.current_stage)
      setStatus(existing.status)
      setOwnerAlias(existing.owner_alias || '')
      setTeamAlias(existing.team_alias || '')
      setNotes(existing.notes || '')
    }
  }, [existing])

  const availableCategories = MODULE_CATEGORIES[module]

  useEffect(() => {
    if (!availableCategories.includes(category)) {
      setCategory(availableCategories[0])
    }
  }, [module, availableCategories, category])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    const payload = {
      name,
      description: description || null,
      module,
      category,
      region,
      source_system: sourceSystem,
      current_stage: currentStage,
      status,
      owner_alias: ownerAlias || null,
      team_alias: teamAlias || null,
      notes: notes || null,
    }

    try {
      if (isEdit) {
        await updateObject.mutateAsync({ id, ...payload })
        navigate(`/objects/${id}`)
      } else {
        const result = await createObject.mutateAsync(payload)
        navigate(`/objects/${result.id}`)
      }
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl">
      <button
        onClick={() => navigate(isEdit ? `/objects/${id}` : '/objects')}
        className="text-xs cursor-pointer border-none bg-transparent mb-4"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        &larr; Back
      </button>

      <h1 className="text-lg font-bold mb-6">{isEdit ? 'Edit Object' : 'Create Object'}</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <Field label="Name *">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            placeholder="OBJ-DP-MD-001"
            className="w-full h-10 px-3 rounded-lg text-sm border outline-none font-[family-name:var(--font-data)]"
            style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
          />
        </Field>

        {/* Description */}
        <Field label="Description">
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-lg text-sm border outline-none resize-y"
            style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
          />
        </Field>

        {/* Module + Category */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Module *">
            <SelectField value={module} onChange={v => setModule(v as ModuleType)} options={MODULE_LABELS} />
          </Field>
          <Field label="Category *">
            <SelectField
              value={category}
              onChange={v => setCategory(v as ObjectCategory)}
              options={Object.fromEntries(availableCategories.map(c => [c, CATEGORY_LABELS[c]]))}
            />
          </Field>
        </div>

        {/* Region + Source */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Region *">
            <SelectField value={region} onChange={v => setRegion(v as RegionType)} options={REGION_LABELS} />
          </Field>
          <Field label="Source System *">
            <SelectField value={sourceSystem} onChange={v => setSourceSystem(v as SourceSystem)} options={SOURCE_SYSTEM_LABELS} />
          </Field>
        </div>

        {/* Stage + Status */}
        <div className="grid grid-cols-2 gap-4">
          {!isEdit && (
            <Field label="Initial Stage *">
              <SelectField
                value={currentStage}
                onChange={v => setCurrentStage(v as LifecycleStage)}
                options={Object.fromEntries(LIFECYCLE_STAGES.map(s => [s, STAGE_LABELS[s]]))}
              />
            </Field>
          )}
          <Field label="Status *">
            <SelectField
              value={status}
              onChange={v => setStatus(v as ObjectStatus)}
              options={STATUS_LABELS}
            />
          </Field>
        </div>

        {/* Owner + Team */}
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
          <Field label="Team">
            <input
              type="text"
              value={teamAlias}
              onChange={e => setTeamAlias(e.target.value)}
              placeholder="TEAM-MDS-DP"
              className="w-full h-10 px-3 rounded-lg text-sm border outline-none font-[family-name:var(--font-data)]"
              style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            />
          </Field>
        </div>

        {/* Notes */}
        <Field label="Notes">
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-lg text-sm border outline-none resize-y"
            style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
          />
        </Field>

        {error && <p className="text-xs" style={{ color: 'var(--color-status-red)' }}>{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={createObject.isPending || updateObject.isPending}
            className="h-10 px-6 rounded-lg text-sm font-medium cursor-pointer border-none disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
          >
            {isEdit ? 'Save Changes' : 'Create Object'}
          </button>
          <button
            type="button"
            onClick={() => navigate(isEdit ? `/objects/${id}` : '/objects')}
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

function SelectField({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: Record<string, string> }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full h-10 px-3 rounded-lg text-sm border outline-none cursor-pointer"
      style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
    >
      {Object.entries(options).map(([val, label]) => (
        <option key={val} value={val}>{label}</option>
      ))}
    </select>
  )
}
