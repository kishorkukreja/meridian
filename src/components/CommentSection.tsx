import { useState } from 'react'
import { useComments, useCreateComment } from '@/hooks/useComments'

interface Props {
  entityType: 'object' | 'issue'
  entityId: string
}

const ALIAS_STORAGE_KEY = 'meridian_author_alias'

function getStoredAlias(): string {
  return localStorage.getItem(ALIAS_STORAGE_KEY) || ''
}

function setStoredAlias(alias: string) {
  localStorage.setItem(ALIAS_STORAGE_KEY, alias)
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffHours < 1) return 'Just now'
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function CommentSection({ entityType, entityId }: Props) {
  const { data: comments, isLoading } = useComments(entityType, entityId)
  const createComment = useCreateComment()
  const [body, setBody] = useState('')
  const [alias, setAlias] = useState(getStoredAlias)
  const [showAliasInput, setShowAliasInput] = useState(!getStoredAlias())

  const handleSubmit = () => {
    if (!body.trim()) return

    if (!alias.trim()) {
      setShowAliasInput(true)
      return
    }

    setStoredAlias(alias)
    createComment.mutate(
      { entity_type: entityType, entity_id: entityId, body: body.trim(), author_alias: alias.trim() },
      { onSuccess: () => setBody('') },
    )
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
      <h2 className="text-sm font-semibold mb-3">
        Comments {comments && comments.length > 0 && (
          <span style={{ color: 'var(--color-text-tertiary)' }}>({comments.length})</span>
        )}
      </h2>

      {/* Input */}
      {showAliasInput && (
        <div className="mb-3">
          <label className="block text-[10px] mb-1" style={{ color: 'var(--color-text-tertiary)' }}>Your alias</label>
          <input
            type="text"
            value={alias}
            onChange={e => setAlias(e.target.value)}
            placeholder="e.g. LEAD-DNA-01"
            className="w-full h-8 px-3 rounded text-xs border outline-none font-[family-name:var(--font-data)]"
            style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            onBlur={() => {
              if (alias.trim()) {
                setStoredAlias(alias.trim())
                setShowAliasInput(false)
              }
            }}
            autoFocus
          />
        </div>
      )}

      <div className="flex gap-2 mb-4 items-end">
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a comment..."
          rows={3}
          className="flex-1 px-3 py-2 rounded-lg text-sm border outline-none resize-y min-h-[72px]"
          style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
        />
        <button
          onClick={handleSubmit}
          disabled={!body.trim() || createComment.isPending}
          className="h-9 w-9 shrink-0 rounded-lg flex items-center justify-center cursor-pointer border-none disabled:opacity-30"
          style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2L11 13" /><path d="M22 2L15 22L11 13L2 9L22 2Z" />
          </svg>
        </button>
      </div>

      {!showAliasInput && alias && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-[family-name:var(--font-data)]" style={{ color: 'var(--color-text-tertiary)' }}>
            Posting as {alias}
          </span>
          <button
            onClick={() => setShowAliasInput(true)}
            className="text-[10px] cursor-pointer border-none bg-transparent underline"
            style={{ color: 'var(--color-accent)' }}
          >
            change
          </button>
        </div>
      )}

      {/* Comments List */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="animate-pulse">
              <div className="h-3 w-32 rounded" style={{ backgroundColor: 'var(--color-bg-tertiary)' }} />
              <div className="h-4 w-full mt-1 rounded" style={{ backgroundColor: 'var(--color-bg-tertiary)' }} />
            </div>
          ))}
        </div>
      )}

      {comments && comments.length === 0 && (
        <p className="text-xs text-center py-3" style={{ color: 'var(--color-text-tertiary)' }}>
          No comments yet. Be the first to add one.
        </p>
      )}

      {comments && comments.length > 0 && (
        <div className="space-y-3">
          {comments.map(comment => (
            <div key={comment.id} className="p-3 rounded" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-medium font-[family-name:var(--font-data)]" style={{ color: 'var(--color-text-primary)' }}>
                  {comment.author_alias || 'Anonymous'}
                </span>
                <span className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
                  {formatTimestamp(comment.created_at)}
                </span>
              </div>
              <p className="text-xs whitespace-pre-wrap" style={{ color: 'var(--color-text-secondary)' }}>
                {comment.body}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
