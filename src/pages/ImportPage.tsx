import { useState, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import { useObjects } from '@/hooks/useObjects'
import {
  parseCSV,
  validateObjectRows,
  validateIssueRows,
  generateObjectTemplate,
  generateIssueTemplate,
  type ValidObjectRow,
  type ValidIssueRow,
} from '@/lib/csvParser'
import type { LifecycleStage, ModuleType, ObjectStatus, IssueType, IssueStatus, NextAction, ObjectCategory, RegionType, SourceSystem } from '@/types/database'

type Tab = 'objects' | 'issues'
type ImportState = 'idle' | 'preview' | 'importing' | 'done'

export function ImportPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { data: existingObjects } = useObjects()
  const fileRef = useRef<HTMLInputElement>(null)

  const [tab, setTab] = useState<Tab>('objects')
  const [state, setState] = useState<ImportState>('idle')
  const [validObjects, setValidObjects] = useState<ValidObjectRow[]>([])
  const [validIssues, setValidIssues] = useState<ValidIssueRow[]>([])
  const [errors, setErrors] = useState<{ row: number; message: string }[]>([])
  const [progress, setProgress] = useState(0)
  const [total, setTotal] = useState(0)
  const [importErrors, setImportErrors] = useState<string[]>([])
  const [importedCount, setImportedCount] = useState(0)

  const reset = () => {
    setState('idle')
    setValidObjects([])
    setValidIssues([])
    setErrors([])
    setProgress(0)
    setTotal(0)
    setImportErrors([])
    setImportedCount(0)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const { rows } = parseCSV(text)

      if (tab === 'objects') {
        const result = validateObjectRows(rows)
        setValidObjects(result.valid)
        setErrors(result.errors)
      } else {
        const result = validateIssueRows(rows)
        setValidIssues(result.valid)
        setErrors(result.errors)
      }
      setState('preview')
    }
    reader.readAsText(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.name.endsWith('.csv')) handleFile(file)
  }

  const handleImportObjects = async () => {
    if (!user) return
    setState('importing')
    setTotal(validObjects.length)
    let imported = 0
    const failed: string[] = []

    const BATCH_SIZE = 50
    for (let i = 0; i < validObjects.length; i += BATCH_SIZE) {
      const batch = validObjects.slice(i, i + BATCH_SIZE).map(row => ({
        user_id: user.id,
        name: row.name,
        module: row.module as ModuleType,
        status: row.status as ObjectStatus,
        current_stage: (row.lifecycle_stage || 'requirements') as LifecycleStage,
        owner_alias: row.owner_alias || null,
        description: row.description || null,
        category: (row.category || 'master_data') as ObjectCategory,
        region: (row.region || 'global') as RegionType,
        source_system: (row.source_system || 'other') as SourceSystem,
        is_archived: false,
        notes: null,
        team_alias: null,
      }))

      const { error } = await supabase.from('meridian_objects').insert(batch)
      if (error) {
        failed.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`)
      } else {
        imported += batch.length
      }
      setProgress(Math.min(i + BATCH_SIZE, validObjects.length))
    }

    setImportedCount(imported)
    setImportErrors(failed)
    setState('done')
    queryClient.invalidateQueries({ queryKey: ['objects'] })
    queryClient.invalidateQueries({ queryKey: ['object-names'] })
  }

  const handleImportIssues = async () => {
    if (!user || !existingObjects) return
    setState('importing')
    setTotal(validIssues.length)
    let imported = 0
    const failed: string[] = []

    const BATCH_SIZE = 50
    for (let i = 0; i < validIssues.length; i += BATCH_SIZE) {
      const batch = validIssues.slice(i, i + BATCH_SIZE).map(row => {
        const matchedObject = existingObjects.find(
          o => o.name.toLowerCase() === row.object_name.toLowerCase()
        )
        return {
          user_id: user.id,
          title: row.title,
          object_id: matchedObject?.id || '',
          issue_type: row.issue_type as IssueType,
          lifecycle_stage: row.lifecycle_stage as LifecycleStage,
          status: row.status as IssueStatus,
          next_action: (row.next_action || null) as NextAction | null,
          owner_alias: row.owner_alias || null,
          description: row.description || null,
          is_archived: false,
          raised_by_alias: null,
          blocked_by_object_id: null,
          blocked_by_note: null,
          linked_object_ids: [],
          decision: null,
          resolved_at: null,
        }
      }).filter(row => {
        if (!row.object_id) {
          const original = validIssues[i + validIssues.indexOf(validIssues.find(v => v.title === row.title)!)]
          failed.push(`"${row.title}": No matching object found for "${original?.object_name}"`)
          return false
        }
        return true
      })

      if (batch.length > 0) {
        const { error } = await supabase.from('meridian_issues').insert(batch)
        if (error) {
          failed.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`)
        } else {
          imported += batch.length
        }
      }
      setProgress(Math.min(i + BATCH_SIZE, validIssues.length))
    }

    setImportedCount(imported)
    setImportErrors(failed)
    setState('done')
    queryClient.invalidateQueries({ queryKey: ['issues'] })
    queryClient.invalidateQueries({ queryKey: ['objects'] })
  }

  const downloadTemplate = () => {
    const content = tab === 'objects' ? generateObjectTemplate() : generateIssueTemplate()
    const blob = new Blob([content], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${tab}_template.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const validCount = tab === 'objects' ? validObjects.length : validIssues.length

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl">
      <h1 className="text-lg font-bold">Bulk Import</h1>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
        {(['objects', 'issues'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); reset() }}
            className="flex-1 py-2 text-sm font-medium rounded-md cursor-pointer border-none capitalize transition-colors duration-150"
            style={{
              backgroundColor: tab === t ? 'var(--color-bg-secondary)' : 'transparent',
              color: tab === t ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Template download */}
      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          Upload a CSV file to import {tab}. Required fields are highlighted in the template.
        </p>
        <button
          onClick={downloadTemplate}
          className="text-xs cursor-pointer border-none bg-transparent"
          style={{ color: 'var(--color-accent)' }}
        >
          Download template
        </button>
      </div>

      {/* Dropzone */}
      {state === 'idle' && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className="p-8 rounded-lg border-2 border-dashed text-center cursor-pointer transition-colors duration-150"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3" style={{ color: 'var(--color-text-tertiary)' }}>
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            Drop a CSV file here, or click to browse
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
            .csv files only
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
            }}
          />
        </div>
      )}

      {/* Preview */}
      {state === 'preview' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium" style={{ color: 'var(--color-status-green)' }}>
                {validCount} valid rows
              </span>
              {errors.length > 0 && (
                <span className="text-sm font-medium" style={{ color: 'var(--color-status-red)' }}>
                  {errors.length} errors
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={reset}
                className="h-8 px-3 rounded text-xs cursor-pointer border"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text-secondary)' }}
              >
                Cancel
              </button>
              <button
                onClick={tab === 'objects' ? handleImportObjects : handleImportIssues}
                disabled={validCount === 0}
                className="h-8 px-4 rounded text-xs font-medium cursor-pointer border-none disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
              >
                Import {validCount} {tab}
              </button>
            </div>
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div className="p-3 rounded-lg border" style={{ backgroundColor: 'color-mix(in srgb, var(--color-status-red) 8%, transparent)', borderColor: 'color-mix(in srgb, var(--color-status-red) 25%, transparent)' }}>
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-status-red)' }}>Validation Errors</p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {errors.map((err, i) => (
                  <p key={i} className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                    Row {err.row}: {err.message}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Preview Table */}
          <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                  {tab === 'objects' ? (
                    <>
                      <th className="text-left px-3 py-2 font-medium" style={{ color: 'var(--color-text-secondary)' }}>Name</th>
                      <th className="text-left px-3 py-2 font-medium" style={{ color: 'var(--color-text-secondary)' }}>Module</th>
                      <th className="text-left px-3 py-2 font-medium" style={{ color: 'var(--color-text-secondary)' }}>Status</th>
                      <th className="text-left px-3 py-2 font-medium" style={{ color: 'var(--color-text-secondary)' }}>Stage</th>
                      <th className="text-left px-3 py-2 font-medium" style={{ color: 'var(--color-text-secondary)' }}>Owner</th>
                    </>
                  ) : (
                    <>
                      <th className="text-left px-3 py-2 font-medium" style={{ color: 'var(--color-text-secondary)' }}>Title</th>
                      <th className="text-left px-3 py-2 font-medium" style={{ color: 'var(--color-text-secondary)' }}>Object</th>
                      <th className="text-left px-3 py-2 font-medium" style={{ color: 'var(--color-text-secondary)' }}>Type</th>
                      <th className="text-left px-3 py-2 font-medium" style={{ color: 'var(--color-text-secondary)' }}>Stage</th>
                      <th className="text-left px-3 py-2 font-medium" style={{ color: 'var(--color-text-secondary)' }}>Status</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {tab === 'objects' ? validObjects.slice(0, 50).map((row, i) => (
                  <tr key={i} style={{ borderTop: '1px solid var(--color-border)' }}>
                    <td className="px-3 py-2">{row.name}</td>
                    <td className="px-3 py-2" style={{ color: 'var(--color-text-secondary)' }}>{row.module}</td>
                    <td className="px-3 py-2" style={{ color: 'var(--color-text-secondary)' }}>{row.status}</td>
                    <td className="px-3 py-2" style={{ color: 'var(--color-text-secondary)' }}>{row.lifecycle_stage || '-'}</td>
                    <td className="px-3 py-2" style={{ color: 'var(--color-text-secondary)' }}>{row.owner_alias || '-'}</td>
                  </tr>
                )) : validIssues.slice(0, 50).map((row, i) => (
                  <tr key={i} style={{ borderTop: '1px solid var(--color-border)' }}>
                    <td className="px-3 py-2">{row.title}</td>
                    <td className="px-3 py-2" style={{ color: 'var(--color-text-secondary)' }}>{row.object_name}</td>
                    <td className="px-3 py-2" style={{ color: 'var(--color-text-secondary)' }}>{row.issue_type}</td>
                    <td className="px-3 py-2" style={{ color: 'var(--color-text-secondary)' }}>{row.lifecycle_stage}</td>
                    <td className="px-3 py-2" style={{ color: 'var(--color-text-secondary)' }}>{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {validCount > 50 && (
              <p className="text-[10px] text-center py-2" style={{ color: 'var(--color-text-tertiary)' }}>
                Showing first 50 of {validCount} rows
              </p>
            )}
          </div>
        </div>
      )}

      {/* Importing Progress */}
      {state === 'importing' && (
        <div className="p-6 rounded-lg border text-center" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
          <p className="text-sm font-medium mb-3">Importing...</p>
          <div className="h-2 rounded-full overflow-hidden mb-2" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${total > 0 ? (progress / total) * 100 : 0}%`, backgroundColor: 'var(--color-accent)' }}
            />
          </div>
          <p className="text-xs font-[family-name:var(--font-data)]" style={{ color: 'var(--color-text-secondary)' }}>
            {progress} / {total}
          </p>
        </div>
      )}

      {/* Done */}
      {state === 'done' && (
        <div className="p-6 rounded-lg border" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
          <div className="text-center mb-4">
            <p className="text-sm font-medium" style={{ color: 'var(--color-status-green)' }}>
              Successfully imported {importedCount} {tab}
            </p>
          </div>
          {importErrors.length > 0 && (
            <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: 'color-mix(in srgb, var(--color-status-red) 8%, transparent)' }}>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-status-red)' }}>Some rows failed:</p>
              {importErrors.map((err, i) => (
                <p key={i} className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>{err}</p>
              ))}
            </div>
          )}
          <div className="text-center">
            <button
              onClick={reset}
              className="h-8 px-4 rounded text-xs font-medium cursor-pointer border-none"
              style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
            >
              Import More
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
