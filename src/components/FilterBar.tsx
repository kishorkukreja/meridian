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

const ALL_LABELS: Record<string, Record<string, string>> = {
  module: MODULE_LABELS,
  category: CATEGORY_LABELS,
  status: STATUS_LABELS,
  current_stage: Object.fromEntries(LIFECYCLE_STAGES.map(s => [s, STAGE_LABELS[s]])),
  source_system: SOURCE_SYSTEM_LABELS,
  region: REGION_LABELS,
  issue_type: ISSUE_TYPE_LABELS,
  lifecycle_stage: Object.fromEntries(LIFECYCLE_STAGES.map(s => [s, STAGE_LABELS[s]])),
}

const FILTER_LABELS: Record<string, string> = {
  module: 'Module',
  category: 'Category',
  status: 'Status',
  current_stage: 'Stage',
  source_system: 'Source',
  region: 'Region',
  issue_type: 'Type',
  lifecycle_stage: 'Stage',
  search: 'Search',
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

const IGNORED_FILTER_KEYS = new Set(['sort', 'order', 'is_archived'])

export function FilterBar({ type, filters, onFilterChange, onClear, activeCount }: Props) {
  const filterConfigs = type === 'objects' ? OBJECT_FILTERS : ISSUE_FILTERS
  const statusLabels: Record<string, Record<string, string>> = type === 'issues'
    ? { ...ALL_LABELS, status: ISSUE_STATUS_LABELS }
    : ALL_LABELS

  const activeFilters = Object.entries(filters).filter(
    ([key, value]) => value && !IGNORED_FILTER_KEYS.has(key)
  )

  return (
    <div className="space-y-2">
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

      {/* Active filter chips */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {activeFilters.map(([key, value]) => {
            const filterLabel = FILTER_LABELS[key] || key
            const valueLabels = key === 'search'
              ? `"${value}"`
              : value.split(',').map(v => statusLabels[key]?.[v] || v).join(', ')

            return (
              <button
                key={key}
                onClick={() => onFilterChange(key, null)}
                className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[11px] cursor-pointer border-none"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-accent) 15%, transparent)',
                  color: 'var(--color-accent)',
                }}
              >
                <span className="font-medium">{filterLabel}:</span> {valueLabels}
                <span className="ml-0.5 text-[10px] opacity-70">&times;</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
