import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useIssues, useUpdateIssue, useBulkUpdateIssues } from '@/hooks/useIssues'
import { useObjects } from '@/hooks/useObjects'
import { useFilters } from '@/hooks/useFilters'
import type { IssueWithObject } from '@/types/database'
import { AgingBadge } from '@/components/AgingBadge'
import { FilterBar } from '@/components/FilterBar'
import { SummaryBar } from '@/components/SummaryBar'
import { EmptyState } from '@/components/EmptyState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { InlineStatusSelect } from '@/components/InlineStatusSelect'
import { ViewChips } from '@/components/ViewChips'
import { ExportDropdown } from '@/components/ExportDropdown'
import { SortSelect } from '@/components/SortSelect'
import { BulkActionBar } from '@/components/BulkActionBar'
import type { BulkAction } from '@/components/BulkActionBar'
import { ISSUE_VIEWS } from '@/lib/savedViews'
import { exportIssuesToExcel, exportFullWorkbook } from '@/lib/exportExcel'
import { ISSUE_TYPE_LABELS, NEXT_ACTION_LABELS, NEXT_ACTION_COLORS } from '@/lib/constants'
import { STAGE_LABELS, MODULE_LABELS } from '@/types/database'
import type { IssueStatus, ModuleType } from '@/types/database'

export function IssueListPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { filters, setFilter, clearFilters, activeFilterCount } = useFilters()
  const { data: issues, isLoading, error } = useIssues(filters)
  const { data: allIssues } = useIssues()
  const { data: allObjects } = useObjects()
  const updateIssue = useUpdateIssue()
  const bulkUpdate = useBulkUpdateIssues()

  // View mode: list, by_object, or by_module
  type ViewMode = 'list' | 'by_object' | 'by_module'
  const viewMode = (searchParams.get('view') as ViewMode) || 'list'
  const setViewMode = (mode: ViewMode) => {
    const next = new URLSearchParams(searchParams)
    if (mode === 'list') next.delete('view')
    else next.set('view', mode)
    setSearchParams(next, { replace: true })
  }

  // Collapsed state for grouped views
  const [collapsedObjects, setCollapsedObjects] = useState<Set<string>>(new Set())

  const toggleCollapse = (objectName: string) => {
    setCollapsedObjects(prev => {
      const next = new Set(prev)
      if (next.has(objectName)) next.delete(objectName)
      else next.add(objectName)
      return next
    })
  }

  // Group issues by object_name (primary + linked objects)
  const groupedIssues = useMemo(() => {
    if (!issues || viewMode !== 'by_object') return null
    const groups = new Map<string, IssueWithObject[]>()
    const addToGroup = (name: string, issue: IssueWithObject) => {
      if (!groups.has(name)) groups.set(name, [])
      if (!groups.get(name)!.some(i => i.id === issue.id)) {
        groups.get(name)!.push(issue)
      }
    }
    for (const issue of issues) {
      addToGroup(issue.object_name || 'Unknown', issue)
      if (issue.linked_object_ids?.length && allObjects) {
        for (const oid of issue.linked_object_ids) {
          const obj = allObjects.find(o => o.id === oid)
          if (obj) addToGroup(obj.name, issue)
        }
      }
    }
    return new Map([...groups.entries()].sort(([a], [b]) => a.localeCompare(b)))
  }, [issues, viewMode, allObjects])

  // Hierarchy: Module → Object → Issues
  const moduleHierarchy = useMemo(() => {
    if (!issues || viewMode !== 'by_module') return null
    const hierarchy = new Map<string, Map<string, IssueWithObject[]>>()
    for (const issue of issues) {
      const mod = issue.object_module || 'unknown'
      if (!hierarchy.has(mod)) hierarchy.set(mod, new Map())
      const objectMap = hierarchy.get(mod)!
      const objName = issue.object_name || 'Unknown'
      if (!objectMap.has(objName)) objectMap.set(objName, [])
      objectMap.get(objName)!.push(issue)
    }
    // Sort modules, then objects within each module
    return new Map(
      [...hierarchy.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([mod, objects]) => [
          mod,
          new Map([...objects.entries()].sort(([a], [b]) => a.localeCompare(b))),
        ])
    )
  }, [issues, viewMode])

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Decision modal state for inline resolve/close
  const [decisionModal, setDecisionModal] = useState<{ issueId: string; status: IssueStatus; existingDecision: string | null } | null>(null)
  const [decisionText, setDecisionText] = useState('')

  // Bulk decision modal state
  const [bulkDecisionModal, setBulkDecisionModal] = useState<{ ids: string[]; status: IssueStatus } | null>(null)
  const [bulkDecisionText, setBulkDecisionText] = useState('')

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
    if (!issues) return
    if (selectedIds.size === issues.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(issues.map(i => i.id)))
  }

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

  const handleBulkAction = (action: BulkAction) => {
    const ids = Array.from(selectedIds)
    if (action.type === 'change_status') {
      const status = action.status as IssueStatus
      if (status === 'resolved' || status === 'closed') {
        setBulkDecisionModal({ ids, status })
        setBulkDecisionText('')
        return
      }
      bulkUpdate.mutate({ ids, updates: { status } })
    } else if (action.type === 'change_owner') {
      bulkUpdate.mutate({ ids, updates: { owner_alias: action.owner } })
    } else if (action.type === 'archive') {
      bulkUpdate.mutate({ ids, updates: { is_archived: true } })
    }
    setSelectedIds(new Set())
  }

  const handleBulkDecisionSubmit = () => {
    if (!bulkDecisionText.trim() || !bulkDecisionModal) return
    bulkUpdate.mutate({
      ids: bulkDecisionModal.ids,
      updates: {
        status: bulkDecisionModal.status,
        decision: bulkDecisionText,
        resolved_at: new Date().toISOString(),
      },
    })
    setBulkDecisionModal(null)
    setSelectedIds(new Set())
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold">Issues</h1>
          <div className="flex rounded-md border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
            {([['list', 'List'], ['by_object', 'By Object'], ['by_module', 'By Module']] as const).map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode as ViewMode)}
                className="h-7 px-3 text-[11px] font-medium cursor-pointer border-none"
                style={{
                  backgroundColor: viewMode === mode ? 'var(--color-accent)' : 'transparent',
                  color: viewMode === mode ? '#fff' : 'var(--color-text-secondary)',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <SortSelect
            options={[
              { value: 'created_at:desc', label: 'Newest First' },
              { value: 'created_at:asc', label: 'Oldest First' },
              { value: 'title:asc', label: 'Title A-Z' },
              { value: 'issue_type:asc', label: 'Type A-Z' },
              { value: 'lifecycle_stage:asc', label: 'Stage (earliest first)' },
              { value: 'status:asc', label: 'Status A-Z' },
              { value: 'next_action:asc', label: 'Next Action A-Z' },
            ]}
            currentSort={filters.sort || 'created_at'}
            currentOrder={(filters.order as 'asc' | 'desc') || 'desc'}
            onSortChange={(sort, order) => {
              setFilter('sort', sort)
              setFilter('order', order)
            }}
          />
          <ExportDropdown
            onExportFiltered={() => issues && exportIssuesToExcel(issues)}
            onExportAll={() => allObjects && allIssues && exportFullWorkbook(allObjects, allIssues)}
            isLoading={!issues}
          />
          <button
            onClick={() => navigate('/issues/new')}
            className="h-8 px-4 rounded-lg text-sm font-medium cursor-pointer border-none"
            style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
          >
            + New Issue
          </button>
        </div>
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

      {issues && issues.length > 0 && viewMode === 'list' && (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                  <th className="w-8 px-2 py-2.5">
                    <input
                      type="checkbox"
                      checked={issues.length > 0 && selectedIds.size === issues.length}
                      onChange={toggleAll}
                      className="cursor-pointer accent-[var(--color-accent)]"
                      onClick={e => e.stopPropagation()}
                    />
                  </th>
                  {['Title', 'Object', 'Type', 'Stage', 'Status', 'Next Action', 'Owner', 'Age'].map(col => (
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
                    onClick={() => selectedIds.size > 0 ? toggleSelect(issue.id) : navigate(`/issues/${issue.id}`)}
                    className="cursor-pointer transition-colors duration-150"
                    style={{
                      backgroundColor: selectedIds.has(issue.id)
                        ? 'color-mix(in srgb, var(--color-accent) 10%, transparent)'
                        : i % 2 === 0 ? 'var(--color-bg-primary)' : 'var(--color-bg-secondary)',
                    }}
                    onMouseEnter={e => {
                      if (!selectedIds.has(issue.id)) e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'
                    }}
                    onMouseLeave={e => {
                      if (!selectedIds.has(issue.id)) e.currentTarget.style.backgroundColor = i % 2 === 0 ? 'var(--color-bg-primary)' : 'var(--color-bg-secondary)'
                    }}
                  >
                    <td className="w-8 px-2 py-2.5">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(issue.id)}
                        onChange={() => toggleSelect(issue.id)}
                        onClick={e => e.stopPropagation()}
                        className="cursor-pointer accent-[var(--color-accent)]"
                      />
                    </td>
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
                    <td className="px-3 py-2.5">
                      {issue.next_action ? (
                        <span
                          className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
                          style={{ backgroundColor: `color-mix(in srgb, ${NEXT_ACTION_COLORS[issue.next_action]} 15%, transparent)`, color: NEXT_ACTION_COLORS[issue.next_action] }}
                        >
                          {NEXT_ACTION_LABELS[issue.next_action]}
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>-</span>
                      )}
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
                onClick={() => selectedIds.size > 0 ? toggleSelect(issue.id) : navigate(`/issues/${issue.id}`)}
                className="p-4 rounded-lg border cursor-pointer"
                style={{
                  backgroundColor: selectedIds.has(issue.id)
                    ? 'color-mix(in srgb, var(--color-accent) 10%, transparent)'
                    : 'var(--color-bg-secondary)',
                  borderColor: selectedIds.has(issue.id) ? 'var(--color-accent)' : 'var(--color-border)',
                }}
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
                  {issue.next_action && (
                    <>
                      <span>&middot;</span>
                      <span
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                        style={{ backgroundColor: `color-mix(in srgb, ${NEXT_ACTION_COLORS[issue.next_action]} 15%, transparent)`, color: NEXT_ACTION_COLORS[issue.next_action] }}
                      >
                        {NEXT_ACTION_LABELS[issue.next_action]}
                      </span>
                    </>
                  )}
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

      {/* By Object grouped view */}
      {issues && issues.length > 0 && viewMode === 'by_object' && groupedIssues && (
        <div className="space-y-3">
          {[...groupedIssues.entries()].map(([objectName, groupIssues]) => {
            const isCollapsed = collapsedObjects.has(objectName)
            return (
              <div key={objectName} className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
                {/* Group header */}
                <button
                  onClick={() => toggleCollapse(objectName)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-left cursor-pointer border-none"
                  style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}
                >
                  <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    {isCollapsed ? '\u25B6' : '\u25BC'}
                  </span>
                  <span className="text-sm font-semibold font-[family-name:var(--font-data)]">{objectName}</span>
                  <span
                    className="ml-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-secondary)' }}
                  >
                    {groupIssues.length}
                  </span>
                </button>

                {/* Group content */}
                {!isCollapsed && (
                  <>
                    {/* Desktop table rows */}
                    <div className="hidden md:block">
                      <table className="w-full text-sm">
                        <thead>
                          <tr style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                            <th className="w-8 px-2 py-2" />
                            {['Title', 'Type', 'Stage', 'Status', 'Next Action', 'Owner', 'Age'].map(col => (
                              <th key={col} className="text-left px-3 py-2 text-[11px] font-medium whitespace-nowrap" style={{ color: 'var(--color-text-tertiary)' }}>
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {groupIssues.map((issue, i) => (
                            <tr
                              key={issue.id}
                              onClick={() => selectedIds.size > 0 ? toggleSelect(issue.id) : navigate(`/issues/${issue.id}`)}
                              className="cursor-pointer transition-colors duration-150"
                              style={{
                                backgroundColor: selectedIds.has(issue.id)
                                  ? 'color-mix(in srgb, var(--color-accent) 10%, transparent)'
                                  : i % 2 === 0 ? 'var(--color-bg-primary)' : 'var(--color-bg-secondary)',
                              }}
                              onMouseEnter={e => {
                                if (!selectedIds.has(issue.id)) e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'
                              }}
                              onMouseLeave={e => {
                                if (!selectedIds.has(issue.id)) e.currentTarget.style.backgroundColor = i % 2 === 0 ? 'var(--color-bg-primary)' : 'var(--color-bg-secondary)'
                              }}
                            >
                              <td className="w-8 px-2 py-2.5">
                                <input
                                  type="checkbox"
                                  checked={selectedIds.has(issue.id)}
                                  onChange={() => toggleSelect(issue.id)}
                                  onClick={e => e.stopPropagation()}
                                  className="cursor-pointer accent-[var(--color-accent)]"
                                />
                              </td>
                              <td className="px-3 py-2.5 text-xs font-medium max-w-[200px] truncate">{issue.title}</td>
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
                              <td className="px-3 py-2.5">
                                {issue.next_action ? (
                                  <span
                                    className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
                                    style={{ backgroundColor: `color-mix(in srgb, ${NEXT_ACTION_COLORS[issue.next_action]} 15%, transparent)`, color: NEXT_ACTION_COLORS[issue.next_action] }}
                                  >
                                    {NEXT_ACTION_LABELS[issue.next_action]}
                                  </span>
                                ) : (
                                  <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>-</span>
                                )}
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

                    {/* Mobile cards */}
                    <div className="md:hidden space-y-0">
                      {groupIssues.map(issue => (
                        <div
                          key={issue.id}
                          onClick={() => selectedIds.size > 0 ? toggleSelect(issue.id) : navigate(`/issues/${issue.id}`)}
                          className="p-4 border-t cursor-pointer"
                          style={{
                            backgroundColor: selectedIds.has(issue.id)
                              ? 'color-mix(in srgb, var(--color-accent) 10%, transparent)'
                              : 'var(--color-bg-primary)',
                            borderColor: 'var(--color-border)',
                          }}
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
                            <span>{ISSUE_TYPE_LABELS[issue.issue_type]}</span>
                            <span>&middot;</span>
                            <span>{STAGE_LABELS[issue.lifecycle_stage]}</span>
                            {issue.next_action && (
                              <>
                                <span>&middot;</span>
                                <span
                                  className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                                  style={{ backgroundColor: `color-mix(in srgb, ${NEXT_ACTION_COLORS[issue.next_action]} 15%, transparent)`, color: NEXT_ACTION_COLORS[issue.next_action] }}
                                >
                                  {NEXT_ACTION_LABELS[issue.next_action]}
                                </span>
                              </>
                            )}
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
          })}
        </div>
      )}

      {/* By Module hierarchy view */}
      {issues && issues.length > 0 && viewMode === 'by_module' && moduleHierarchy && (
        <div className="space-y-4">
          {[...moduleHierarchy.entries()].map(([mod, objectMap]) => {
            const modKey = `mod:${mod}`
            const isModCollapsed = collapsedObjects.has(modKey)
            const totalIssues = [...objectMap.values()].reduce((sum, arr) => sum + arr.length, 0)
            return (
              <div key={mod} className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
                {/* Module header */}
                <button
                  onClick={() => toggleCollapse(modKey)}
                  className="w-full flex items-center gap-2 px-4 py-3 text-left cursor-pointer border-none"
                  style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
                >
                  <span className="text-xs">{isModCollapsed ? '\u25B6' : '\u25BC'}</span>
                  <span className="text-sm font-bold">{MODULE_LABELS[mod as ModuleType] || mod}</span>
                  <span className="ml-1 text-[11px] opacity-80">
                    {objectMap.size} object{objectMap.size !== 1 ? 's' : ''} &middot; {totalIssues} issue{totalIssues !== 1 ? 's' : ''}
                  </span>
                </button>

                {!isModCollapsed && (
                  <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                    {[...objectMap.entries()].map(([objName, objIssues]) => {
                      const objKey = `mod:${mod}:obj:${objName}`
                      const isObjCollapsed = collapsedObjects.has(objKey)
                      return (
                        <div key={objName}>
                          {/* Object sub-header */}
                          <button
                            onClick={() => toggleCollapse(objKey)}
                            className="w-full flex items-center gap-2 px-4 py-2 text-left cursor-pointer border-none"
                            style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}
                          >
                            <span className="text-xs pl-2" style={{ color: 'var(--color-text-secondary)' }}>
                              {isObjCollapsed ? '\u25B6' : '\u25BC'}
                            </span>
                            <span className="text-sm font-semibold font-[family-name:var(--font-data)]">{objName}</span>
                            <span
                              className="ml-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                              style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-secondary)' }}
                            >
                              {objIssues.length}
                            </span>
                          </button>

                          {!isObjCollapsed && (
                            <>
                              {/* Desktop rows */}
                              <div className="hidden md:block">
                                <table className="w-full text-sm">
                                  <tbody>
                                    {objIssues.map((issue, i) => (
                                      <tr
                                        key={issue.id}
                                        onClick={() => selectedIds.size > 0 ? toggleSelect(issue.id) : navigate(`/issues/${issue.id}`)}
                                        className="cursor-pointer transition-colors duration-150"
                                        style={{
                                          backgroundColor: selectedIds.has(issue.id)
                                            ? 'color-mix(in srgb, var(--color-accent) 10%, transparent)'
                                            : i % 2 === 0 ? 'var(--color-bg-primary)' : 'var(--color-bg-secondary)',
                                        }}
                                        onMouseEnter={e => {
                                          if (!selectedIds.has(issue.id)) e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'
                                        }}
                                        onMouseLeave={e => {
                                          if (!selectedIds.has(issue.id)) e.currentTarget.style.backgroundColor = i % 2 === 0 ? 'var(--color-bg-primary)' : 'var(--color-bg-secondary)'
                                        }}
                                      >
                                        <td className="w-8 px-2 py-2">
                                          <input
                                            type="checkbox"
                                            checked={selectedIds.has(issue.id)}
                                            onChange={() => toggleSelect(issue.id)}
                                            onClick={e => e.stopPropagation()}
                                            className="cursor-pointer accent-[var(--color-accent)]"
                                          />
                                        </td>
                                        <td className="px-3 py-2 text-xs font-medium max-w-[220px] truncate">{issue.title}</td>
                                        <td className="px-3 py-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                                          {ISSUE_TYPE_LABELS[issue.issue_type]}
                                        </td>
                                        <td className="px-3 py-2">
                                          <InlineStatusSelect
                                            status={issue.status}
                                            type="issue"
                                            onChange={(s) => handleStatusChange(issue.id, s, issue.decision)}
                                          />
                                        </td>
                                        <td className="px-3 py-2">
                                          {issue.next_action ? (
                                            <span
                                              className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
                                              style={{ backgroundColor: `color-mix(in srgb, ${NEXT_ACTION_COLORS[issue.next_action]} 15%, transparent)`, color: NEXT_ACTION_COLORS[issue.next_action] }}
                                            >
                                              {NEXT_ACTION_LABELS[issue.next_action]}
                                            </span>
                                          ) : (
                                            <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>-</span>
                                          )}
                                        </td>
                                        <td className="px-3 py-2 text-xs font-[family-name:var(--font-data)]" style={{ color: 'var(--color-text-secondary)' }}>
                                          {issue.owner_alias || '-'}
                                        </td>
                                        <td className="px-3 py-2"><AgingBadge days={issue.age_days} type="issue" /></td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>

                              {/* Mobile cards */}
                              <div className="md:hidden">
                                {objIssues.map(issue => (
                                  <div
                                    key={issue.id}
                                    onClick={() => selectedIds.size > 0 ? toggleSelect(issue.id) : navigate(`/issues/${issue.id}`)}
                                    className="p-4 border-t cursor-pointer"
                                    style={{
                                      backgroundColor: selectedIds.has(issue.id)
                                        ? 'color-mix(in srgb, var(--color-accent) 10%, transparent)'
                                        : 'var(--color-bg-primary)',
                                      borderColor: 'var(--color-border)',
                                    }}
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
                                      <span>{ISSUE_TYPE_LABELS[issue.issue_type]}</span>
                                      {issue.next_action && (
                                        <>
                                          <span>&middot;</span>
                                          <span
                                            className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                                            style={{ backgroundColor: `color-mix(in srgb, ${NEXT_ACTION_COLORS[issue.next_action]} 15%, transparent)`, color: NEXT_ACTION_COLORS[issue.next_action] }}
                                          >
                                            {NEXT_ACTION_LABELS[issue.next_action]}
                                          </span>
                                        </>
                                      )}
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
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <BulkActionBar
          entityType="issues"
          selectedCount={selectedIds.size}
          onAction={handleBulkAction}
          onCancel={() => setSelectedIds(new Set())}
        />
      )}

      {/* Single Decision Modal */}
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

      {/* Bulk Decision Modal */}
      {bulkDecisionModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 px-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-md p-6 rounded-xl border" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
            <h2 className="text-base font-bold mb-1">Record Decision</h2>
            <p className="text-xs mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              A decision is required when {bulkDecisionModal.status === 'resolved' ? 'resolving' : 'closing'} {bulkDecisionModal.ids.length} issues. The same decision will apply to all selected issues.
            </p>
            <textarea
              value={bulkDecisionText}
              onChange={e => setBulkDecisionText(e.target.value)}
              rows={4}
              placeholder="What was decided?"
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none resize-y mb-4"
              style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setBulkDecisionModal(null)}
                className="h-9 px-4 text-sm cursor-pointer border-none bg-transparent"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDecisionSubmit}
                disabled={!bulkDecisionText.trim()}
                className="h-9 px-4 rounded-lg text-sm font-medium cursor-pointer border-none disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
              >
                Save & {bulkDecisionModal.status === 'resolved' ? 'Resolve' : 'Close'} {bulkDecisionModal.ids.length} Issues
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
