import { useState, useRef, useEffect } from 'react'

export type SearchableOption = {
  value: string
  label: string
}

interface Props {
  options: SearchableOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  emptyLabel?: string
}

const MAX_VISIBLE = 10

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Search...',
  required = false,
  emptyLabel = 'None',
}: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedLabel = options.find(o => o.value === value)?.label || ''

  const filtered = search
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options.slice(0, MAX_VISIBLE)

  const hasMore = !search && options.length > MAX_VISIBLE

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  const handleSelect = (val: string) => {
    onChange(val)
    setOpen(false)
    setSearch('')
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => {
          setOpen(!open)
          if (!open) setTimeout(() => inputRef.current?.focus(), 0)
        }}
        className="w-full h-10 px-3 rounded-lg text-sm border outline-none cursor-pointer text-left flex items-center justify-between"
        style={{
          backgroundColor: 'var(--color-bg-tertiary)',
          borderColor: 'var(--color-border)',
          color: selectedLabel ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
        }}
      >
        <span className="truncate">{selectedLabel || placeholder}</span>
        <span className="text-[10px] ml-2" style={{ color: 'var(--color-text-tertiary)' }}>
          {open ? '\u25B2' : '\u25BC'}
        </span>
      </button>

      {/* Hidden native input for form required validation */}
      {required && (
        <input
          tabIndex={-1}
          value={value}
          onChange={() => {}}
          required
          style={{ position: 'absolute', opacity: 0, height: 0, width: 0, pointerEvents: 'none' }}
        />
      )}

      {/* Dropdown */}
      {open && (
        <div
          className="absolute z-50 mt-1 w-full rounded-lg border shadow-lg overflow-hidden"
          style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}
        >
          {/* Search input */}
          <div className="p-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Type to search..."
              className="w-full h-8 px-2.5 rounded text-sm border outline-none"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            />
          </div>

          {/* Options list */}
          <div className="max-h-60 overflow-y-auto">
            {!required && (
              <button
                type="button"
                onClick={() => handleSelect('')}
                className="w-full text-left px-3 py-2 text-sm cursor-pointer border-none"
                style={{
                  backgroundColor: value === '' ? 'var(--color-bg-tertiary)' : 'transparent',
                  color: 'var(--color-text-tertiary)',
                }}
                onMouseEnter={e => { if (value !== '') e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)' }}
                onMouseLeave={e => { if (value !== '') e.currentTarget.style.backgroundColor = 'transparent' }}
              >
                {emptyLabel}
              </button>
            )}

            {filtered.length === 0 && (
              <div className="px-3 py-3 text-xs text-center" style={{ color: 'var(--color-text-tertiary)' }}>
                No matches found
              </div>
            )}

            {filtered.map(option => (
              <button
                type="button"
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className="w-full text-left px-3 py-2 text-sm cursor-pointer border-none truncate"
                style={{
                  backgroundColor: value === option.value ? 'var(--color-bg-tertiary)' : 'transparent',
                  color: value === option.value ? 'var(--color-accent)' : 'var(--color-text-primary)',
                  fontWeight: value === option.value ? 500 : 400,
                }}
                onMouseEnter={e => { if (value !== option.value) e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)' }}
                onMouseLeave={e => { if (value !== option.value) e.currentTarget.style.backgroundColor = 'transparent' }}
              >
                {option.label}
              </button>
            ))}

            {hasMore && (
              <div className="px-3 py-2 text-[11px] text-center border-t" style={{ color: 'var(--color-text-tertiary)', borderColor: 'var(--color-border)' }}>
                {options.length - MAX_VISIBLE} more — type to search
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
