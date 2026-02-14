import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie,
  LineChart, Line, Legend,
} from 'recharts'
import { useObjects } from '@/hooks/useObjects'
import { useIssues } from '@/hooks/useIssues'
import { useMeetings } from '@/hooks/useMeetings'
import { useAllStageHistory } from '@/hooks/useStageHistory'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { exportReportsToExcel } from '@/lib/exportExcel'
import { MODULE_LABELS, STATUS_LABELS, ISSUE_STATUS_LABELS, ISSUE_TYPE_LABELS, NEXT_ACTION_LABELS } from '@/lib/constants'
import { LIFECYCLE_STAGES, STAGE_LABELS } from '@/types/database'
import type { ObjectWithComputed, IssueWithObject, StageHistoryRow, MeetingRow, LifecycleStage, ObjectStatus, ModuleType, NextAction } from '@/types/database'
import * as XLSX from 'xlsx'

const STATUS_COLORS: Record<ObjectStatus, string> = {
  on_track: '#10B981',
  at_risk: '#F59E0B',
  blocked: '#EF4444',
  completed: '#6B7280',
  archived: '#4B5563',
}

const STAGE_CHART_COLORS: Record<LifecycleStage, string> = {
  requirements: '#6366F1',
  mapping: '#818CF8',
  extraction: '#3B82F6',
  ingestion: '#06B6D4',
  transformation: '#14B8A6',
  push_to_target: '#10B981',
  validation: '#22C55E',
  signoff: '#84CC16',
  live: '#EAB308',
}

const ISSUE_STATUS_COLORS: Record<string, string> = {
  open: '#3B82F6',
  in_progress: '#F59E0B',
  blocked: '#EF4444',
  resolved: '#10B981',
  closed: '#6B7280',
}

type DateRange = '7d' | '30d' | '90d' | 'all'
type Tab = 'program' | 'objects' | 'issues' | 'meetings' | 'weekly'

const TABS: { key: Tab; label: string }[] = [
  { key: 'program', label: 'Program Overview' },
  { key: 'objects', label: 'Objects' },
  { key: 'issues', label: 'Issues' },
  { key: 'meetings', label: 'Meetings' },
  { key: 'weekly', label: 'Weekly Trend' },
]

function getDateCutoff(range: DateRange): Date | null {
  if (range === 'all') return null
  const now = new Date()
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90
  return new Date(now.getTime() - days * 86400000)
}

function formatDateStr(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toISOString().split('T')[0]
}

function autoFitColumns(ws: XLSX.WorkSheet, data: Record<string, unknown>[]) {
  if (data.length === 0) return
  const cols = Object.keys(data[0])
  ws['!cols'] = cols.map(key => {
    const maxLen = Math.max(key.length, ...data.map(row => String(row[key] ?? '').length))
    return { wch: Math.min(maxLen + 2, 50) }
  })
}

function triggerDownload(workbook: XLSX.WorkBook, filename: string) {
  const data = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('program')
  const [dateRange, setDateRange] = useState<DateRange>('30d')
  const [module, setModule] = useState<string>('all')
  const { data: objects, isLoading: objLoading } = useObjects()
  const { data: issues, isLoading: issLoading } = useIssues()
  const { data: meetings, isLoading: mtgLoading } = useMeetings()
  const { data: stageHistory, isLoading: shLoading } = useAllStageHistory()

  if (objLoading || issLoading || shLoading || mtgLoading) return <LoadingSkeleton />

  const cutoff = getDateCutoff(dateRange)
  const moduleKeys = Object.keys(MODULE_LABELS) as ModuleType[]

  const allObjects = module === 'all'
    ? (objects || [])
    : (objects || []).filter(o => o.module === module)
  const allIssues = module === 'all'
    ? (issues || [])
    : (issues || []).filter(i => i.object_module === module)
  const allMeetings = meetings || []
  const allHistory = stageHistory || []

  const handleExportAll = () => {
    exportReportsToExcel(allObjects, allIssues, allHistory, cutoff)
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-6xl">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Reports</h1>
        <button
          onClick={handleExportAll}
          className="h-8 px-4 rounded-lg text-sm font-medium cursor-pointer border"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text-secondary)' }}
        >
          Export All
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="h-9 px-4 text-xs font-medium cursor-pointer border-none whitespace-nowrap"
            style={{
              backgroundColor: activeTab === tab.key ? 'var(--color-accent)' : 'transparent',
              color: activeTab === tab.key ? '#fff' : 'var(--color-text-secondary)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3">
        <select
          value={dateRange}
          onChange={e => setDateRange(e.target.value as DateRange)}
          className="h-8 px-3 rounded-lg text-xs border outline-none cursor-pointer"
          style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="all">All Time</option>
        </select>
        <select
          value={module}
          onChange={e => setModule(e.target.value)}
          className="h-8 px-3 rounded-lg text-xs border outline-none cursor-pointer"
          style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
        >
          <option value="all">All Modules</option>
          {moduleKeys.map(k => (
            <option key={k} value={k}>{MODULE_LABELS[k]}</option>
          ))}
        </select>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'program' && (
          <>
            <ModuleReport objects={allObjects} moduleKeys={moduleKeys} />
            <PipelineReport objects={allObjects} />
            <WorkloadReport objects={allObjects} issues={allIssues} />
          </>
        )}
        {activeTab === 'objects' && <ObjectsReport objects={allObjects} moduleKeys={moduleKeys} />}
        {activeTab === 'issues' && <IssuesReport issues={allIssues} />}
        {activeTab === 'meetings' && <MeetingsReport meetings={allMeetings} cutoff={cutoff} />}
        {activeTab === 'weekly' && <WeeklyTrend issues={allIssues} stageHistory={allHistory} cutoff={cutoff} />}
      </div>
    </div>
  )
}

// ─── Download helper ───
function DownloadButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="h-7 px-3 rounded text-[11px] font-medium cursor-pointer border"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text-secondary)' }}
    >
      {label}
    </button>
  )
}

// ─── Tooltip style ───
const tooltipStyle = {
  backgroundColor: 'var(--color-bg-tertiary)',
  border: '1px solid var(--color-border)',
  borderRadius: '8px',
  fontSize: '12px',
  color: 'var(--color-text-primary)',
}

/* ═══════════════════════════════════════════ */
/* Tab 1: Program Overview                     */
/* ═══════════════════════════════════════════ */
function ModuleReport({ objects, moduleKeys }: { objects: ObjectWithComputed[]; moduleKeys: ModuleType[] }) {
  const statuses: ObjectStatus[] = ['on_track', 'at_risk', 'blocked', 'completed']
  const modulesWithData = moduleKeys.filter(m => objects.some(o => o.module === m))

  const data = modulesWithData.map(m => {
    const modObj = objects.filter(o => o.module === m)
    const row: Record<string, unknown> = { module: MODULE_LABELS[m] }
    statuses.forEach(s => { row[s] = modObj.filter(o => o.status === s).length })
    row.total = modObj.length
    row.avgAging = modObj.length > 0 ? Math.round(modObj.reduce((s, o) => s + o.aging_days, 0) / modObj.length) : 0
    return row
  })

  const handleDownload = () => {
    const rows = data.map(d => ({
      Module: d.module as string,
      Total: d.total as number,
      'On Track': d.on_track as number,
      'At Risk': d.at_risk as number,
      Blocked: d.blocked as number,
      Completed: d.completed as number,
      'Avg Aging': d.avgAging as number,
    }))
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)
    autoFitColumns(ws, rows)
    XLSX.utils.book_append_sheet(wb, ws, 'By Module')
    triggerDownload(wb, `report-by-module-${formatDateStr(new Date().toISOString())}.xlsx`)
  }

  return (
    <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold">Progress by Module</h2>
        <DownloadButton label="Download" onClick={handleDownload} />
      </div>
      {data.length > 0 ? (
        <>
          <div style={{ height: Math.max(100, data.length * 40) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 120 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--color-text-tertiary)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="module" tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false} width={110} />
                <Tooltip contentStyle={tooltipStyle} />
                {statuses.map(s => (
                  <Bar key={s} dataKey={s} stackId="status" fill={STATUS_COLORS[s]} name={STATUS_LABELS[s]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  {['Module', 'Total', 'On Track', 'At Risk', 'Blocked', 'Completed', 'Avg Aging'].map(h => (
                    <th key={h} className="text-left px-2 py-1.5 font-medium" style={{ color: 'var(--color-text-tertiary)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map(row => (
                  <tr key={row.module as string} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td className="px-2 py-1.5 font-medium">{row.module as string}</td>
                    <td className="px-2 py-1.5 font-[family-name:var(--font-data)]">{row.total as number}</td>
                    <td className="px-2 py-1.5 font-[family-name:var(--font-data)]">{row.on_track as number}</td>
                    <td className="px-2 py-1.5 font-[family-name:var(--font-data)]">{row.at_risk as number}</td>
                    <td className="px-2 py-1.5 font-[family-name:var(--font-data)]">{row.blocked as number}</td>
                    <td className="px-2 py-1.5 font-[family-name:var(--font-data)]">{row.completed as number}</td>
                    <td className="px-2 py-1.5 font-[family-name:var(--font-data)]">{row.avgAging as number}d</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="text-xs text-center py-6" style={{ color: 'var(--color-text-tertiary)' }}>No data for selected module.</p>
      )}
    </div>
  )
}

function PipelineReport({ objects }: { objects: ObjectWithComputed[] }) {
  const total = objects.length
  const data = LIFECYCLE_STAGES.map(stage => {
    const stageObjects = objects.filter(o => o.current_stage === stage)
    const count = stageObjects.length
    return {
      stage, label: STAGE_LABELS[stage], count,
      pct: total > 0 ? Math.round((count / total) * 100) : 0,
      avgDays: stageObjects.length > 0 ? Math.round(stageObjects.reduce((s, o) => s + o.aging_days, 0) / stageObjects.length) : 0,
      blocked: stageObjects.filter(o => o.status === 'blocked').length,
      color: STAGE_CHART_COLORS[stage],
    }
  })
  const maxStage = data.reduce((max, d) => d.count > max.count ? d : max, data[0])
  const hasBottleneck = maxStage && total > 0 && maxStage.pct > 40

  const handleDownload = () => {
    const rows = data.map(d => ({ Stage: d.label, Count: d.count, '% of Total': `${d.pct}%`, 'Avg Days': d.avgDays, Blocked: d.blocked }))
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)
    autoFitColumns(ws, rows)
    XLSX.utils.book_append_sheet(wb, ws, 'Pipeline')
    triggerDownload(wb, `report-pipeline-${formatDateStr(new Date().toISOString())}.xlsx`)
  }

  return (
    <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold">Pipeline by Stage</h2>
        <DownloadButton label="Download" onClick={handleDownload} />
      </div>
      {hasBottleneck && (
        <div className="mb-3 px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: 'color-mix(in srgb, var(--color-status-amber) 15%, transparent)', color: 'var(--color-status-amber)' }}>
          Bottleneck: {maxStage.pct}% of objects are at "{maxStage.label}"
        </div>
      )}
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 10, bottom: 25, left: 10 }}>
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--color-text-tertiary)' }} angle={-35} textAnchor="end" interval={0} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-tertiary)' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map(entry => <Cell key={entry.stage} fill={entry.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              {['Stage', 'Count', '% of Total', 'Avg Days', 'Blocked'].map(h => (
                <th key={h} className="text-left px-2 py-1.5 font-medium" style={{ color: 'var(--color-text-tertiary)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map(row => (
              <tr key={row.stage} style={{
                borderBottom: '1px solid var(--color-border)',
                backgroundColor: hasBottleneck && row.stage === maxStage.stage ? 'color-mix(in srgb, var(--color-status-amber) 8%, transparent)' : undefined,
              }}>
                <td className="px-2 py-1.5 font-medium">{row.label}</td>
                <td className="px-2 py-1.5 font-[family-name:var(--font-data)]">{row.count}</td>
                <td className="px-2 py-1.5 font-[family-name:var(--font-data)]">{row.pct}%</td>
                <td className="px-2 py-1.5 font-[family-name:var(--font-data)]">{row.stage === 'live' ? '-' : `${row.avgDays}d`}</td>
                <td className="px-2 py-1.5 font-[family-name:var(--font-data)]">{row.stage === 'live' ? '-' : row.blocked}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function WorkloadReport({ objects, issues }: { objects: ObjectWithComputed[]; issues: IssueWithObject[] }) {
  const [groupBy, setGroupBy] = useState<'owner' | 'team'>('owner')
  const statuses: ObjectStatus[] = ['on_track', 'at_risk', 'blocked', 'completed']
  const groupField = groupBy === 'owner' ? 'owner_alias' : 'team_alias'
  const groups = new Map<string, ObjectWithComputed[]>()
  objects.forEach(o => {
    const key = o[groupField] || '(Unassigned)'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(o)
  })
  const data = Array.from(groups.entries()).map(([name, objs]) => {
    const row: Record<string, unknown> = { name }
    statuses.forEach(s => { row[s] = objs.filter(o => o.status === s).length })
    row.total = objs.length
    const objectIds = new Set(objs.map(o => o.id))
    row.openIssues = issues.filter(i => {
      const issueObjId = (i as IssueWithObject & { object_id: string }).object_id
      return objectIds.has(issueObjId) && i.status !== 'closed' && i.status !== 'resolved'
    }).length
    return row
  }).sort((a, b) => (b.total as number) - (a.total as number))

  const handleDownload = () => {
    const rows = data.map(d => ({
      [groupBy === 'owner' ? 'Owner' : 'Team']: d.name as string,
      Objects: d.total as number,
      'On Track': d.on_track as number,
      'At Risk': d.at_risk as number,
      Blocked: d.blocked as number,
      'Open Issues': d.openIssues as number,
    }))
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{}])
    if (rows.length > 0) autoFitColumns(ws, rows)
    XLSX.utils.book_append_sheet(wb, ws, `By ${groupBy === 'owner' ? 'Owner' : 'Team'}`)
    triggerDownload(wb, `report-workload-${formatDateStr(new Date().toISOString())}.xlsx`)
  }

  return (
    <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold">Workload by {groupBy === 'owner' ? 'Owner' : 'Team'}</h2>
          <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--color-border)' }}>
            {(['owner', 'team'] as const).map(g => (
              <button key={g} onClick={() => setGroupBy(g)} className="px-3 py-1 text-[10px] font-medium cursor-pointer border-none capitalize"
                style={{ backgroundColor: groupBy === g ? 'var(--color-accent)' : 'transparent', color: groupBy === g ? '#fff' : 'var(--color-text-secondary)' }}>
                {g}
              </button>
            ))}
          </div>
        </div>
        <DownloadButton label="Download" onClick={handleDownload} />
      </div>
      {data.length > 0 ? (
        <>
          <div style={{ height: Math.max(120, data.length * 36) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.map(d => ({ ...d, name: (d.name as string).length > 15 ? (d.name as string).slice(0, 15) + '...' : d.name }))} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 100 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--color-text-tertiary)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false} width={90} />
                <Tooltip contentStyle={tooltipStyle} />
                {statuses.map(s => <Bar key={s} dataKey={s} stackId="status" fill={STATUS_COLORS[s]} name={STATUS_LABELS[s]} />)}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  {[groupBy === 'owner' ? 'Owner' : 'Team', 'Objects', 'On Track', 'At Risk', 'Blocked', 'Open Issues'].map(h => (
                    <th key={h} className="text-left px-2 py-1.5 font-medium" style={{ color: 'var(--color-text-tertiary)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map(row => (
                  <tr key={row.name as string} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td className="px-2 py-1.5 font-medium font-[family-name:var(--font-data)]">{row.name as string}</td>
                    <td className="px-2 py-1.5 font-[family-name:var(--font-data)]">{row.total as number}</td>
                    <td className="px-2 py-1.5 font-[family-name:var(--font-data)]">{row.on_track as number}</td>
                    <td className="px-2 py-1.5 font-[family-name:var(--font-data)]">{row.at_risk as number}</td>
                    <td className="px-2 py-1.5 font-[family-name:var(--font-data)]">{row.blocked as number}</td>
                    <td className="px-2 py-1.5 font-[family-name:var(--font-data)]">{row.openIssues as number}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="text-xs text-center py-6" style={{ color: 'var(--color-text-tertiary)' }}>No data.</p>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════ */
/* Tab 2: Objects Report                       */
/* ═══════════════════════════════════════════ */
function ObjectsReport({ objects, moduleKeys }: { objects: ObjectWithComputed[]; moduleKeys: ModuleType[] }) {
  const handleDownload = () => {
    const rows = objects.map(o => ({
      Name: o.name,
      Module: MODULE_LABELS[o.module],
      Category: o.category,
      Region: o.region,
      Status: STATUS_LABELS[o.status],
      Stage: STAGE_LABELS[o.current_stage],
      'Progress %': o.progress_percent,
      'Aging (days)': o.aging_days,
      Owner: o.owner_alias || '',
      Team: o.team_alias || '',
      'Open Issues': o.open_issue_count,
      Created: formatDateStr(o.created_at),
    }))
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{}])
    if (rows.length > 0) autoFitColumns(ws, rows)
    XLSX.utils.book_append_sheet(wb, ws, 'Objects')
    triggerDownload(wb, `report-objects-${formatDateStr(new Date().toISOString())}.xlsx`)
  }

  // Status breakdown
  const statusData = (['on_track', 'at_risk', 'blocked', 'completed'] as ObjectStatus[])
    .map(s => ({ name: STATUS_LABELS[s], value: objects.filter(o => o.status === s).length, color: STATUS_COLORS[s] }))
    .filter(d => d.value > 0)

  // Module breakdown
  const moduleData = moduleKeys
    .map(m => ({ name: MODULE_LABELS[m], count: objects.filter(o => o.module === m).length }))
    .filter(d => d.count > 0)
  const maxModCount = moduleData.length > 0 ? Math.max(...moduleData.map(d => d.count)) : 1

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Objects Summary ({objects.length} total)</h2>
          <DownloadButton label="Download Objects" onClick={handleDownload} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Status Donut */}
          <div>
            <h3 className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>By Status</h3>
            {statusData.length > 0 ? (
              <div className="flex items-center gap-4">
                <div className="w-28 h-28 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusData} dataKey="value" innerRadius={25} outerRadius={50} paddingAngle={2}>
                        {statusData.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1">
                  {statusData.map(d => (
                    <div key={d.name} className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>{d.name}</span>
                      <span className="text-[11px] font-[family-name:var(--font-data)] font-medium">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>No data.</p>
            )}
          </div>

          {/* Module Bars */}
          <div>
            <h3 className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>By Module</h3>
            <div className="space-y-2">
              {moduleData.map(d => (
                <div key={d.name}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>{d.name}</span>
                    <span className="text-[11px] font-[family-name:var(--font-data)]">{d.count}</span>
                  </div>
                  <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.max(3, (d.count / maxModCount) * 100)}%`, backgroundColor: 'var(--color-accent)' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Full table */}
      <div className="p-4 rounded-lg border overflow-x-auto" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
        <h3 className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>All Objects</h3>
        <table className="w-full text-xs">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              {['Name', 'Module', 'Stage', 'Status', 'Progress', 'Aging', 'Owner', 'Issues'].map(h => (
                <th key={h} className="text-left px-2 py-1.5 font-medium whitespace-nowrap" style={{ color: 'var(--color-text-tertiary)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {objects.map(o => (
              <tr key={o.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td className="px-2 py-1.5 font-medium font-[family-name:var(--font-data)]">{o.name}</td>
                <td className="px-2 py-1.5">{MODULE_LABELS[o.module]}</td>
                <td className="px-2 py-1.5">{STAGE_LABELS[o.current_stage]}</td>
                <td className="px-2 py-1.5">{STATUS_LABELS[o.status]}</td>
                <td className="px-2 py-1.5 font-[family-name:var(--font-data)]">{o.progress_percent}%</td>
                <td className="px-2 py-1.5 font-[family-name:var(--font-data)]">{o.aging_days}d</td>
                <td className="px-2 py-1.5 font-[family-name:var(--font-data)]">{o.owner_alias || '-'}</td>
                <td className="px-2 py-1.5 font-[family-name:var(--font-data)]" style={{ color: o.open_issue_count > 0 ? 'var(--color-status-red)' : undefined }}>
                  {o.open_issue_count}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════ */
/* Tab 3: Issues Report                        */
/* ═══════════════════════════════════════════ */
function IssuesReport({ issues }: { issues: IssueWithObject[] }) {
  const openIssues = issues.filter(i => i.status !== 'closed' && i.status !== 'resolved')

  const handleDownload = () => {
    const rows = issues.map(i => ({
      Title: i.title,
      Object: i.object_name,
      Module: MODULE_LABELS[i.object_module],
      Type: ISSUE_TYPE_LABELS[i.issue_type],
      Stage: STAGE_LABELS[i.lifecycle_stage],
      Status: ISSUE_STATUS_LABELS[i.status],
      'Next Action': i.next_action ? NEXT_ACTION_LABELS[i.next_action] : '',
      Owner: i.owner_alias || '',
      'Age (days)': i.age_days,
      Decision: i.decision || '',
      Created: formatDateStr(i.created_at),
      Resolved: formatDateStr(i.resolved_at),
    }))
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{}])
    if (rows.length > 0) autoFitColumns(ws, rows)
    XLSX.utils.book_append_sheet(wb, ws, 'Issues')
    triggerDownload(wb, `report-issues-${formatDateStr(new Date().toISOString())}.xlsx`)
  }

  // Status breakdown
  const statusKeys = Object.keys(ISSUE_STATUS_LABELS) as (keyof typeof ISSUE_STATUS_LABELS)[]
  const statusData = statusKeys
    .map(s => ({ name: ISSUE_STATUS_LABELS[s], value: issues.filter(i => i.status === s).length, color: ISSUE_STATUS_COLORS[s] || '#6B7280' }))
    .filter(d => d.value > 0)

  // Type breakdown
  const typeKeys = Object.keys(ISSUE_TYPE_LABELS) as (keyof typeof ISSUE_TYPE_LABELS)[]
  const typeData = typeKeys
    .map(k => ({ name: ISSUE_TYPE_LABELS[k], count: issues.filter(i => i.issue_type === k).length }))
    .filter(d => d.count > 0)
  const maxTypeCount = typeData.length > 0 ? Math.max(...typeData.map(d => d.count)) : 1

  // Next action breakdown
  const actionKeys = Object.keys(NEXT_ACTION_LABELS) as NextAction[]
  const actionData = actionKeys.map(k => ({
    name: NEXT_ACTION_LABELS[k],
    count: openIssues.filter(i => i.next_action === k).length,
  }))
  const noActionCount = openIssues.filter(i => !i.next_action).length

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Issues Summary ({issues.length} total, {openIssues.length} open)</h2>
          <DownloadButton label="Download Issues" onClick={handleDownload} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Status Donut */}
          <div>
            <h3 className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>By Status</h3>
            {statusData.length > 0 ? (
              <div className="flex items-center gap-3">
                <div className="w-24 h-24 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusData} dataKey="value" innerRadius={20} outerRadius={42} paddingAngle={2}>
                        {statusData.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1">
                  {statusData.map(d => (
                    <div key={d.name} className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>{d.name}</span>
                      <span className="text-[10px] font-[family-name:var(--font-data)] font-medium">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>No issues.</p>
            )}
          </div>

          {/* Type Bars */}
          <div>
            <h3 className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>By Type</h3>
            <div className="space-y-1.5">
              {typeData.map(d => (
                <div key={d.name}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>{d.name}</span>
                    <span className="text-[10px] font-[family-name:var(--font-data)]">{d.count}</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.max(3, (d.count / maxTypeCount) * 100)}%`, backgroundColor: 'var(--color-accent)' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Next Actions */}
          <div>
            <h3 className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>Next Actions (Open)</h3>
            <div className="space-y-1.5">
              {actionData.map(d => (
                <div key={d.name} className="flex items-center justify-between">
                  <span className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>{d.name}</span>
                  <span className="text-[10px] font-[family-name:var(--font-data)] font-medium">{d.count}</span>
                </div>
              ))}
              <div className="flex items-center justify-between">
                <span className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>No action set</span>
                <span className="text-[10px] font-[family-name:var(--font-data)]" style={{ color: 'var(--color-text-tertiary)' }}>{noActionCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full table */}
      <div className="p-4 rounded-lg border overflow-x-auto" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
        <h3 className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>All Issues</h3>
        <table className="w-full text-xs">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              {['Title', 'Object', 'Type', 'Stage', 'Status', 'Next Action', 'Owner', 'Age'].map(h => (
                <th key={h} className="text-left px-2 py-1.5 font-medium whitespace-nowrap" style={{ color: 'var(--color-text-tertiary)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {issues.map(i => (
              <tr key={i.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td className="px-2 py-1.5 font-medium max-w-[200px] truncate">{i.title}</td>
                <td className="px-2 py-1.5 font-[family-name:var(--font-data)]">{i.object_name}</td>
                <td className="px-2 py-1.5">{ISSUE_TYPE_LABELS[i.issue_type]}</td>
                <td className="px-2 py-1.5">{STAGE_LABELS[i.lifecycle_stage]}</td>
                <td className="px-2 py-1.5">{ISSUE_STATUS_LABELS[i.status]}</td>
                <td className="px-2 py-1.5">{i.next_action ? NEXT_ACTION_LABELS[i.next_action] : '-'}</td>
                <td className="px-2 py-1.5 font-[family-name:var(--font-data)]">{i.owner_alias || '-'}</td>
                <td className="px-2 py-1.5 font-[family-name:var(--font-data)]">{i.age_days}d</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════ */
/* Tab 4: Meetings Report                      */
/* ═══════════════════════════════════════════ */
function MeetingsReport({ meetings, cutoff }: { meetings: MeetingRow[]; cutoff: Date | null }) {
  const filtered = cutoff
    ? meetings.filter(m => new Date(m.meeting_date) >= cutoff)
    : meetings

  const handleDownload = () => {
    const rows = filtered.map(m => ({
      Title: m.title,
      Date: formatDateStr(m.meeting_date),
      Type: m.meeting_type === 'ai_conversation' ? 'AI Chat' : m.meeting_type === 'quick_summary' ? 'Summary' : 'Full MoM',
      TLDR: m.tldr || '',
      'Next Steps': (m.next_steps || []).map(s => `${s.action} (${s.owner}, ${s.due_date})`).join('; '),
      'Linked Objects': m.linked_object_ids.length,
      'Linked Issues': m.linked_issue_ids.length,
      Created: formatDateStr(m.created_at),
    }))
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{}])
    if (rows.length > 0) autoFitColumns(ws, rows)
    XLSX.utils.book_append_sheet(wb, ws, 'Meetings')
    triggerDownload(wb, `report-meetings-${formatDateStr(new Date().toISOString())}.xlsx`)
  }

  // Type breakdown
  const typeCount = {
    full_mom: filtered.filter(m => m.meeting_type === 'full_mom').length,
    quick_summary: filtered.filter(m => m.meeting_type === 'quick_summary').length,
    ai_conversation: filtered.filter(m => m.meeting_type === 'ai_conversation').length,
  }

  // Action items
  const allActions = filtered.flatMap(m => (m.next_steps || []).map(s => ({ ...s, meetingTitle: m.title, meetingDate: m.meeting_date })))
  const overdueActions = allActions.filter(a => a.due_date && new Date(a.due_date) < new Date())

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Meetings Summary ({filtered.length} meetings)</h2>
          <DownloadButton label="Download Meetings" onClick={handleDownload} />
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
            <p className="text-[10px] uppercase" style={{ color: 'var(--color-text-tertiary)' }}>Full MoM</p>
            <p className="text-xl font-bold font-[family-name:var(--font-data)]">{typeCount.full_mom}</p>
          </div>
          <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
            <p className="text-[10px] uppercase" style={{ color: 'var(--color-text-tertiary)' }}>Quick Summary</p>
            <p className="text-xl font-bold font-[family-name:var(--font-data)]">{typeCount.quick_summary}</p>
          </div>
          <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
            <p className="text-[10px] uppercase" style={{ color: 'var(--color-text-tertiary)' }}>AI Chats</p>
            <p className="text-xl font-bold font-[family-name:var(--font-data)]">{typeCount.ai_conversation}</p>
          </div>
          <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
            <p className="text-[10px] uppercase" style={{ color: 'var(--color-text-tertiary)' }}>Total Actions</p>
            <p className="text-xl font-bold font-[family-name:var(--font-data)]">
              {allActions.length}
              {overdueActions.length > 0 && (
                <span className="text-xs ml-1" style={{ color: 'var(--color-status-red)' }}>({overdueActions.length} overdue)</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Action items table */}
      {allActions.length > 0 && (
        <div className="p-4 rounded-lg border overflow-x-auto" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
          <h3 className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>Action Items from Meetings</h3>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                {['Action', 'Owner', 'Due Date', 'From Meeting', 'Meeting Date'].map(h => (
                  <th key={h} className="text-left px-2 py-1.5 font-medium whitespace-nowrap" style={{ color: 'var(--color-text-tertiary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allActions.map((a, idx) => {
                const isOverdue = a.due_date && new Date(a.due_date) < new Date()
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td className="px-2 py-1.5">{a.action}</td>
                    <td className="px-2 py-1.5 font-[family-name:var(--font-data)]">{a.owner}</td>
                    <td className="px-2 py-1.5 font-[family-name:var(--font-data)]" style={{ color: isOverdue ? 'var(--color-status-red)' : undefined }}>
                      {a.due_date}{isOverdue ? ' (overdue)' : ''}
                    </td>
                    <td className="px-2 py-1.5 max-w-[200px] truncate">{a.meetingTitle}</td>
                    <td className="px-2 py-1.5 font-[family-name:var(--font-data)]">{formatDateStr(a.meetingDate)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Meetings list */}
      <div className="p-4 rounded-lg border overflow-x-auto" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
        <h3 className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>All Meetings</h3>
        {filtered.length === 0 ? (
          <p className="text-xs text-center py-4" style={{ color: 'var(--color-text-tertiary)' }}>No meetings in selected range.</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                {['Title', 'Date', 'Type', 'TLDR', 'Actions', 'Linked'].map(h => (
                  <th key={h} className="text-left px-2 py-1.5 font-medium whitespace-nowrap" style={{ color: 'var(--color-text-tertiary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => (
                <tr key={m.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td className="px-2 py-1.5 font-medium max-w-[200px] truncate">{m.title}</td>
                  <td className="px-2 py-1.5 font-[family-name:var(--font-data)] whitespace-nowrap">{formatDateStr(m.meeting_date)}</td>
                  <td className="px-2 py-1.5">
                    {m.meeting_type === 'ai_conversation' ? 'AI Chat' : m.meeting_type === 'quick_summary' ? 'Summary' : 'MoM'}
                  </td>
                  <td className="px-2 py-1.5 max-w-[250px] truncate">{m.tldr || '-'}</td>
                  <td className="px-2 py-1.5 font-[family-name:var(--font-data)]">{m.next_steps?.length || 0}</td>
                  <td className="px-2 py-1.5 font-[family-name:var(--font-data)]">{m.linked_object_ids.length + m.linked_issue_ids.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════ */
/* Tab 5: Weekly Trend                         */
/* ═══════════════════════════════════════════ */
function WeeklyTrend({ issues, stageHistory, cutoff }: {
  issues: IssueWithObject[]
  stageHistory: StageHistoryRow[]
  cutoff: Date | null
}) {
  const now = new Date()
  const weekCount = cutoff ? Math.min(12, Math.ceil((now.getTime() - cutoff.getTime()) / (7 * 86400000))) : 12
  const weeks: { start: Date; end: Date; label: string }[] = []
  for (let i = weekCount - 1; i >= 0; i--) {
    const end = new Date(now)
    end.setDate(end.getDate() - (i * 7) - ((end.getDay() + 6) % 7))
    const start = new Date(end)
    start.setHours(0, 0, 0, 0)
    const weekEnd = new Date(start)
    weekEnd.setDate(weekEnd.getDate() + 6)
    weekEnd.setHours(23, 59, 59, 999)
    weeks.push({ start, end: weekEnd, label: `${start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` })
  }

  const stageIndex: Record<string, number> = {}
  LIFECYCLE_STAGES.forEach((s, i) => { stageIndex[s] = i })

  const data = weeks.map(week => {
    const advanced = stageHistory.filter(sh => {
      const t = new Date(sh.transitioned_at)
      return t >= week.start && t <= week.end && stageIndex[sh.to_stage] > stageIndex[sh.from_stage]
    }).length
    const opened = issues.filter(i => { const t = new Date(i.created_at); return t >= week.start && t <= week.end }).length
    const closed = issues.filter(i => {
      if (!i.resolved_at) return false
      const t = new Date(i.resolved_at)
      return t >= week.start && t <= week.end && (i.status === 'resolved' || i.status === 'closed')
    }).length
    return { week: week.label, 'Objects Advanced': advanced, 'Issues Opened': opened, 'Issues Closed': closed }
  })

  const handleDownload = () => {
    const rows = data.map(d => ({
      Week: d.week,
      'Objects Advanced': d['Objects Advanced'],
      'Issues Opened': d['Issues Opened'],
      'Issues Closed': d['Issues Closed'],
      'Net Issues': d['Issues Opened'] - d['Issues Closed'],
    }))
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)
    autoFitColumns(ws, rows)
    XLSX.utils.book_append_sheet(wb, ws, 'Weekly Trend')
    triggerDownload(wb, `report-weekly-trend-${formatDateStr(new Date().toISOString())}.xlsx`)
  }

  return (
    <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold">Weekly Trend</h2>
        <DownloadButton label="Download" onClick={handleDownload} />
      </div>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
            <XAxis dataKey="week" tick={{ fontSize: 9, fill: 'var(--color-text-tertiary)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-tertiary)' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: '10px' }} />
            <Line type="monotone" dataKey="Objects Advanced" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="Issues Opened" stroke="#F59E0B" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="Issues Closed" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              {['Week', 'Objects Advanced', 'Issues Opened', 'Issues Closed', 'Net Issues'].map(h => (
                <th key={h} className="text-left px-2 py-1.5 font-medium" style={{ color: 'var(--color-text-tertiary)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map(row => {
              const net = row['Issues Opened'] - row['Issues Closed']
              return (
                <tr key={row.week} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td className="px-2 py-1.5 font-medium">{row.week}</td>
                  <td className="px-2 py-1.5 font-[family-name:var(--font-data)]">{row['Objects Advanced']}</td>
                  <td className="px-2 py-1.5 font-[family-name:var(--font-data)]">{row['Issues Opened']}</td>
                  <td className="px-2 py-1.5 font-[family-name:var(--font-data)]">{row['Issues Closed']}</td>
                  <td className="px-2 py-1.5 font-[family-name:var(--font-data)]" style={{ color: net > 0 ? 'var(--color-status-red)' : net < 0 ? 'var(--color-status-green)' : undefined }}>
                    {net > 0 ? `+${net}` : net}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
