export type SavedView = {
  id: string
  label: string
  entity: 'objects' | 'issues'
  filters: Record<string, string>
}

export const OBJECT_VIEWS: SavedView[] = [
  { id: 'obj-blocked', label: 'Blocked', entity: 'objects', filters: { status: 'blocked' } },
  { id: 'obj-at-risk', label: 'At Risk', entity: 'objects', filters: { status: 'at_risk' } },
  { id: 'obj-stale', label: 'Stale (>15d)', entity: 'objects', filters: { sort: 'aging', order: 'desc' } },
  { id: 'obj-dp', label: 'Demand Planning', entity: 'objects', filters: { module: 'demand_planning' } },
  { id: 'obj-sp', label: 'Supply Planning', entity: 'objects', filters: { module: 'supply_planning' } },
]

export const ISSUE_VIEWS: SavedView[] = [
  { id: 'iss-open', label: 'All Open', entity: 'issues', filters: { status: 'open,in_progress,blocked' } },
  { id: 'iss-blocked', label: 'Blocked', entity: 'issues', filters: { status: 'blocked' } },
  { id: 'iss-deps', label: 'Dependencies', entity: 'issues', filters: { issue_type: 'dependency' } },
]
