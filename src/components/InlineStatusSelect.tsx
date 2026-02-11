import { useState, useRef, useEffect } from 'react'
import { STATUS_COLORS, ISSUE_STATUS_COLORS, STATUS_LABELS, ISSUE_STATUS_LABELS } from '@/lib/constants'
import type { ObjectStatus, IssueStatus } from '@/types/database'

type Props = {
  status: ObjectStatus | IssueStatus
  type?: 'object' | 'issue'
  onChange: (newStatus: string) => void
}

export function InlineStatusSelect({ status, type = 'object', onChange }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const colors = type === 'object' ? STATUS_COLORS : ISSUE_STATUS_COLORS
  const labels = type === 'object' ? STATUS_LABELS : ISSUE_STATUS_LABELS
  const currentColor = colors[status as keyof typeof colors]

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative" onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium font-[family-name:var(--font-data)] cursor-pointer border-none"
        style={{
          backgroundColor: `color-mix(in srgb, ${currentColor} 15%, transparent)`,
          color: currentColor,
        }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: currentColor }} />
        {labels[status as keyof typeof labels]}
        <span className="ml-0.5 text-[8px] opacity-60">&#9662;</span>
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-1 py-1 rounded-lg border shadow-lg z-50 min-w-[130px]"
          style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}
        >
          {Object.entries(labels).map(([val, label]) => {
            const isActive = val === status
            const itemColor = colors[val as keyof typeof colors]
            return (
              <button
                key={val}
                onClick={() => {
                  if (!isActive) onChange(val)
                  setOpen(false)
                }}
                disabled={isActive}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer border-none text-left disabled:opacity-40 disabled:cursor-default"
                style={{
                  backgroundColor: isActive ? 'var(--color-bg-tertiary)' : 'transparent',
                  color: itemColor,
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: itemColor }} />
                {label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
