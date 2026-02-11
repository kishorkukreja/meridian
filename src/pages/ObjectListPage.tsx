import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useObjects, useUpdateObject, useBulkUpdateObjects } from '@/hooks/useObjects'
import { useIssues } from '@/hooks/useIssues'
import { useFilters } from '@/hooks/useFilters'
import { AgingBadge } from '@/components/AgingBadge'
import { LifecycleStepper } from '@/components/LifecycleStepper'
import { FilterBar } from '@/components/FilterBar'
import { SummaryBar } from '@/components/SummaryBar'
import { EmptyState } from '@/components/EmptyState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { InlineStatusSelect } from '@/components/InlineStatusSelect'
import { ViewChips } from '@/components/ViewChips'
import { ExportDropdown } from '@/components/ExportDropdown'
import { BulkActionBar } from '@/components/BulkActionBar'
import type { BulkAction } from '@/components/BulkActionBar'
import { OBJECT_VIEWS } from '@/lib/savedViews'
import { exportObjectsToExcel, exportFullWorkbook } from '@/lib/exportExcel'
import { MODULE_LABELS, CATEGORY_LABELS, SOURCE_SYSTEM_LABELS, REGION_LABELS } from '@/lib/constants'
import type { ObjectStatus } from '@/types/database'

export function ObjectListPage() {
  const navigate = useNavigate()
  const { filters, setFilter, clearFilters, activeFilterCount } = useFilters()
  const { data: objects, isLoading, error } = useObjects(filters)
  const { data: allObjects } = useObjects()
  const { data: allIssues } = useIssues()
  const updateObject = useUpdateObject()
  const bulkUpdate = useBulkUpdateObjects()

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Clear selection when filters change
  useEffect(() => { setSelectedIds(new Set()) }, [filters])

  // Escape to cancel selection
  useEffect(() => {
    if (selectedIds.size === 0) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectedIds(new Set()) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [selectedIds.size])

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (!objects) return
    if (selectedIds.size === objects.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(objects.map(o => o.id)))
  }

  const handleStatusChange = (objectId: string, newStatus: string) => {
    updateObject.mutate({ id: objectId, status: newStatus as ObjectStatus })
  }

  const handleBulkAction = (action: BulkAction) => {
    const ids = Array.from(selectedIds)
    if (action.type === 'change_status') {
      bulkUpdate.mutate({ ids, updates: { status: action.status as ObjectStatus } })
    } else if (action.type === 'change_owner') {
      bulkUpdate.mutate({ ids, updates: { owner_alias: action.owner } })
    } else if (action.type === 'archive') {
      bulkUpdate.mutate({ ids, updates: { is_archived: true } })
    }
    setSelectedIds(new Set())
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Objects</h1>
        <div className="flex gap-2">
          <ExportDropdown
            onExportFiltered={() => objects && exportObjectsToExcel(objects)}
            onExportAll={() => allObjects && allIssues && exportFullWorkbook(allObjects, allIssues)}
            isLoading={!objects}
          />
          <button
            onClick={() => navigate('/objects/new')}
            className="h-8 px-4 rounded-lg text-sm font-medium cursor-pointer border-none"
            style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
          >
            + New Object
          </button>
        </div>
      </div>

      {/* View Chips (scrollable on mobile) */}
      <ViewChips views={OBJECT_VIEWS} basePath="/objects" />

      {/* Filters */}
      <FilterBar
        type="objects"
        filters={filters}
        onFilterChange={setFilter}
        onClear={clearFilters}
        activeCount={activeFilterCount}
      />

      {/* Summary */}
      {objects && objects.length > 0 && <SummaryBar type="objects" data={objects} />}

      {/* Content */}
      {isLoading && <LoadingSkeleton />}
      {error && <p className="text-sm" style={{ color: 'var(--color-status-red)' }}>Failed to load objects.</p>}
      {objects && objects.length === 0 && (
        <EmptyState
          message="No objects found. Create your first data object to start tracking."
          actionLabel="Create Object"
          onAction={() => navigate('/objects/new')}
        />
      )}

      {/* Desktop Table */}
      {objects && objects.length > 0 && (
        <>
          <div className="hidden md:block overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                  <th className="w-8 px-2 py-2.5">
                    <input
                      type="checkbox"
                      checked={objects.length > 0 && selectedIds.size === objects.length}
                      onChange={toggleAll}
                      className="cursor-pointer accent-[var(--color-accent)]"
                      onClick={e => e.stopPropagation()}
                    />
                  </th>
                  {['Name', 'Module', 'Category', 'Region', 'Source', 'Stage', 'Status', 'Owner', 'Aging', 'Issues'].map(col => (
                    <th
                      key={col}
                      className="text-left px-3 py-2.5 text-xs font-medium whitespace-nowrap"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {objects.map((obj, i) => (
                  <tr
                    key={obj.id}
                    onClick={() => selectedIds.size > 0 ? toggleSelect(obj.id) : navigate(`/objects/${obj.id}`)}
                    className="cursor-pointer transition-colors duration-150"
                    style={{
                      backgroundColor: selectedIds.has(obj.id)
                        ? 'color-mix(in srgb, var(--color-accent) 10%, transparent)'
                        : i % 2 === 0 ? 'var(--color-bg-primary)' : 'var(--color-bg-secondary)',
                    }}
                    onMouseEnter={e => {
                      if (!selectedIds.has(obj.id)) e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'
                    }}
                    onMouseLeave={e => {
                      if (!selectedIds.has(obj.id)) e.currentTarget.style.backgroundColor = i % 2 === 0 ? 'var(--color-bg-primary)' : 'var(--color-bg-secondary)'
                    }}
                  >
                    <td className="w-8 px-2 py-2.5">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(obj.id)}
                        onChange={() => toggleSelect(obj.id)}
                        onClick={e => e.stopPropagation()}
                        className="cursor-pointer accent-[var(--color-accent)]"
                      />
                    </td>
                    <td className="px-3 py-2.5 font-medium font-[family-name:var(--font-data)] text-xs">{obj.name}</td>
                    <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{MODULE_LABELS[obj.module]}</td>
                    <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{CATEGORY_LABELS[obj.category]}</td>
                    <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{REGION_LABELS[obj.region]}</td>
                    <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{SOURCE_SYSTEM_LABELS[obj.source_system]}</td>
                    <td className="px-3 py-2.5">
                      <div className="w-24">
                        <LifecycleStepper currentStage={obj.current_stage} compact />
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <InlineStatusSelect
                        status={obj.status}
                        type="object"
                        onChange={(s) => handleStatusChange(obj.id, s)}
                      />
                    </td>
                    <td className="px-3 py-2.5 text-xs font-[family-name:var(--font-data)]" style={{ color: 'var(--color-text-secondary)' }}>
                      {obj.owner_alias || '-'}
                    </td>
                    <td className="px-3 py-2.5"><AgingBadge days={obj.aging_days} /></td>
                    <td className="px-3 py-2.5">
                      {obj.open_issue_count > 0 ? (
                        <span
                          className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold"
                          style={{
                            backgroundColor: 'color-mix(in srgb, var(--color-status-red) 15%, transparent)',
                            color: 'var(--color-status-red)',
                          }}
                        >
                          {obj.open_issue_count}
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {objects.map(obj => (
              <div
                key={obj.id}
                onClick={() => selectedIds.size > 0 ? toggleSelect(obj.id) : navigate(`/objects/${obj.id}`)}
                className="p-4 rounded-lg border cursor-pointer"
                style={{
                  backgroundColor: selectedIds.has(obj.id)
                    ? 'color-mix(in srgb, var(--color-accent) 10%, transparent)'
                    : 'var(--color-bg-secondary)',
                  borderColor: selectedIds.has(obj.id) ? 'var(--color-accent)' : 'var(--color-border)',
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="font-medium text-sm font-[family-name:var(--font-data)]">{obj.name}</span>
                  <InlineStatusSelect
                    status={obj.status}
                    type="object"
                    onChange={(s) => handleStatusChange(obj.id, s)}
                  />
                </div>
                <div className="flex items-center gap-3 text-xs mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                  <span>{MODULE_LABELS[obj.module]}</span>
                  <span>{CATEGORY_LABELS[obj.category]}</span>
                </div>
                <div className="mb-2">
                  <LifecycleStepper currentStage={obj.current_stage} compact />
                </div>
                <div className="flex items-center justify-between text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  <AgingBadge days={obj.aging_days} />
                  {obj.open_issue_count > 0 && (
                    <span style={{ color: 'var(--color-status-red)' }}>{obj.open_issue_count} issues</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <BulkActionBar
          entityType="objects"
          selectedCount={selectedIds.size}
          onAction={handleBulkAction}
          onCancel={() => setSelectedIds(new Set())}
        />
      )}
    </div>
  )
}
