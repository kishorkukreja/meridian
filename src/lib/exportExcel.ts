import * as XLSX from 'xlsx'
import { MODULE_LABELS, CATEGORY_LABELS, SOURCE_SYSTEM_LABELS, REGION_LABELS, ISSUE_TYPE_LABELS, STATUS_LABELS, ISSUE_STATUS_LABELS } from '@/lib/constants'
import { LIFECYCLE_STAGES, STAGE_LABELS } from '@/types/database'
import type { ObjectWithComputed, IssueWithObject, StageHistoryRow } from '@/types/database'

function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toISOString().split('T')[0]
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

function objectsToRows(objects: ObjectWithComputed[]) {
  return objects.map(obj => ({
    'Name': obj.name,
    'Description': obj.description || '',
    'Module': MODULE_LABELS[obj.module],
    'Category': CATEGORY_LABELS[obj.category],
    'Region': REGION_LABELS[obj.region],
    'Source System': SOURCE_SYSTEM_LABELS[obj.source_system],
    'Current Stage': STAGE_LABELS[obj.current_stage],
    'Status': STATUS_LABELS[obj.status],
    'Owner': obj.owner_alias || '',
    'Team': obj.team_alias || '',
    'Aging (days)': obj.aging_days,
    'Open Issues': obj.open_issue_count,
    'Progress (%)': obj.progress_percent,
    'Created': formatDate(obj.created_at),
    'Last Updated': formatDate(obj.updated_at),
  }))
}

function issuesToRows(issues: IssueWithObject[]) {
  return issues.map(issue => ({
    'Title': issue.title,
    'Description': issue.description || '',
    'Parent Object': issue.object_name,
    'Module': MODULE_LABELS[issue.object_module],
    'Issue Type': ISSUE_TYPE_LABELS[issue.issue_type],
    'Lifecycle Stage': STAGE_LABELS[issue.lifecycle_stage],
    'Status': ISSUE_STATUS_LABELS[issue.status],
    'Owner': issue.owner_alias || '',
    'Raised By': issue.raised_by_alias || '',
    'Age (days)': issue.age_days,
    'Decision': issue.decision || '',
    'Blocked By': issue.blocked_by_note || '',
    'Created': formatDate(issue.created_at),
    'Resolved': formatDate(issue.resolved_at),
  }))
}

function autoFitColumns(ws: XLSX.WorkSheet, data: Record<string, unknown>[]) {
  if (data.length === 0) return
  const cols = Object.keys(data[0])
  ws['!cols'] = cols.map(key => {
    const maxLen = Math.max(
      key.length,
      ...data.map(row => String(row[key] ?? '').length),
    )
    return { wch: Math.min(maxLen + 2, 50) }
  })
}

export function exportObjectsToExcel(objects: ObjectWithComputed[]) {
  const rows = objectsToRows(objects)
  const ws = XLSX.utils.json_to_sheet(rows)
  autoFitColumns(ws, rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Objects')
  const date = new Date().toISOString().split('T')[0]
  triggerDownload(wb, `meridian-objects-${date}.xlsx`)
}

export function exportIssuesToExcel(issues: IssueWithObject[]) {
  const rows = issuesToRows(issues)
  const ws = XLSX.utils.json_to_sheet(rows)
  autoFitColumns(ws, rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Issues')
  const date = new Date().toISOString().split('T')[0]
  triggerDownload(wb, `meridian-issues-${date}.xlsx`)
}

export function exportFullWorkbook(allObjects: ObjectWithComputed[], allIssues: IssueWithObject[]) {
  const wb = XLSX.utils.book_new()

  // Objects by module
  const dpObjects = allObjects.filter(o => o.module === 'demand_planning')
  const spObjects = allObjects.filter(o => o.module === 'supply_planning')

  const dpRows = objectsToRows(dpObjects)
  const spRows = objectsToRows(spObjects)

  const dpSheet = XLSX.utils.json_to_sheet(dpRows.length > 0 ? dpRows : [{}])
  if (dpRows.length > 0) autoFitColumns(dpSheet, dpRows)
  XLSX.utils.book_append_sheet(wb, dpSheet, 'Objects - Demand Planning')

  const spSheet = XLSX.utils.json_to_sheet(spRows.length > 0 ? spRows : [{}])
  if (spRows.length > 0) autoFitColumns(spSheet, spRows)
  XLSX.utils.book_append_sheet(wb, spSheet, 'Objects - Supply Planning')

  // Issues by status
  const openIssues = allIssues.filter(i => i.status !== 'resolved' && i.status !== 'closed')
  const resolvedIssues = allIssues.filter(i => i.status === 'resolved' || i.status === 'closed')

  const openRows = issuesToRows(openIssues)
  const resolvedRows = issuesToRows(resolvedIssues)

  const openSheet = XLSX.utils.json_to_sheet(openRows.length > 0 ? openRows : [{}])
  if (openRows.length > 0) autoFitColumns(openSheet, openRows)
  XLSX.utils.book_append_sheet(wb, openSheet, 'Issues - Open')

  const resolvedSheet = XLSX.utils.json_to_sheet(resolvedRows.length > 0 ? resolvedRows : [{}])
  if (resolvedRows.length > 0) autoFitColumns(resolvedSheet, resolvedRows)
  XLSX.utils.book_append_sheet(wb, resolvedSheet, 'Issues - Resolved')

  // Summary sheet
  const summary = [
    { 'Metric': 'Total Objects', 'Demand Planning': dpObjects.length, 'Supply Planning': spObjects.length, 'Total': allObjects.length },
    { 'Metric': 'On Track', 'Demand Planning': dpObjects.filter(o => o.status === 'on_track').length, 'Supply Planning': spObjects.filter(o => o.status === 'on_track').length, 'Total': allObjects.filter(o => o.status === 'on_track').length },
    { 'Metric': 'At Risk', 'Demand Planning': dpObjects.filter(o => o.status === 'at_risk').length, 'Supply Planning': spObjects.filter(o => o.status === 'at_risk').length, 'Total': allObjects.filter(o => o.status === 'at_risk').length },
    { 'Metric': 'Blocked', 'Demand Planning': dpObjects.filter(o => o.status === 'blocked').length, 'Supply Planning': spObjects.filter(o => o.status === 'blocked').length, 'Total': allObjects.filter(o => o.status === 'blocked').length },
    { 'Metric': 'Completed', 'Demand Planning': dpObjects.filter(o => o.status === 'completed').length, 'Supply Planning': spObjects.filter(o => o.status === 'completed').length, 'Total': allObjects.filter(o => o.status === 'completed').length },
    { 'Metric': 'Open Issues', 'Demand Planning': openIssues.filter(i => i.object_module === 'demand_planning').length, 'Supply Planning': openIssues.filter(i => i.object_module === 'supply_planning').length, 'Total': openIssues.length },
    { 'Metric': 'Resolved Issues', 'Demand Planning': resolvedIssues.filter(i => i.object_module === 'demand_planning').length, 'Supply Planning': resolvedIssues.filter(i => i.object_module === 'supply_planning').length, 'Total': resolvedIssues.length },
  ]
  const summarySheet = XLSX.utils.json_to_sheet(summary)
  autoFitColumns(summarySheet, summary)
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary')

  const date = new Date().toISOString().split('T')[0]
  triggerDownload(wb, `meridian-full-export-${date}.xlsx`)
}

export function exportReportsToExcel(
  objects: ObjectWithComputed[],
  issues: IssueWithObject[],
  stageHistory: StageHistoryRow[],
  cutoff: Date | null,
) {
  const wb = XLSX.utils.book_new()

  // Sheet 1: Module Report
  const modules = ['demand_planning', 'supply_planning'] as const
  const moduleRows = modules.map(m => {
    const modObj = objects.filter(o => o.module === m)
    return {
      'Module': MODULE_LABELS[m],
      'Total': modObj.length,
      'On Track': modObj.filter(o => o.status === 'on_track').length,
      'At Risk': modObj.filter(o => o.status === 'at_risk').length,
      'Blocked': modObj.filter(o => o.status === 'blocked').length,
      'Completed': modObj.filter(o => o.status === 'completed').length,
      'Avg Aging (days)': modObj.length > 0 ? Math.round(modObj.reduce((s, o) => s + o.aging_days, 0) / modObj.length) : 0,
    }
  })
  const modSheet = XLSX.utils.json_to_sheet(moduleRows)
  autoFitColumns(modSheet, moduleRows)
  XLSX.utils.book_append_sheet(wb, modSheet, 'By Module')

  // Sheet 2: Pipeline Report
  const total = objects.length
  const pipelineRows = LIFECYCLE_STAGES.map(stage => {
    const stageObj = objects.filter(o => o.current_stage === stage)
    return {
      'Stage': STAGE_LABELS[stage],
      'Count': stageObj.length,
      '% of Total': total > 0 ? `${Math.round((stageObj.length / total) * 100)}%` : '0%',
      'Avg Days at Stage': stageObj.length > 0 ? Math.round(stageObj.reduce((s, o) => s + o.aging_days, 0) / stageObj.length) : 0,
      'Blocked': stageObj.filter(o => o.status === 'blocked').length,
    }
  })
  const pipeSheet = XLSX.utils.json_to_sheet(pipelineRows)
  autoFitColumns(pipeSheet, pipelineRows)
  XLSX.utils.book_append_sheet(wb, pipeSheet, 'By Stage')

  // Sheet 3: Workload Report
  const ownerGroups = new Map<string, typeof objects>()
  objects.forEach(o => {
    const key = o.owner_alias || '(Unassigned)'
    if (!ownerGroups.has(key)) ownerGroups.set(key, [])
    ownerGroups.get(key)!.push(o)
  })
  const workloadRows = Array.from(ownerGroups.entries()).map(([owner, objs]) => ({
    'Owner': owner,
    'Objects': objs.length,
    'On Track': objs.filter(o => o.status === 'on_track').length,
    'At Risk': objs.filter(o => o.status === 'at_risk').length,
    'Blocked': objs.filter(o => o.status === 'blocked').length,
  }))
  const workSheet = XLSX.utils.json_to_sheet(workloadRows.length > 0 ? workloadRows : [{}])
  if (workloadRows.length > 0) autoFitColumns(workSheet, workloadRows)
  XLSX.utils.book_append_sheet(wb, workSheet, 'By Owner')

  // Sheet 4: Weekly Trend
  const stageIndex: Record<string, number> = {}
  LIFECYCLE_STAGES.forEach((s, i) => { stageIndex[s] = i })
  const now = new Date()
  const weekCount = cutoff ? Math.min(12, Math.ceil((now.getTime() - cutoff.getTime()) / (7 * 86400000))) : 12
  const trendRows: Record<string, unknown>[] = []
  for (let i = weekCount - 1; i >= 0; i--) {
    const end = new Date(now)
    end.setDate(end.getDate() - (i * 7) - ((end.getDay() + 6) % 7))
    const start = new Date(end)
    start.setHours(0, 0, 0, 0)
    const weekEnd = new Date(start)
    weekEnd.setDate(weekEnd.getDate() + 6)
    weekEnd.setHours(23, 59, 59, 999)
    const label = `${start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${weekEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
    const advanced = stageHistory.filter(sh => {
      const t = new Date(sh.transitioned_at)
      return t >= start && t <= weekEnd && stageIndex[sh.to_stage] > stageIndex[sh.from_stage]
    }).length
    const opened = issues.filter(iss => {
      const t = new Date(iss.created_at)
      return t >= start && t <= weekEnd
    }).length
    const closed = issues.filter(iss => {
      if (!iss.resolved_at) return false
      const t = new Date(iss.resolved_at)
      return t >= start && t <= weekEnd
    }).length
    trendRows.push({ 'Week': label, 'Objects Advanced': advanced, 'Issues Opened': opened, 'Issues Closed': closed, 'Net Issues': opened - closed })
  }
  const trendSheet = XLSX.utils.json_to_sheet(trendRows.length > 0 ? trendRows : [{}])
  if (trendRows.length > 0) autoFitColumns(trendSheet, trendRows)
  XLSX.utils.book_append_sheet(wb, trendSheet, 'Weekly Trend')

  const date = new Date().toISOString().split('T')[0]
  triggerDownload(wb, `meridian-reports-${date}.xlsx`)
}
