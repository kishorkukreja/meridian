import { LIFECYCLE_STAGES, STAGE_LABELS, MODULE_LABELS, CATEGORY_LABELS } from '@/types/database'
import { STATUS_LABELS, ISSUE_STATUS_LABELS, ISSUE_TYPE_LABELS, SOURCE_SYSTEM_LABELS, REGION_LABELS } from '@/lib/constants'

interface FilterOption {
  value: string
  label: string
}

interface FilterConfig {
  key: string
  label: string
  options: FilterOption[]
}

interface Props {
  type: 'objects' | 'issues'
  filters: Record<string, string>
  onFilterChange: (key: string, value: string | null) => void
  onClear: () => void
  activeCount: number
}

const OBJECT_FILTERS: FilterConfig[] = [
  { key: 'module', label: 'Module', options: Object.entries(MODULE_LABELS).map(([v, l]) => ({ value: v, label: l })) },
  { key: 'category', label: 'Category', options: Object.entries(CATEGORY_LABELS).map(([v, l]) => ({ value: v, label: l })) },
  { key: 'status', label: 'Status', options: Object.entries(STATUS_LABELS).filter(([v]) => v !== 'archived').map(([v, l]) => ({ value: v, label: l })) },
  { key: 'current_stage', label: 'Stage', options: LIFECYCLE_STAGES.map(s => ({ value: s, label: STAGE_LABELS[s] })) },
  { key: 'source_system', label: 'Source', options: Object.entries(SOURCE_SYSTEM_LABELS).map(([v, l]) => ({ value: v, label: l })) },
  { key: 'region', label: 'Region', options: Object.entries(REGION_LABELS).map(([v, l]) => ({ value: v, label: l })) },
]

const ISSUE_FILTERS: FilterConfig[] = [
  { key: 'status', label: 'Status', options: Object.entries(ISSUE_STATUS_LABELS).map(([v, l]) => ({ value: v, label: l })) },
  { key: 'issue_type', label: 'Type', options: Object.entries(ISSUE_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l })) },
  { key: 'lifecycle_stage', label: 'Stage', options: LIFECYCLE_STAGES.map(s => ({ value: s, label: STAGE_LABELS[s] })) },
  { key: 'module', label: 'Module', options: Object.entries(MODULE_LABELS).map(([v, l]) => ({ value: v, label: l })) },
]

export function FilterBar({ type, filters, onFilterChange, onClear, activeCount }: Props) {
  const filterConfigs = type === 'objects' ? OBJECT_FILTERS : ISSUE_FILTERS

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
      {/* Search */}
      <input
        type="text"
        placeholder={type === 'objects' ? 'Search objects...' : 'Search issues...'}
        value={filters.search || ''}
        onChange={e => onFilterChange('search', e.target.value || null)}
        className="h-8 px-3 rounded text-sm border-none outline-none min-w-[160px]"
        style={{
          backgroundColor: 'var(--color-bg-tertiary)',
          color: 'var(--color-text-primary)',
        }}
      />

      {/* Dropdown filters */}
      {filterConfigs.map(config => (
        <select
          key={config.key}
          value={filters[config.key] || ''}
          onChange={e => onFilterChange(config.key, e.target.value || null)}
          className="h-8 px-2 rounded text-sm border-none outline-none cursor-pointer"
          style={{
            backgroundColor: filters[config.key] ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
            color: filters[config.key] ? '#fff' : 'var(--color-text-secondary)',
          }}
        >
          <option value="">{config.label}</option>
          {config.options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ))}

      {/* Clear */}
      {activeCount > 0 && (
        <button
          onClick={onClear}
          className="h-8 px-3 rounded text-xs font-medium cursor-pointer border-none"
          style={{
            backgroundColor: 'var(--color-bg-tertiary)',
            color: 'var(--color-text-secondary)',
          }}
        >
          Clear ({activeCount})
        </button>
      )}
    </div>
  )
}
