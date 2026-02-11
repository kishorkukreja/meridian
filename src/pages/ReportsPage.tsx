import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, Legend,
} from 'recharts'
import { useObjects } from '@/hooks/useObjects'
import { useIssues } from '@/hooks/useIssues'
import { useAllStageHistory } from '@/hooks/useStageHistory'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { exportReportsToExcel } from '@/lib/exportExcel'
import { MODULE_LABELS, STATUS_LABELS } from '@/lib/constants'
import { LIFECYCLE_STAGES, STAGE_LABELS } from '@/types/database'
import type { ObjectWithComputed, IssueWithObject, StageHistoryRow, LifecycleStage, ObjectStatus, ModuleType } from '@/types/database'

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

type DateRange = '7d' | '30d' | '90d' | 'all'
type GroupBy = 'owner' | 'team'

function getDateCutoff(range: DateRange): Date | null {
  if (range === 'all') return null
  const now = new Date()
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90
  return new Date(now.getTime() - days * 86400000)
}

function filterByModule<T extends { module?: ModuleType }>(items: T[], module: string): T[] {
  if (module === 'all') return items
  return items.filter(i => i.module === module)
}

export function ReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange>('30d')
  const [module, setModule] = useState<string>('all')
  const { data: objects, isLoading: objLoading } = useObjects()
  const { data: issues, isLoading: issLoading } = useIssues()
  const { data: stageHistory, isLoading: shLoading } = useAllStageHistory()

  if (objLoading || issLoading || shLoading) return <LoadingSkeleton />

  const cutoff = getDateCutoff(dateRange)
  const allObjects = filterByModule(
    (objects || []).map(o => ({ ...o, module: o.module })),
    module
  )
  const allIssues = (issues || []).filter(i => {
    if (module !== 'all' && i.object_module !== module) return false
    return true
  })
  const allHistory = stageHistory || []

  const handleExport = () => {
    exportReportsToExcel(allObjects, allIssues, allHistory, cutoff)
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Reports</h1>
        <button
          onClick={handleExport}
          className="h-8 px-4 rounded-lg text-sm font-medium cursor-pointer border"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text-secondary)' }}
        >
          Export All
        </button>
      </div>

      {/* Controls Bar */}
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
          <option value="demand_planning">Demand Planning</option>
          <option value="supply_planning">Supply Planning</option>
        </select>
      </div>

      {/* Report Cards */}
      <ModuleReport objects={allObjects} />
      <PipelineReport objects={allObjects} />
      <WorkloadReport objects={allObjects} issues={allIssues} />
      <WeeklyTrend issues={allIssues} stageHistory={allHistory} cutoff={cutoff} />
    </div>
  )
}

/* ─── Report 1: Progress by Module ─── */
function ModuleReport({ objects }: { objects: ObjectWithComputed[] }) {
  const modules: ModuleType[] = ['demand_planning', 'supply_planning']
  const statuses: ObjectStatus[] = ['on_track', 'at_risk', 'blocked', 'completed']

  const data = modules.map(m => {
    const modObj = objects.filter(o => o.module === m)
    const row: Record<string, unknown> = { module: MODULE_LABELS[m] }
    statuses.forEach(s => { row[s] = modObj.filter(o => o.status === s).length })
    row.total = modObj.length
    row.avgAging = modObj.length > 0 ? Math.round(modObj.reduce((s, o) => s + o.aging_days, 0) / modObj.length) : 0
    return row
  })

  return (
    <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
      <h2 className="text-sm font-semibold mb-3">Progress by Module</h2>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 100 }}>
            <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--color-text-tertiary)' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <YAxis type="category" dataKey="module" tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false} width={90} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-bg-tertiary)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                fontSize: '12px',
                color: 'var(--color-text-primary)',
              }}
            />
            {statuses.map(s => (
              <Bar key={s} dataKey={s} stackId="status" fill={STATUS_COLORS[s]} name={STATUS_LABELS[s]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* Data Table */}
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
    </div>
  )
}

/* ─── Report 2: Pipeline by Stage ─── */
function PipelineReport({ objects }: { objects: ObjectWithComputed[] }) {
  const total = objects.length
  const data = LIFECYCLE_STAGES.map(stage => {
    const stageObjects = objects.filter(o => o.current_stage === stage)
    const count = stageObjects.length
    const avgDays = stageObjects.length > 0
      ? Math.round(stageObjects.reduce((s, o) => s + o.aging_days, 0) / stageObjects.length)
      : 0
    const blocked = stageObjects.filter(o => o.status === 'blocked').length
    return {
      stage,
      label: STAGE_LABELS[stage],
      count,
      pct: total > 0 ? Math.round((count / total) * 100) : 0,
      avgDays,
      blocked,
      color: STAGE_CHART_COLORS[stage],
    }
  })

  const maxStage = data.reduce((max, d) => d.count > max.count ? d : max, data[0])
  const hasBottleneck = maxStage && total > 0 && maxStage.pct > 40

  return (
    <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
      <h2 className="text-sm font-semibold mb-3">Pipeline by Stage</h2>

      {hasBottleneck && (
        <div className="mb-3 px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: 'color-mix(in srgb, var(--color-status-amber) 15%, transparent)', color: 'var(--color-status-amber)' }}>
          Bottleneck: {maxStage.pct}% of objects are at "{maxStage.label}"
        </div>
      )}

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 10, bottom: 25, left: 10 }}>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 9, fill: 'var(--color-text-tertiary)' }}
              angle={-35}
              textAnchor="end"
              interval={0}
              axisLine={false}
              tickLine={false}
            />
            <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-tertiary)' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-bg-tertiary)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                fontSize: '12px',
                color: 'var(--color-text-primary)',
              }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((entry) => (
                <Cell key={entry.stage} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Data Table */}
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
              <tr
                key={row.stage}
                style={{
                  borderBottom: '1px solid var(--color-border)',
                  backgroundColor: hasBottleneck && row.stage === maxStage.stage ? 'color-mix(in srgb, var(--color-status-amber) 8%, transparent)' : undefined,
                }}
              >
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

/* ─── Report 3: Workload by Owner/Team ─── */
function WorkloadReport({ objects, issues }: { objects: ObjectWithComputed[]; issues: IssueWithObject[] }) {
  const [groupBy, setGroupBy] = useState<GroupBy>('owner')
  const statuses: ObjectStatus[] = ['on_track', 'at_risk', 'blocked', 'completed']

  const groupField = groupBy === 'owner' ? 'owner_alias' : 'team_alias'
  const groups = new Map<string, ObjectWithComputed[]>()

  objects.forEach(o => {
    const key = o[groupField] || '(Unassigned)'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(o)
  })

  const data = Array.from(groups.entries())
    .map(([name, objs]) => {
      const row: Record<string, unknown> = { name }
      statuses.forEach(s => { row[s] = objs.filter(o => o.status === s).length })
      row.total = objs.length
      // Count open issues for this group's objects
      const objectIds = new Set(objs.map(o => o.id))
      row.openIssues = issues.filter(i => {
        const issueObjId = (i as IssueWithObject & { object_id: string }).object_id
        return objectIds.has(issueObjId) && i.status !== 'closed' && i.status !== 'resolved'
      }).length
      return row
    })
    .sort((a, b) => (b.total as number) - (a.total as number))

  const chartData = data.map(d => ({
    ...d,
    name: (d.name as string).length > 15 ? (d.name as string).slice(0, 15) + '...' : d.name,
  }))

  return (
    <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold">Workload by {groupBy === 'owner' ? 'Owner' : 'Team'}</h2>
        <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--color-border)' }}>
          {(['owner', 'team'] as const).map(g => (
            <button
              key={g}
              onClick={() => setGroupBy(g)}
              className="px-3 py-1 text-[10px] font-medium cursor-pointer border-none capitalize"
              style={{
                backgroundColor: groupBy === g ? 'var(--color-accent)' : 'transparent',
                color: groupBy === g ? '#fff' : 'var(--color-text-secondary)',
              }}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {data.length > 0 ? (
        <>
          <div style={{ height: Math.max(120, data.length * 36) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 100 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--color-text-tertiary)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false} width={90} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: 'var(--color-text-primary)',
                  }}
                />
                {statuses.map(s => (
                  <Bar key={s} dataKey={s} stackId="status" fill={STATUS_COLORS[s]} name={STATUS_LABELS[s]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Data Table */}
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

/* ─── Report 4: Weekly Trend ─── */
function WeeklyTrend({ issues, stageHistory, cutoff }: {
  issues: IssueWithObject[]
  stageHistory: StageHistoryRow[]
  cutoff: Date | null
}) {
  // Build week buckets (Monday-based)
  const now = new Date()
  const weekCount = cutoff ? Math.min(12, Math.ceil((now.getTime() - cutoff.getTime()) / (7 * 86400000))) : 12
  const weeks: { start: Date; end: Date; label: string }[] = []

  for (let i = weekCount - 1; i >= 0; i--) {
    const end = new Date(now)
    end.setDate(end.getDate() - (i * 7) - ((end.getDay() + 6) % 7)) // Monday of this week
    const start = new Date(end)
    start.setHours(0, 0, 0, 0)
    const weekEnd = new Date(start)
    weekEnd.setDate(weekEnd.getDate() + 6)
    weekEnd.setHours(23, 59, 59, 999)
    weeks.push({
      start,
      end: weekEnd,
      label: `${start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`,
    })
  }

  // Stage index for forward progression check
  const stageIndex: Record<string, number> = {}
  LIFECYCLE_STAGES.forEach((s, i) => { stageIndex[s] = i })

  const data = weeks.map(week => {
    const advanced = stageHistory.filter(sh => {
      const t = new Date(sh.transitioned_at)
      return t >= week.start && t <= week.end && stageIndex[sh.to_stage] > stageIndex[sh.from_stage]
    }).length

    const opened = issues.filter(i => {
      const t = new Date(i.created_at)
      return t >= week.start && t <= week.end
    }).length

    const closed = issues.filter(i => {
      if (!i.resolved_at) return false
      const t = new Date(i.resolved_at)
      return t >= week.start && t <= week.end && (i.status === 'resolved' || i.status === 'closed')
    }).length

    return {
      week: week.label,
      'Objects Advanced': advanced,
      'Issues Opened': opened,
      'Issues Closed': closed,
    }
  })

  return (
    <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
      <h2 className="text-sm font-semibold mb-3">Weekly Trend</h2>

      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
            <XAxis dataKey="week" tick={{ fontSize: 9, fill: 'var(--color-text-tertiary)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-tertiary)' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-bg-tertiary)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                fontSize: '12px',
                color: 'var(--color-text-primary)',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '10px' }} />
            <Line type="monotone" dataKey="Objects Advanced" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="Issues Opened" stroke="#F59E0B" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="Issues Closed" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Data Table */}
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
