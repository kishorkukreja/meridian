import { useIsPinned, useTogglePin } from '@/hooks/usePins'

export function PinButton({ entityType, entityId }: { entityType: 'object' | 'issue'; entityId: string }) {
  const isPinned = useIsPinned(entityType, entityId)
  const togglePin = useTogglePin()

  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        togglePin.mutate({ entityType, entityId })
      }}
      className="p-1 cursor-pointer border-none bg-transparent transition-colors duration-150"
      style={{ color: isPinned ? 'var(--color-status-amber)' : 'var(--color-text-tertiary)' }}
      title={isPinned ? 'Unpin' : 'Pin for quick access'}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill={isPinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    </button>
  )
}
