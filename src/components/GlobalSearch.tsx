import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'

interface SearchResult {
  type: 'object' | 'issue' | 'meeting' | 'comment'
  id: string
  title: string
  subtitle?: string
  link: string
}

export function GlobalSearch() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const search = async (q: string) => {
    if (!q.trim() || !user) {
      setResults([])
      return
    }

    setLoading(true)
    const term = `%${q}%`
    const items: SearchResult[] = []

    const [objectsRes, issuesRes, meetingsRes, commentsRes] = await Promise.all([
      supabase.from('meridian_objects').select('id, name, module').ilike('name', term).limit(5),
      supabase.from('meridian_issues').select('id, title, issue_type').ilike('title', term).limit(5),
      supabase.from('meridian_meetings').select('id, title, meeting_date').ilike('title', term).limit(5),
      supabase.from('meridian_comments').select('id, entity_type, entity_id, body').ilike('body', term).limit(5),
    ])

    if (objectsRes.data) {
      objectsRes.data.forEach(o => items.push({
        type: 'object',
        id: o.id,
        title: o.name,
        subtitle: o.module.replace(/_/g, ' '),
        link: `/objects/${o.id}`,
      }))
    }

    if (issuesRes.data) {
      issuesRes.data.forEach(i => items.push({
        type: 'issue',
        id: i.id,
        title: i.title,
        subtitle: i.issue_type.replace(/_/g, ' '),
        link: `/issues/${i.id}`,
      }))
    }

    if (meetingsRes.data) {
      meetingsRes.data.forEach(m => items.push({
        type: 'meeting',
        id: m.id,
        title: m.title,
        subtitle: new Date(m.meeting_date).toLocaleDateString(),
        link: `/meetings/${m.id}`,
      }))
    }

    if (commentsRes.data) {
      commentsRes.data.forEach(c => items.push({
        type: 'comment',
        id: c.id,
        title: c.body.length > 60 ? c.body.slice(0, 60) + '...' : c.body,
        subtitle: c.entity_type,
        link: `/${c.entity_type === 'object' ? 'objects' : 'issues'}/${c.entity_id}`,
      }))
    }

    setResults(items)
    setLoading(false)
  }

  const handleChange = (val: string) => {
    setQuery(val)
    setIsOpen(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(val), 300)
  }

  const handleSelect = (result: SearchResult) => {
    navigate(result.link)
    setQuery('')
    setIsOpen(false)
    setResults([])
  }

  const typeIcons: Record<string, string> = {
    object: '\u25A0',
    issue: '!',
    meeting: 'M',
    comment: '#',
  }

  const typeColors: Record<string, string> = {
    object: 'var(--color-status-blue)',
    issue: 'var(--color-status-amber)',
    meeting: 'var(--color-accent)',
    comment: 'var(--color-text-tertiary)',
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => query && setIsOpen(true)}
          placeholder="Search..."
          className="w-full h-8 pl-8 pr-3 rounded-md text-xs border outline-none"
          style={{
            backgroundColor: 'var(--color-bg-tertiary)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-primary)',
          }}
        />
      </div>

      {isOpen && (query.trim().length > 0) && (
        <div
          className="absolute top-full left-0 right-0 mt-1 rounded-lg border shadow-lg overflow-hidden z-50 max-h-80 overflow-y-auto"
          style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}
        >
          {loading && (
            <p className="text-[10px] px-3 py-2" style={{ color: 'var(--color-text-tertiary)' }}>Searching...</p>
          )}
          {!loading && results.length === 0 && (
            <p className="text-[10px] px-3 py-3 text-center" style={{ color: 'var(--color-text-tertiary)' }}>No results found</p>
          )}
          {!loading && results.map((r) => (
            <button
              key={`${r.type}-${r.id}`}
              onClick={() => handleSelect(r)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left cursor-pointer border-none transition-colors duration-100"
              style={{ backgroundColor: 'transparent', color: 'var(--color-text-primary)' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <span
                className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold shrink-0"
                style={{
                  backgroundColor: `color-mix(in srgb, ${typeColors[r.type]} 15%, transparent)`,
                  color: typeColors[r.type],
                }}
              >
                {typeIcons[r.type]}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs truncate">{r.title}</p>
                {r.subtitle && (
                  <p className="text-[10px] truncate" style={{ color: 'var(--color-text-tertiary)' }}>{r.subtitle}</p>
                )}
              </div>
              <span className="text-[9px] uppercase shrink-0" style={{ color: 'var(--color-text-tertiary)' }}>
                {r.type}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
