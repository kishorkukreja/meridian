import { useState } from 'react'
import { useComments, useCreateComment, usePolishEmail } from '@/hooks/useComments'

export interface EmailContext {
  issueTitle: string
  objectName: string
  issueType: string
  lifecycleStage: string
  status: string
  ownerAlias?: string | null
}

interface Props {
  entityType: 'object' | 'issue'
  entityId: string
  emailContext?: EmailContext
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

export function CommentSection({ entityType, entityId, emailContext }: Props) {
  const { data: comments, isLoading } = useComments(entityType, entityId)
  const createComment = useCreateComment()
  const polishEmail = usePolishEmail()
  const [body, setBody] = useState('')
  const [alias, setAlias] = useState(getStoredAlias)
  const [showAliasInput, setShowAliasInput] = useState(!getStoredAlias())
  const [emailDraft, setEmailDraft] = useState<{ subject: string; body: string } | null>(null)
  const [polishing, setPolishing] = useState(false)
  const [polishError, setPolishError] = useState('')
  const [copied, setCopied] = useState(false)

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

  const openEmailDraft = async (commentBody: string, commentAuthor: string) => {
    if (!emailContext) return
    setPolishing(true)
    setPolishError('')
    setCopied(false)

    try {
      const result = await polishEmail.mutateAsync({
        comment: commentBody,
        context: { ...emailContext, commentAuthor },
      })
      setEmailDraft({ subject: result.subject, body: result.body })
    } catch (err) {
      // Fallback to basic template if LLM fails
      setPolishError('AI polish failed — showing basic draft instead.')
      const subject = `[S&OP] ${emailContext.issueTitle} — ${emailContext.objectName}`
      const emailBody = [
        `Sharing an update on "${emailContext.issueTitle}" (${emailContext.objectName}, ${emailContext.lifecycleStage}).`,
        ``,
        commentBody,
        ``,
        `Please review and let me know if any action is needed.`,
      ].join('\n')
      setEmailDraft({ subject, body: emailBody })
    } finally {
      setPolishing(false)
    }
  }

  const handleCopyEmail = async () => {
    if (!emailDraft) return
    const text = `Subject: ${emailDraft.subject}\n\n${emailDraft.body}`
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleOpenMailto = () => {
    if (!emailDraft) return
    const mailto = `mailto:?subject=${encodeURIComponent(emailDraft.subject)}&body=${encodeURIComponent(emailDraft.body)}`
    window.open(mailto, '_blank')
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
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium font-[family-name:var(--font-data)]" style={{ color: 'var(--color-text-primary)' }}>
                    {comment.author_alias || 'Anonymous'}
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
                    {formatTimestamp(comment.created_at)}
                  </span>
                </div>
                {emailContext && (
                  <button
                    onClick={() => openEmailDraft(comment.body, comment.author_alias || 'Anonymous')}
                    disabled={polishing}
                    className="h-6 px-1.5 flex items-center justify-center gap-1 rounded cursor-pointer border-none opacity-40 hover:opacity-100 transition-opacity disabled:opacity-20"
                    style={{ backgroundColor: 'transparent', color: 'var(--color-text-secondary)' }}
                    title="Draft email from this comment"
                  >
                    {polishing ? (
                      <span className="text-[9px]">drafting...</span>
                    ) : (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="4" width="20" height="16" rx="2" />
                        <path d="M22 7L13.03 12.7a1.94 1.94 0 01-2.06 0L2 7" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
              <p className="text-xs whitespace-pre-wrap" style={{ color: 'var(--color-text-secondary)' }}>
                {comment.body}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Email Draft Modal */}
      {emailDraft && (
        <div className="fixed inset-0 flex items-center justify-center z-50 px-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-lg p-6 rounded-xl border" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
            {polishError && (
              <p className="text-[10px] px-3 py-1.5 rounded mb-3" style={{ backgroundColor: 'color-mix(in srgb, var(--color-status-amber) 15%, transparent)', color: 'var(--color-status-amber)' }}>
                {polishError}
              </p>
            )}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold">Email Draft</h2>
              <button
                onClick={() => setEmailDraft(null)}
                className="text-sm cursor-pointer border-none bg-transparent"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                ✕
              </button>
            </div>

            <label className="block text-[10px] mb-1" style={{ color: 'var(--color-text-tertiary)' }}>Subject</label>
            <input
              type="text"
              value={emailDraft.subject}
              onChange={e => setEmailDraft({ ...emailDraft, subject: e.target.value })}
              className="w-full h-9 px-3 rounded-lg text-sm border outline-none mb-3"
              style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            />

            <label className="block text-[10px] mb-1" style={{ color: 'var(--color-text-tertiary)' }}>Body</label>
            <textarea
              value={emailDraft.body}
              onChange={e => setEmailDraft({ ...emailDraft, body: e.target.value })}
              rows={12}
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none resize-y mb-4 font-mono"
              style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEmailDraft(null)}
                className="h-9 px-4 text-sm cursor-pointer border-none bg-transparent"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleCopyEmail}
                className="h-9 px-4 rounded-lg text-sm cursor-pointer border"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'transparent', color: copied ? 'var(--color-status-green)' : 'var(--color-text-secondary)' }}
              >
                {copied ? 'Copied!' : 'Copy All'}
              </button>
              <button
                onClick={handleOpenMailto}
                className="h-9 px-4 rounded-lg text-sm font-medium cursor-pointer border-none"
                style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
              >
                Open in Email Client
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
