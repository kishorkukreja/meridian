import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useObjects } from '@/hooks/useObjects'
import { useIssues } from '@/hooks/useIssues'
import { useMeetings } from '@/hooks/useMeetings'
import { useScheduleOccurrences } from '@/hooks/useSchedule'
import { usePinnedObjects, usePinnedIssues } from '@/hooks/usePins'
import { PinButton } from '@/components/PinButton'
import { StatusBadge } from '@/components/StatusBadge'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { MODULE_LABELS, ISSUE_STATUS_LABELS, NEXT_ACTION_LABELS, NEXT_ACTION_COLORS, ISSUE_TYPE_LABELS } from '@/lib/constants'
import { LIFECYCLE_STAGES, STAGE_LABELS } from '@/types/database'
import type { ObjectWithComputed, IssueWithObject, LifecycleStage, ObjectStatus, ModuleType, NextAction, MeetingRow } from '@/types/database'

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

const ISSUE_STATUS_COLORS: Record<string, string> = {
  open: '#3B82F6',
  in_progress: '#F59E0B',
  blocked: '#EF4444',
  resolved: '#10B981',
  closed: '#6B7280',
}

function getWeekRange(): { start: string; end: string } {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return { start: fmt(start), end: fmt(end) }
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { data: objects, isLoading: objLoading } = useObjects()
  const { data: issues, isLoading: issLoading } = useIssues()
  const { data: meetings, isLoading: mtgLoading } = useMeetings()
  const { data: pinnedObjects } = usePinnedObjects()
  const { data: pinnedIssues } = usePinnedIssues()
  const weekRange = useMemo(() => getWeekRange(), [])
  const { data: occurrences } = useScheduleOccurrences(weekRange.start, weekRange.end)

  if (objLoading || issLoading || mtgLoading) return <LoadingSkeleton />

  const allObjects = objects || []
  const allIssues = issues || []
  const allMeetings = meetings || []
  const upcomingOccurrences = (occurrences || []).filter(o => !o.is_past || o.is_today)
  const openIssues = allIssues.filter(i => i.status !== 'closed' && i.status !== 'resolved')
  const blockedObjects = allObjects.filter(o => o.status === 'blocked')
  const blockedIssues = openIssues.filter(i => i.status === 'blocked')
  const atRiskObjects = allObjects.filter(o => o.status === 'at_risk')
  const avgAging = allObjects.length > 0
    ? Math.round(allObjects.reduce((s, o) => s + o.aging_days, 0) / allObjects.length)
    : 0
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl">
      <h1 className="text-lg font-bold">Dashboard</h1>

      {/* KPI Cards - Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <KpiCard
          label="Active Objects"
          value={allObjects.length}
          onClick={() => navigate('/objects')}
        />
        <KpiCard
          label="Open Issues"
          value={openIssues.length}
          sub={blockedIssues.length > 0 ? `${blockedIssues.length} blocked` : undefined}
          color={blockedIssues.length > 0 ? 'var(--color-status-amber)' : undefined}
          onClick={() => navigate('/issues?status=open%2Cin_progress%2Cblocked')}
        />
        <KpiCard
          label="Blocked"
          value={blockedObjects.length + blockedIssues.length}
          sub={`${blockedObjects.length} obj, ${blockedIssues.length} iss`}
          color="var(--color-status-red)"
          onClick={() => navigate('/objects?status=blocked')}
        />
        <KpiCard
          label="At Risk"
          value={atRiskObjects.length}
          color={atRiskObjects.length > 0 ? 'var(--color-status-amber)' : undefined}
          onClick={() => navigate('/objects?status=at_risk')}
        />
        <KpiCard
          label="Avg Aging"
          value={`${avgAging}d`}
          onClick={() => navigate('/objects?sort=aging&order=desc')}
        />
        <KpiCard
          label="Meetings This Week"
          value={upcomingOccurrences.length}
          sub={allMeetings.length > 0 ? `${allMeetings.length} total recorded` : undefined}
          onClick={() => navigate('/schedule')}
        />
      </div>

      {/* Pinned Items */}
      <PinnedItems pinnedObjects={pinnedObjects || []} pinnedIssues={pinnedIssues || []} navigate={navigate} />

      {/* Pipeline Funnel */}
      <PipelineFunnel objects={allObjects} onStageClick={(s) => navigate(`/objects?current_stage=${s}`)} />

      {/* Row: Object Status + Issue Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatusDonut objects={allObjects} />
        <IssueStatusDonut issues={allIssues} />
      </div>

      {/* Row: Module Comparison + Next Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ModuleComparison objects={allObjects} issues={allIssues} />
        <NextActionSummary issues={openIssues} navigate={navigate} />
      </div>

      {/* Row: Upcoming Schedule + Recent Meetings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UpcomingSchedule occurrences={upcomingOccurrences} navigate={navigate} />
        <RecentMeetings meetings={allMeetings} navigate={navigate} />
      </div>

      {/* Issue Type Breakdown */}
      <IssueTypeBreakdown issues={openIssues} navigate={navigate} />

      {/* Recent Activity */}
      <RecentActivity objects={allObjects} issues={allIssues} meetings={allMeetings} navigate={navigate} />
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

function PinnedItems({ pinnedObjects, pinnedIssues, navigate }: {
  pinnedObjects: ObjectWithComputed[]
  pinnedIssues: IssueWithObject[]
  navigate: (path: string) => void
}) {
  if (pinnedObjects.length === 0 && pinnedIssues.length === 0) {
    return (
      <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
        <h2 className="text-sm font-semibold mb-2">Pinned Items</h2>
        <p className="text-xs text-center py-3" style={{ color: 'var(--color-text-tertiary)' }}>
          Star objects or issues to pin them here for quick access.
        </p>
      </div>
    )
  }

  return (
    <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
      <h2 className="text-sm font-semibold mb-3">Pinned Items</h2>
      <div className="space-y-1.5">
        {pinnedObjects.map(obj => (
          <button
            key={obj.id}
            onClick={() => navigate(`/objects/${obj.id}`)}
            className="w-full flex items-center gap-2.5 p-2 rounded cursor-pointer border-none text-left transition-colors duration-150"
            style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
          >
            <PinButton entityType="object" entityId={obj.id} />
            <span className="text-xs font-medium truncate flex-1">{obj.name}</span>
            <StatusBadge status={obj.status} />
          </button>
        ))}
        {pinnedIssues.map(issue => (
          <button
            key={issue.id}
            onClick={() => navigate(`/issues/${issue.id}`)}
            className="w-full flex items-center gap-2.5 p-2 rounded cursor-pointer border-none text-left transition-colors duration-150"
            style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
          >
            <PinButton entityType="issue" entityId={issue.id} />
            <span className="text-xs font-medium truncate flex-1">{issue.title}</span>
            <StatusBadge status={issue.status} type="issue" />
          </button>
        ))}
      </div>
    </div>
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
      <h2 className="text-sm font-semibold mb-3">Object Status</h2>
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

function IssueStatusDonut({ issues }: { issues: IssueWithObject[] }) {
  const statusKeys = Object.keys(ISSUE_STATUS_LABELS) as (keyof typeof ISSUE_STATUS_LABELS)[]
  const data = statusKeys.map(s => ({
    name: ISSUE_STATUS_LABELS[s],
    value: issues.filter(i => i.status === s).length,
    color: ISSUE_STATUS_COLORS[s] || '#6B7280',
  })).filter(d => d.value > 0)

  if (data.length === 0) {
    return (
      <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
        <h2 className="text-sm font-semibold mb-3">Issue Status</h2>
        <p className="text-xs text-center py-8" style={{ color: 'var(--color-text-tertiary)' }}>No issues yet.</p>
      </div>
    )
  }

  return (
    <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
      <h2 className="text-sm font-semibold mb-3">Issue Status</h2>
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
              <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{d.name}</span>
              <span className="text-xs font-[family-name:var(--font-data)] font-medium">{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ModuleComparison({ objects, issues }: { objects: ObjectWithComputed[]; issues: IssueWithObject[] }) {
  const moduleKeys = Object.keys(MODULE_LABELS) as ModuleType[]
  const modulesWithData = moduleKeys.filter(k => objects.some(o => o.module === k))

  return (
    <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
      <h2 className="text-sm font-semibold mb-3">Module Comparison</h2>
      {modulesWithData.length === 0 ? (
        <p className="text-xs text-center py-4" style={{ color: 'var(--color-text-tertiary)' }}>No data yet.</p>
      ) : (
        <div className="space-y-3">
          {modulesWithData.map(key => {
            const modObjects = objects.filter(o => o.module === key)
            const modIssues = issues.filter(i => i.object_module === key)
            const openModIssues = modIssues.filter(i => i.status !== 'closed' && i.status !== 'resolved')
            const avgProgress = modObjects.length > 0
              ? Math.round(modObjects.reduce((s, o) => s + o.progress_percent, 0) / modObjects.length)
              : 0
            const blocked = modObjects.filter(o => o.status === 'blocked').length
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">{MODULE_LABELS[key]}</span>
                  <span className="text-[10px] font-[family-name:var(--font-data)]" style={{ color: 'var(--color-text-tertiary)' }}>
                    {modObjects.length} obj &middot; {openModIssues.length} issues &middot; {avgProgress}%
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
      )}
    </div>
  )
}

function NextActionSummary({ issues, navigate }: { issues: IssueWithObject[]; navigate: (path: string) => void }) {
  const actionKeys = Object.keys(NEXT_ACTION_LABELS) as NextAction[]
  const counts = actionKeys.map(key => ({
    key,
    label: NEXT_ACTION_LABELS[key],
    color: NEXT_ACTION_COLORS[key],
    count: issues.filter(i => i.next_action === key).length,
  }))
  const noAction = issues.filter(i => !i.next_action).length

  return (
    <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
      <h2 className="text-sm font-semibold mb-3">Next Actions (Open Issues)</h2>
      <div className="space-y-2">
        {counts.map(c => (
          <button
            key={c.key}
            onClick={() => navigate(`/issues?next_action=${c.key}`)}
            className="w-full flex items-center justify-between p-2.5 rounded cursor-pointer border-none transition-colors duration-150 text-left"
            style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
          >
            <div className="flex items-center gap-2">
              <span
                className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium"
                style={{ backgroundColor: `color-mix(in srgb, ${c.color} 18%, transparent)`, color: c.color }}
              >
                {c.label}
              </span>
            </div>
            <span className="text-sm font-bold font-[family-name:var(--font-data)]">{c.count}</span>
          </button>
        ))}
        <div className="flex items-center justify-between px-2.5 py-2">
          <span className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>No action set</span>
          <span className="text-xs font-[family-name:var(--font-data)]" style={{ color: 'var(--color-text-tertiary)' }}>{noAction}</span>
        </div>
      </div>
    </div>
  )
}

function IssueTypeBreakdown({ issues, navigate }: { issues: IssueWithObject[]; navigate: (path: string) => void }) {
  const typeKeys = Object.keys(ISSUE_TYPE_LABELS) as (keyof typeof ISSUE_TYPE_LABELS)[]
  const data = typeKeys.map(key => ({
    key,
    label: ISSUE_TYPE_LABELS[key],
    count: issues.filter(i => i.issue_type === key).length,
  })).filter(d => d.count > 0)
  const max = data.length > 0 ? Math.max(...data.map(d => d.count)) : 1

  if (data.length === 0) return null

  return (
    <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
      <h2 className="text-sm font-semibold mb-3">Open Issues by Type</h2>
      <div className="space-y-2">
        {data.map(d => (
          <button
            key={d.key}
            onClick={() => navigate(`/issues?issue_type=${d.key}`)}
            className="w-full flex items-center gap-3 cursor-pointer border-none bg-transparent text-left p-0"
            style={{ color: 'var(--color-text-primary)' }}
          >
            <span className="text-xs w-28 shrink-0 truncate" style={{ color: 'var(--color-text-secondary)' }}>{d.label}</span>
            <div className="flex-1 h-4 rounded-sm overflow-hidden" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
              <div
                className="h-full rounded-sm"
                style={{ width: `${Math.max(3, (d.count / max) * 100)}%`, backgroundColor: 'var(--color-accent)', opacity: 0.7 }}
              />
            </div>
            <span className="text-xs font-[family-name:var(--font-data)] w-8 text-right shrink-0">{d.count}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function UpcomingSchedule({ occurrences, navigate }: {
  occurrences: { meeting: { name: string; time_of_day: string }; date: string; log: { attended?: boolean; invite_sent?: boolean } | null; is_today: boolean }[]
  navigate: (path: string) => void
}) {
  return (
    <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold">Upcoming Schedule</h2>
        <span className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>Next 7 days</span>
      </div>
      {occurrences.length === 0 ? (
        <p className="text-xs text-center py-4" style={{ color: 'var(--color-text-tertiary)' }}>No meetings scheduled this week.</p>
      ) : (
        <div className="space-y-1.5">
          {occurrences.slice(0, 8).map((occ, i) => {
            const d = new Date(occ.date + 'T00:00:00')
            const dayLabel = occ.is_today ? 'Today' : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
            return (
              <button
                key={i}
                onClick={() => navigate('/schedule')}
                className="w-full flex items-center gap-3 p-2 rounded cursor-pointer border-none text-left transition-colors duration-150"
                style={{ backgroundColor: occ.is_today ? 'color-mix(in srgb, var(--color-accent) 8%, transparent)' : 'var(--color-bg-tertiary)' }}
              >
                <span className="text-[10px] font-[family-name:var(--font-data)] w-20 shrink-0" style={{ color: occ.is_today ? 'var(--color-accent)' : 'var(--color-text-tertiary)' }}>
                  {dayLabel}
                </span>
                <span className="text-[10px] font-[family-name:var(--font-data)] w-12 shrink-0" style={{ color: 'var(--color-text-tertiary)' }}>
                  {occ.meeting.time_of_day}
                </span>
                <span className="text-xs truncate flex-1">{occ.meeting.name}</span>
                {occ.log?.attended && (
                  <span className="text-[10px] shrink-0" style={{ color: 'var(--color-status-green)' }}>Attended</span>
                )}
                {occ.log?.invite_sent && !occ.log?.attended && (
                  <span className="text-[10px] shrink-0" style={{ color: 'var(--color-status-blue)' }}>Invited</span>
                )}
              </button>
            )
          })}
          {occurrences.length > 8 && (
            <button
              onClick={() => navigate('/schedule')}
              className="w-full text-center text-[10px] py-1 cursor-pointer border-none bg-transparent"
              style={{ color: 'var(--color-accent)' }}
            >
              +{occurrences.length - 8} more &rarr;
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function RecentMeetings({ meetings, navigate }: { meetings: MeetingRow[]; navigate: (path: string) => void }) {
  const recent = meetings.slice(0, 5)

  return (
    <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold">Recent Meetings</h2>
        <button
          onClick={() => navigate('/meetings')}
          className="text-[10px] cursor-pointer border-none bg-transparent"
          style={{ color: 'var(--color-accent)' }}
        >
          View all &rarr;
        </button>
      </div>
      {recent.length === 0 ? (
        <p className="text-xs text-center py-4" style={{ color: 'var(--color-text-tertiary)' }}>No meetings recorded yet.</p>
      ) : (
        <div className="space-y-1.5">
          {recent.map(meeting => (
            <button
              key={meeting.id}
              onClick={() => navigate(`/meetings/${meeting.id}`)}
              className="w-full flex items-center gap-3 p-2 rounded cursor-pointer border-none text-left transition-colors duration-150"
              style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
            >
              <span className="text-[10px] font-[family-name:var(--font-data)] w-20 shrink-0" style={{ color: 'var(--color-text-tertiary)' }}>
                {new Date(meeting.meeting_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </span>
              <div className="flex-1 min-w-0">
                <span className="text-xs truncate block">{meeting.title}</span>
                {meeting.tldr && (
                  <span className="text-[10px] truncate block" style={{ color: 'var(--color-text-tertiary)' }}>{meeting.tldr}</span>
                )}
              </div>
              {meeting.next_steps && meeting.next_steps.length > 0 && (
                <span className="text-[10px] shrink-0 px-1.5 py-0.5 rounded" style={{ backgroundColor: 'color-mix(in srgb, var(--color-accent) 15%, transparent)', color: 'var(--color-accent)' }}>
                  {meeting.next_steps.length} actions
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function RecentActivity({ objects, issues, meetings, navigate }: {
  objects: ObjectWithComputed[]
  issues: IssueWithObject[]
  meetings: MeetingRow[]
  navigate: (path: string) => void
}) {
  const events: { time: string; icon: string; msg: string; link: string }[] = []

  issues.forEach(i => {
    events.push({ time: i.created_at, icon: '!', msg: `Issue opened: "${i.title}" on ${i.object_name}`, link: `/issues/${i.id}` })
    if (i.resolved_at) {
      events.push({ time: i.resolved_at, icon: '\u2713', msg: `Issue resolved: "${i.title}"`, link: `/issues/${i.id}` })
    }
  })

  objects.forEach(o => {
    events.push({ time: o.created_at, icon: '+', msg: `Object created: ${o.name}`, link: `/objects/${o.id}` })
  })

  meetings.forEach(m => {
    events.push({ time: m.created_at, icon: 'M', msg: `Meeting recorded: "${m.title}"`, link: `/meetings/${m.id}` })
  })

  events.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
  const recent = events.slice(0, 12)

  return (
    <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
      <h2 className="text-sm font-semibold mb-3">Recent Activity</h2>
      {recent.length === 0 ? (
        <p className="text-xs text-center py-4" style={{ color: 'var(--color-text-tertiary)' }}>No activity yet.</p>
      ) : (
        <div className="space-y-1">
          {recent.map((event, i) => (
            <button
              key={i}
              onClick={() => navigate(event.link)}
              className="w-full flex items-center gap-3 p-2 rounded text-left cursor-pointer border-none transition-colors duration-150"
              style={{ backgroundColor: 'transparent', color: 'var(--color-text-primary)' }}
            >
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                style={{
                  backgroundColor: event.icon === '!' ? 'color-mix(in srgb, var(--color-status-amber) 20%, transparent)'
                    : event.icon === '\u2713' ? 'color-mix(in srgb, var(--color-status-green) 20%, transparent)'
                    : event.icon === 'M' ? 'color-mix(in srgb, var(--color-accent) 20%, transparent)'
                    : 'color-mix(in srgb, var(--color-status-blue) 20%, transparent)',
                  color: event.icon === '!' ? 'var(--color-status-amber)'
                    : event.icon === '\u2713' ? 'var(--color-status-green)'
                    : event.icon === 'M' ? 'var(--color-accent)'
                    : 'var(--color-status-blue)',
                }}
              >
                {event.icon}
              </span>
              <span className="text-[10px] font-[family-name:var(--font-data)] w-16 shrink-0" style={{ color: 'var(--color-text-tertiary)' }}>
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
