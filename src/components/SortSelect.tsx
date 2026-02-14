interface SortOption {
  value: string
  label: string
}

interface Props {
  options: SortOption[]
  currentSort: string
  currentOrder: 'asc' | 'desc'
  onSortChange: (sort: string, order: 'asc' | 'desc') => void
}

export function SortSelect({ options, currentSort, currentOrder, onSortChange }: Props) {
  const currentValue = `${currentSort}:${currentOrder}`
  const isDefault = currentValue === options[0]?.value

  const handleChange = (encoded: string) => {
    const [field, order] = encoded.split(':') as [string, 'asc' | 'desc']
    onSortChange(field, order)
  }

  return (
    <select
      value={currentValue}
      onChange={e => handleChange(e.target.value)}
      aria-label="Sort by"
      className="h-8 px-2 rounded text-sm border-none outline-none cursor-pointer"
      style={
        isDefault
          ? { backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }
          : { backgroundColor: 'var(--color-accent)', color: '#fff' }
      }
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}
