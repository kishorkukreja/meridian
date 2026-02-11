import { useNavigate, useLocation } from 'react-router-dom'
import type { SavedView } from '@/lib/savedViews'

interface Props {
  views: SavedView[]
  basePath: string
}

export function ViewChips({ views, basePath }: Props) {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-none">
      <button
        onClick={() => navigate(basePath)}
        className="shrink-0 h-7 px-3 rounded-full text-xs font-medium cursor-pointer border-none whitespace-nowrap"
        style={{
          backgroundColor: !location.search ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
          color: !location.search ? '#fff' : 'var(--color-text-secondary)',
        }}
      >
        All
      </button>
      {views.map(view => {
        const params = new URLSearchParams(view.filters).toString()
        const isActive = location.search === `?${params}`
        return (
          <button
            key={view.id}
            onClick={() => navigate(`${basePath}?${params}`)}
            className="shrink-0 h-7 px-3 rounded-full text-xs font-medium cursor-pointer border-none whitespace-nowrap"
            style={{
              backgroundColor: isActive ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
              color: isActive ? '#fff' : 'var(--color-text-secondary)',
            }}
          >
            {view.label}
          </button>
        )
      })}
    </div>
  )
}
