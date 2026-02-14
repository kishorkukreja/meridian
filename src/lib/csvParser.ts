export interface ParsedCSV {
  headers: string[]
  rows: Record<string, string>[]
}

export interface ValidationResult<T> {
  valid: T[]
  errors: { row: number; message: string }[]
}

export function parseCSV(text: string): ParsedCSV {
  const lines = parseCSVLines(text)
  if (lines.length === 0) return { headers: [], rows: [] }

  const headers = lines[0].map(h => h.trim().toLowerCase())
  const rows = lines.slice(1)
    .filter(line => line.some(cell => cell.trim() !== ''))
    .map(line => {
      const row: Record<string, string> = {}
      headers.forEach((header, i) => {
        row[header] = (line[i] || '').trim()
      })
      return row
    })

  return { headers, rows }
}

function parseCSVLines(text: string): string[][] {
  const lines: string[][] = []
  let current: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    const next = text[i + 1]

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        field += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        current.push(field)
        field = ''
      } else if (ch === '\r' && next === '\n') {
        current.push(field)
        field = ''
        lines.push(current)
        current = []
        i++
      } else if (ch === '\n') {
        current.push(field)
        field = ''
        lines.push(current)
        current = []
      } else {
        field += ch
      }
    }
  }

  // Last field/line
  current.push(field)
  if (current.some(c => c.trim() !== '')) {
    lines.push(current)
  }

  return lines
}

export interface ValidObjectRow {
  name: string
  module: string
  status: string
  lifecycle_stage?: string
  owner_alias?: string
  description?: string
  category?: string
  region?: string
  source_system?: string
}

export interface ValidIssueRow {
  title: string
  object_name: string
  issue_type: string
  lifecycle_stage: string
  status: string
  next_action?: string
  owner_alias?: string
  description?: string
}

const VALID_MODULES = ['demand_planning', 'supply_planning', 'supply_planning_ibp', 'data_infrastructure', 'program_management']
const VALID_OBJECT_STATUSES = ['on_track', 'at_risk', 'blocked', 'completed']
const VALID_STAGES = ['requirements', 'mapping', 'extraction', 'ingestion', 'transformation', 'push_to_target', 'validation', 'signoff', 'live']
const VALID_ISSUE_TYPES = ['mapping', 'data_quality', 'dependency', 'signoff', 'technical', 'clarification', 'other']
const VALID_ISSUE_STATUSES = ['open', 'in_progress', 'blocked', 'resolved', 'closed']

export function validateObjectRows(rows: Record<string, string>[]): ValidationResult<ValidObjectRow> {
  const valid: ValidObjectRow[] = []
  const errors: { row: number; message: string }[] = []

  rows.forEach((row, i) => {
    const rowNum = i + 2 // 1-indexed + header row
    const missing: string[] = []
    if (!row.name) missing.push('name')
    if (!row.module) missing.push('module')
    if (!row.status) missing.push('status')

    if (missing.length > 0) {
      errors.push({ row: rowNum, message: `Missing required fields: ${missing.join(', ')}` })
      return
    }

    if (!VALID_MODULES.includes(row.module)) {
      errors.push({ row: rowNum, message: `Invalid module "${row.module}". Valid: ${VALID_MODULES.join(', ')}` })
      return
    }

    if (!VALID_OBJECT_STATUSES.includes(row.status)) {
      errors.push({ row: rowNum, message: `Invalid status "${row.status}". Valid: ${VALID_OBJECT_STATUSES.join(', ')}` })
      return
    }

    if (row.lifecycle_stage && !VALID_STAGES.includes(row.lifecycle_stage)) {
      errors.push({ row: rowNum, message: `Invalid lifecycle_stage "${row.lifecycle_stage}"` })
      return
    }

    valid.push({
      name: row.name,
      module: row.module,
      status: row.status,
      lifecycle_stage: row.lifecycle_stage || undefined,
      owner_alias: row.owner_alias || undefined,
      description: row.description || undefined,
      category: row.category || undefined,
      region: row.region || undefined,
      source_system: row.source_system || undefined,
    })
  })

  return { valid, errors }
}

export function validateIssueRows(rows: Record<string, string>[]): ValidationResult<ValidIssueRow> {
  const valid: ValidIssueRow[] = []
  const errors: { row: number; message: string }[] = []

  rows.forEach((row, i) => {
    const rowNum = i + 2
    const missing: string[] = []
    if (!row.title) missing.push('title')
    if (!row.object_name) missing.push('object_name')
    if (!row.issue_type) missing.push('issue_type')
    if (!row.lifecycle_stage) missing.push('lifecycle_stage')
    if (!row.status) missing.push('status')

    if (missing.length > 0) {
      errors.push({ row: rowNum, message: `Missing required fields: ${missing.join(', ')}` })
      return
    }

    if (!VALID_ISSUE_TYPES.includes(row.issue_type)) {
      errors.push({ row: rowNum, message: `Invalid issue_type "${row.issue_type}"` })
      return
    }

    if (!VALID_STAGES.includes(row.lifecycle_stage)) {
      errors.push({ row: rowNum, message: `Invalid lifecycle_stage "${row.lifecycle_stage}"` })
      return
    }

    if (!VALID_ISSUE_STATUSES.includes(row.status)) {
      errors.push({ row: rowNum, message: `Invalid status "${row.status}"` })
      return
    }

    valid.push({
      title: row.title,
      object_name: row.object_name,
      issue_type: row.issue_type,
      lifecycle_stage: row.lifecycle_stage,
      status: row.status,
      next_action: row.next_action || undefined,
      owner_alias: row.owner_alias || undefined,
      description: row.description || undefined,
    })
  })

  return { valid, errors }
}

export function generateObjectTemplate(): string {
  return 'name,module,status,lifecycle_stage,owner_alias,description,category,region,source_system\nExample Object,demand_planning,on_track,requirements,JSmith,Sample description,master_data,global,erp_primary'
}

export function generateIssueTemplate(): string {
  return 'title,object_name,issue_type,lifecycle_stage,status,next_action,owner_alias,description\nExample Issue,Example Object,data_quality,extraction,open,follow_up,JSmith,Sample issue description'
}
