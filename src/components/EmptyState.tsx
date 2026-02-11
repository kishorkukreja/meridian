interface Props {
  message: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({ message, actionLabel, onAction }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
        style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-text-tertiary)' }}>
          <path d="M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V7" />
          <path d="M1 5L12 1L23 5" />
          <path d="M12 12V16" />
          <path d="M12 8H12.01" />
        </svg>
      </div>
      <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>{message}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer border-none"
          style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
