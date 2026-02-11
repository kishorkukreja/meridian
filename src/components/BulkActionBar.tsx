import { useState } from 'react'
import { STATUS_LABELS, ISSUE_STATUS_LABELS } from '@/lib/constants'
import type { ObjectStatus, IssueStatus } from '@/types/database'

type BulkAction =
  | { type: 'change_status'; status: string }
  | { type: 'change_owner'; owner: string }
  | { type: 'archive' }

interface Props {
  entityType: 'objects' | 'issues'
  selectedCount: number
  onAction: (action: BulkAction) => void
  onCancel: () => void
}

export function BulkActionBar({ entityType, selectedCount, onAction, onCancel }: Props) {
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [showOwnerInput, setShowOwnerInput] = useState(false)
  const [ownerValue, setOwnerValue] = useState('')

  const statuses = entityType === 'objects'
    ? (Object.entries(STATUS_LABELS).filter(([k]) => k !== 'archived') as [ObjectStatus, string][])
    : (Object.entries(ISSUE_STATUS_LABELS) as [IssueStatus, string][])

  const handleStatusSelect = (status: string) => {
    if (!confirm(`Change ${selectedCount} ${entityType} to "${entityType === 'objects' ? STATUS_LABELS[status as ObjectStatus] : ISSUE_STATUS_LABELS[status as IssueStatus]}"?`)) return
    onAction({ type: 'change_status', status })
    setShowStatusMenu(false)
  }

  const handleOwnerSubmit = () => {
    if (!ownerValue.trim()) return
    if (!confirm(`Reassign ${selectedCount} ${entityType} to "${ownerValue}"?`)) return
    onAction({ type: 'change_owner', owner: ownerValue.trim() })
    setShowOwnerInput(false)
    setOwnerValue('')
  }

  const handleArchive = () => {
    if (!confirm(`Archive ${selectedCount} ${entityType}? They can be restored later.`)) return
    onAction({ type: 'archive' })
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 md:bottom-4 md:left-1/2 md:-translate-x-1/2 md:max-w-2xl md:rounded-xl z-40 px-4 py-3 flex items-center gap-3 border-t md:border shadow-lg"
      style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}
    >
      <span className="text-xs font-medium shrink-0" style={{ color: 'var(--color-accent)' }}>
        {selectedCount} selected
      </span>

      <div className="flex items-center gap-2 flex-1 overflow-x-auto">
        {/* Change Status */}
        <div className="relative">
          <button
            onClick={() => { setShowStatusMenu(!showStatusMenu); setShowOwnerInput(false) }}
            className="h-7 px-3 rounded text-[11px] font-medium cursor-pointer border whitespace-nowrap"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text-primary)' }}
          >
            Status &#9662;
          </button>
          {showStatusMenu && (
            <div
              className="absolute bottom-full mb-1 left-0 py-1 rounded-lg border shadow-lg z-50 min-w-[140px]"
              style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}
            >
              {statuses.map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => handleStatusSelect(key)}
                  className="w-full text-left px-3 py-1.5 text-xs cursor-pointer border-none"
                  style={{ backgroundColor: 'transparent', color: 'var(--color-text-primary)' }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Change Owner */}
        <div className="relative">
          {showOwnerInput ? (
            <div className="flex items-center gap-1">
              <input
                value={ownerValue}
                onChange={e => setOwnerValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleOwnerSubmit()}
                placeholder="Owner alias"
                className="h-7 px-2 rounded text-[11px] border outline-none w-28"
                style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                autoFocus
              />
              <button
                onClick={handleOwnerSubmit}
                disabled={!ownerValue.trim()}
                className="h-7 px-2 rounded text-[11px] font-medium cursor-pointer border-none disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
              >
                Go
              </button>
              <button
                onClick={() => setShowOwnerInput(false)}
                className="h-7 px-1 text-xs cursor-pointer border-none bg-transparent"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                &times;
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setShowOwnerInput(true); setShowStatusMenu(false) }}
              className="h-7 px-3 rounded text-[11px] font-medium cursor-pointer border whitespace-nowrap"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text-primary)' }}
            >
              Owner
            </button>
          )}
        </div>

        {/* Archive */}
        <button
          onClick={handleArchive}
          className="h-7 px-3 rounded text-[11px] font-medium cursor-pointer border whitespace-nowrap"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text-primary)' }}
        >
          Archive
        </button>
      </div>

      {/* Cancel */}
      <button
        onClick={onCancel}
        className="h-7 px-2 text-xs cursor-pointer border-none bg-transparent shrink-0"
        style={{ color: 'var(--color-text-tertiary)' }}
      >
        &times; Cancel
      </button>
    </div>
  )
}

export type { BulkAction }
