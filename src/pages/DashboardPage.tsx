import { useNavigate } from 'react-router-dom'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useObjects } from '@/hooks/useObjects'
import { useIssues } from '@/hooks/useIssues'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { MODULE_LABELS } from '@/lib/constants'
import { LIFECYCLE_STAGES, STAGE_LABELS } from '@/types/database'
import type { ObjectWithComputed, IssueWithObject, LifecycleStage, ObjectStatus } from '@/types/database'

const STATUS_CHART_COLORS: Record<ObjectStatus, string> = {
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

export function DashboardPage() {
  const navigate = useNavigate()
  const { data: objects, isLoading: objLoading } = useObjects()
  const { data: issues, isLoading: issLoading } = useIssues()

  if (objLoading || issLoading) return <LoadingSkeleton />

  const allObjects = objects || []
  const allIssues = issues || []
  const openIssues = allIssues.filter(i => i.status !== 'closed' && i.status !== 'resolved')
  const blockedObjects = allObjects.filter(o => o.status === 'blocked')
  const blockedIssues = openIssues.filter(i => i.status === 'blocked')
  const avgAging = allObjects.length > 0
    ? Math.round(allObjects.reduce((s, o) => s + o.aging_days, 0) / allObjects.length)
    : 0

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl">
      <h1 className="text-lg font-bold">Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Active Objects"
          value={allObjects.length}
          onClick={() => navigate('/objects')}
        />
        <KpiCard
          label="Blocked"
          value={blockedObjects.length + blockedIssues.length}
          sub={`${blockedObjects.length} objects, ${blockedIssues.length} issues`}
          color="var(--color-status-red)"
          onClick={() => navigate('/objects?status=blocked')}
        />
        <KpiCard
          label="Avg Stage Aging"
          value={`${avgAging}d`}
          onClick={() => navigate('/objects?sort=aging&order=desc')}
        />
        <KpiCard
          label="Open Issues"
          value={openIssues.length}
          sub={blockedIssues.length > 0 ? `${blockedIssues.length} blocked` : undefined}
          color={blockedIssues.length > 0 ? 'var(--color-status-amber)' : undefined}
          onClick={() => navigate('/issues?status=open%2Cin_progress%2Cblocked')}
        />
      </div>

      {/* Pipeline Funnel */}
      <PipelineFunnel objects={allObjects} onStageClick={(s) => navigate(`/objects?current_stage=${s}`)} />

      {/* Status + Module Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatusDonut objects={allObjects} />
        <ModuleComparison objects={allObjects} />
      </div>

      {/* Recent Activity */}
      <RecentActivity objects={allObjects} issues={allIssues} navigate={navigate} />
    </div>
  )
}

function KpiCard({ label, value, sub, color, onClick }: {
  label: string; value: number | string; sub?: string; color?: string; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="p-4 rounded-lg border text-left cursor-pointer transition-colors duration-150"
      style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}
    >
      <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-tertiary)' }}>
        {label}
      </p>
      <p
        className="text-2xl font-bold font-[family-name:var(--font-data)]"
        style={{ color: color || 'var(--color-text-primary)' }}
      >
        {value}
      </p>
      {sub && <p className="text-[10px] mt-1" style={{ color: 'var(--color-text-tertiary)' }}>{sub}</p>}
    </button>
  )
}

function PipelineFunnel({ objects, onStageClick }: { objects: ObjectWithComputed[]; onStageClick: (stage: string) => void }) {
  const data = LIFECYCLE_STAGES.map(stage => ({
    stage,
    label: STAGE_LABELS[stage],
    count: objects.filter(o => o.current_stage === stage).length,
    color: STAGE_CHART_COLORS[stage],
  }))
  const total = objects.length
  const completed = objects.filter(o => o.current_stage === 'live').length
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold">Pipeline by Stage</h2>
        <span className="text-xs font-[family-name:var(--font-data)]" style={{ color: 'var(--color-text-tertiary)' }}>
          {completed}/{total} live ({pct}%)
        </span>
      </div>
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
            <YAxis
              tick={{ fontSize: 10, fill: 'var(--color-text-tertiary)' }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-bg-tertiary)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                fontSize: '12px',
                color: 'var(--color-text-primary)',
              }}
            />
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Bar dataKey="count" radius={[4, 4, 0, 0]} cursor="pointer" onClick={(d: any) => onStageClick(d.stage)}>
              {data.map((entry) => (
                <Cell key={entry.stage} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function StatusDonut({ objects }: { objects: ObjectWithComputed[] }) {
  const statuses: ObjectStatus[] = ['on_track', 'at_risk', 'blocked', 'completed']
  const data = statuses.map(s => ({
    name: s.replace('_', ' '),
    value: objects.filter(o => o.status === s).length,
    color: STATUS_CHART_COLORS[s],
  })).filter(d => d.value > 0)

  return (
    <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
      <h2 className="text-sm font-semibold mb-3">Status Distribution</h2>
      <div className="flex items-center gap-4">
        <div className="w-32 h-32 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" innerRadius={30} outerRadius={55} paddingAngle={2}>
                {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-1.5">
          {data.map(d => (
            <div key={d.name} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
              <span className="text-xs capitalize" style={{ color: 'var(--color-text-secondary)' }}>{d.name}</span>
              <span className="text-xs font-[family-name:var(--font-data)] font-medium">{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ModuleComparison({ objects }: { objects: ObjectWithComputed[] }) {
  const modules = [
    { key: 'demand_planning', label: MODULE_LABELS.demand_planning },
    { key: 'supply_planning', label: MODULE_LABELS.supply_planning },
  ] as const

  return (
    <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
      <h2 className="text-sm font-semibold mb-3">Module Comparison</h2>
      <div className="space-y-4">
        {modules.map(m => {
          const modObjects = objects.filter(o => o.module === m.key)
          const avgProgress = modObjects.length > 0
            ? Math.round(modObjects.reduce((s, o) => s + o.progress_percent, 0) / modObjects.length)
            : 0
          const blocked = modObjects.filter(o => o.status === 'blocked').length
          return (
            <div key={m.key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium">{m.label}</span>
                <span className="text-[10px] font-[family-name:var(--font-data)]" style={{ color: 'var(--color-text-tertiary)' }}>
                  {modObjects.length} objects &middot; {avgProgress}% avg
                </span>
              </div>
              <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${avgProgress}%`, backgroundColor: 'var(--color-accent)' }}
                />
              </div>
              {blocked > 0 && (
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-status-red)' }}>
                  {blocked} blocked
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function RecentActivity({ objects, issues, navigate }: {
  objects: ObjectWithComputed[]
  issues: IssueWithObject[]
  navigate: (path: string) => void
}) {
  // Build activity from issues (most reliable timestamps)
  const events: { time: string; msg: string; link: string }[] = []

  issues.forEach(i => {
    events.push({ time: i.created_at, msg: `Issue opened: "${i.title}" on ${i.object_name}`, link: `/issues/${i.id}` })
    if (i.resolved_at) {
      events.push({ time: i.resolved_at, msg: `Issue resolved: "${i.title}" on ${i.object_name}`, link: `/issues/${i.id}` })
    }
  })

  objects.forEach(o => {
    events.push({ time: o.created_at, msg: `Object created: ${o.name}`, link: `/objects/${o.id}` })
  })

  events.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
  const recent = events.slice(0, 10)

  return (
    <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
      <h2 className="text-sm font-semibold mb-3">Recent Activity</h2>
      {recent.length === 0 ? (
        <p className="text-xs text-center py-4" style={{ color: 'var(--color-text-tertiary)' }}>No activity yet.</p>
      ) : (
        <div className="space-y-2">
          {recent.map((event, i) => (
            <button
              key={i}
              onClick={() => navigate(event.link)}
              className="w-full flex items-center gap-3 p-2 rounded text-left cursor-pointer border-none transition-colors duration-150"
              style={{ backgroundColor: 'transparent', color: 'var(--color-text-primary)' }}
            >
              <span className="text-[10px] font-[family-name:var(--font-data)] w-20 shrink-0" style={{ color: 'var(--color-text-tertiary)' }}>
                {new Date(event.time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </span>
              <span className="text-xs truncate">{event.msg}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

