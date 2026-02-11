interface Props {
  rows?: number
  type?: 'table' | 'card' | 'detail'
}

export function LoadingSkeleton({ rows = 5, type = 'table' }: Props) {
  if (type === 'detail') {
    return (
      <div className="animate-pulse space-y-6 p-6">
        <div className="h-8 rounded w-1/3" style={{ backgroundColor: 'var(--color-bg-tertiary)' }} />
        <div className="h-4 rounded w-2/3" style={{ backgroundColor: 'var(--color-bg-tertiary)' }} />
        <div className="flex gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-6 w-6 rounded-full" style={{ backgroundColor: 'var(--color-bg-tertiary)' }} />
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 rounded" style={{ backgroundColor: 'var(--color-bg-tertiary)' }} />
          ))}
        </div>
      </div>
    )
  }

  if (type === 'card') {
    return (
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="animate-pulse p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
            <div className="flex justify-between mb-3">
              <div className="h-4 rounded w-1/3" style={{ backgroundColor: 'var(--color-bg-tertiary)' }} />
              <div className="h-5 rounded-full w-16" style={{ backgroundColor: 'var(--color-bg-tertiary)' }} />
            </div>
            <div className="h-3 rounded w-1/2 mb-2" style={{ backgroundColor: 'var(--color-bg-tertiary)' }} />
            <div className="h-1.5 rounded-full w-full" style={{ backgroundColor: 'var(--color-bg-tertiary)' }} />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Header row */}
      <div className="animate-pulse flex gap-4 p-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-4 rounded flex-1" style={{ backgroundColor: 'var(--color-bg-tertiary)' }} />
        ))}
      </div>
      {/* Data rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="animate-pulse flex gap-4 p-3 rounded" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
          {Array.from({ length: 6 }).map((_, j) => (
            <div key={j} className="h-4 rounded flex-1" style={{ backgroundColor: 'var(--color-bg-tertiary)' }} />
          ))}
        </div>
      ))}
    </div>
  )
}
