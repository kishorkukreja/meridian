import { useState, useRef, useEffect } from 'react'

interface Props {
  onExportFiltered: () => void
  onExportAll: () => void
  isLoading?: boolean
}

export function ExportDropdown({ onExportFiltered, onExportAll, isLoading }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={isLoading}
        className="h-8 px-3 rounded-lg text-sm font-medium cursor-pointer border disabled:opacity-50"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text-secondary)' }}
      >
        Export &#9662;
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 py-1 rounded-lg border shadow-lg z-50 min-w-[180px]"
          style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}
        >
          <button
            onClick={() => { onExportFiltered(); setOpen(false) }}
            className="w-full text-left px-3 py-2 text-xs cursor-pointer border-none"
            style={{ backgroundColor: 'transparent', color: 'var(--color-text-primary)' }}
          >
            Export Current View
            <span className="block text-[10px] mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
              Respects active filters
            </span>
          </button>
          <button
            onClick={() => { onExportAll(); setOpen(false) }}
            className="w-full text-left px-3 py-2 text-xs cursor-pointer border-none"
            style={{ backgroundColor: 'transparent', color: 'var(--color-text-primary)' }}
          >
            Export All Data
            <span className="block text-[10px] mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
              Multi-sheet workbook
            </span>
          </button>
        </div>
      )}
    </div>
  )
}
