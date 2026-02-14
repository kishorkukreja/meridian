import { useState } from 'react'
import { useApiTokens, useCreateApiToken, useRevokeApiToken, useDeleteApiToken } from '@/hooks/useApiTokens'
import { API_TOKEN_SCOPES } from '@/types/database'
import type { ApiTokenScope, ApiTokenRow } from '@/types/database'

function getTokenStatus(token: ApiTokenRow): { label: string; color: string } {
  if (token.revoked_at) return { label: 'Revoked', color: 'var(--color-red)' }
  if (token.expires_at && new Date(token.expires_at) < new Date()) return { label: 'Expired', color: 'var(--color-yellow)' }
  return { label: 'Active', color: 'var(--color-green)' }
}

function formatDate(date: string | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function ApiTokensPage() {
  const { data: tokens, isLoading } = useApiTokens()
  const createToken = useCreateApiToken()
  const revokeToken = useRevokeApiToken()
  const deleteToken = useDeleteApiToken()

  const [showCreate, setShowCreate] = useState(false)
  const [showCopy, setShowCopy] = useState(false)
  const [plaintextToken, setPlaintextToken] = useState('')
  const [copied, setCopied] = useState(false)

  // Create form state
  const [name, setName] = useState('')
  const [scopes, setScopes] = useState<ApiTokenScope[]>(['issues:read'])
  const [expiresAt, setExpiresAt] = useState('')

  const handleCreate = async () => {
    if (!name.trim()) return
    const result = await createToken.mutateAsync({
      name: name.trim(),
      scopes,
      expires_at: expiresAt || null,
    })
    setPlaintextToken(result.plaintext)
    setShowCreate(false)
    setShowCopy(true)
    setName('')
    setScopes(['issues:read'])
    setExpiresAt('')
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(plaintextToken)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const toggleScope = (scope: ApiTokenScope) => {
    setScopes(prev =>
      prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
            API Tokens
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
            Create tokens to access the Issues API from external tools, scripts, and CI pipelines.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-3 py-1.5 text-xs font-medium rounded cursor-pointer border-none"
          style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
        >
          New Token
        </button>
      </div>

      {/* Create Dialog */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-md mx-4 rounded-lg p-5" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
            <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>Create API Token</h2>

            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. CI Pipeline, My Script"
              className="w-full px-3 py-2 text-xs rounded mb-3"
              style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}
            />

            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Scopes</label>
            <div className="flex gap-3 mb-3">
              {API_TOKEN_SCOPES.map(s => (
                <label key={s.value} className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: 'var(--color-text-secondary)' }}>
                  <input
                    type="checkbox"
                    checked={scopes.includes(s.value)}
                    onChange={() => toggleScope(s.value)}
                  />
                  {s.label}
                </label>
              ))}
            </div>

            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Expiry (optional)</label>
            <input
              type="date"
              value={expiresAt}
              onChange={e => setExpiresAt(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded mb-4"
              style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCreate(false)}
                className="px-3 py-1.5 text-xs rounded cursor-pointer border-none"
                style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!name.trim() || scopes.length === 0 || createToken.isPending}
                className="px-3 py-1.5 text-xs font-medium rounded cursor-pointer border-none disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
              >
                {createToken.isPending ? 'Creating...' : 'Create Token'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Copy Dialog */}
      {showCopy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-lg mx-4 rounded-lg p-5" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
            <h2 className="text-sm font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>Token Created</h2>
            <p className="text-xs mb-3" style={{ color: 'var(--color-yellow)' }}>
              Copy this token now. It will not be shown again.
            </p>

            <div className="flex items-center gap-2 mb-4">
              <code
                className="flex-1 px-3 py-2 text-xs rounded font-mono break-all"
                style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}
              >
                {plaintextToken}
              </code>
              <button
                onClick={handleCopy}
                className="px-3 py-2 text-xs rounded cursor-pointer border-none shrink-0"
                style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => { setShowCopy(false); setPlaintextToken('') }}
                className="px-3 py-1.5 text-xs font-medium rounded cursor-pointer border-none"
                style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Token Table */}
      {isLoading ? (
        <div className="text-xs py-8 text-center" style={{ color: 'var(--color-text-tertiary)' }}>Loading tokens...</div>
      ) : !tokens || tokens.length === 0 ? (
        <div className="text-center py-12 rounded-lg" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
          <div className="text-sm mb-1" style={{ color: 'var(--color-text-secondary)' }}>No API tokens</div>
          <div className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Create a token to start using the Issues API.</div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid var(--color-border)' }}>
          <table className="w-full text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                <th className="text-left px-3 py-2 font-medium" style={{ borderBottom: '1px solid var(--color-border)' }}>Name</th>
                <th className="text-left px-3 py-2 font-medium" style={{ borderBottom: '1px solid var(--color-border)' }}>Prefix</th>
                <th className="text-left px-3 py-2 font-medium" style={{ borderBottom: '1px solid var(--color-border)' }}>Scopes</th>
                <th className="text-left px-3 py-2 font-medium" style={{ borderBottom: '1px solid var(--color-border)' }}>Created</th>
                <th className="text-left px-3 py-2 font-medium" style={{ borderBottom: '1px solid var(--color-border)' }}>Last Used</th>
                <th className="text-left px-3 py-2 font-medium" style={{ borderBottom: '1px solid var(--color-border)' }}>Expires</th>
                <th className="text-left px-3 py-2 font-medium" style={{ borderBottom: '1px solid var(--color-border)' }}>Status</th>
                <th className="text-right px-3 py-2 font-medium" style={{ borderBottom: '1px solid var(--color-border)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tokens.map(token => {
                const status = getTokenStatus(token)
                return (
                  <tr key={token.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td className="px-3 py-2 font-medium" style={{ color: 'var(--color-text-primary)' }}>{token.name}</td>
                    <td className="px-3 py-2 font-mono">{token.token_prefix}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1 flex-wrap">
                        {token.scopes.map(s => (
                          <span key={s} className="px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>{s}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2">{formatDate(token.created_at)}</td>
                    <td className="px-3 py-2">{formatDate(token.last_used_at)}</td>
                    <td className="px-3 py-2">{token.expires_at ? formatDate(token.expires_at) : 'Never'}</td>
                    <td className="px-3 py-2">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: status.color + '20', color: status.color }}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end gap-1">
                        {!token.revoked_at && (
                          <button
                            onClick={() => revokeToken.mutate(token.id)}
                            className="px-2 py-1 text-[10px] rounded cursor-pointer border-none"
                            style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-yellow)' }}
                          >
                            Revoke
                          </button>
                        )}
                        <button
                          onClick={() => { if (confirm('Delete this token permanently?')) deleteToken.mutate(token.id) }}
                          className="px-2 py-1 text-[10px] rounded cursor-pointer border-none"
                          style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-red)' }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* API Documentation hint */}
      <div className="mt-6 p-4 rounded-lg text-xs" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
        <div className="font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>Quick Start</div>
        <p className="mb-2" style={{ color: 'var(--color-text-tertiary)' }}>
          Use your token with the Issues API:
        </p>
        <code
          className="block px-3 py-2 rounded font-mono text-[11px] whitespace-pre-wrap"
          style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-secondary)' }}
        >
{`curl -H "Authorization: Bearer mrd_your_token_here" \\
  ${import.meta.env.VITE_SUPABASE_URL}/functions/v1/issues-api/issues`}
        </code>
      </div>
    </div>
  )
}
