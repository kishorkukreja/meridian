import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/AuthContext'
import { OBJECT_VIEWS, ISSUE_VIEWS } from '@/lib/savedViews'

export function Layout() {
  const { signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const isObjectsPath = location.pathname.startsWith('/objects')
  const isIssuesPath = location.pathname.startsWith('/issues')

  return (
    <div className="flex h-screen" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      {/* Desktop Sidebar */}
      <aside
        className="hidden md:flex flex-col w-[220px] shrink-0 border-r"
        style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}
      >
        <div className="p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h1 className="text-base font-bold tracking-tight" style={{ color: 'var(--color-accent)' }}>
            Meridian
          </h1>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
            S&OP Tracker
          </p>
        </div>

        <nav className="flex-1 py-2 overflow-y-auto">
          {/* Dashboard */}
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors duration-150 ${
                isActive ? 'border-r-2' : ''
              }`
            }
            style={({ isActive }) => ({
              color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              backgroundColor: isActive ? 'var(--color-bg-tertiary)' : 'transparent',
              borderColor: isActive ? 'var(--color-accent)' : 'transparent',
            })}
          >
            <DashboardIcon />
            Dashboard
          </NavLink>

          {/* Objects */}
          <NavLink
            to="/objects"
            end
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors duration-150 ${
                isActive ? 'border-r-2' : ''
              }`
            }
            style={({ isActive }) => ({
              color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              backgroundColor: isActive ? 'var(--color-bg-tertiary)' : 'transparent',
              borderColor: isActive ? 'var(--color-accent)' : 'transparent',
            })}
          >
            <ObjectsIcon />
            Objects
          </NavLink>

          {isObjectsPath && (
            <div className="py-1">
              {OBJECT_VIEWS.map(view => {
                const params = new URLSearchParams(view.filters).toString()
                const viewUrl = `/objects?${params}`
                const isActive = location.search === `?${params}`
                return (
                  <button
                    key={view.id}
                    onClick={() => navigate(viewUrl)}
                    className="w-full text-left pl-11 pr-4 py-1.5 text-xs cursor-pointer border-none transition-colors duration-150"
                    style={{
                      backgroundColor: isActive ? 'var(--color-bg-tertiary)' : 'transparent',
                      color: isActive ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
                    }}
                  >
                    {view.label}
                  </button>
                )
              })}
            </div>
          )}

          {/* Issues */}
          <NavLink
            to="/issues"
            end
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors duration-150 ${
                isActive ? 'border-r-2' : ''
              }`
            }
            style={({ isActive }) => ({
              color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              backgroundColor: isActive ? 'var(--color-bg-tertiary)' : 'transparent',
              borderColor: isActive ? 'var(--color-accent)' : 'transparent',
            })}
          >
            <IssuesIcon />
            Issues
          </NavLink>

          {isIssuesPath && (
            <div className="py-1">
              {ISSUE_VIEWS.map(view => {
                const params = new URLSearchParams(view.filters).toString()
                const viewUrl = `/issues?${params}`
                const isActive = location.search === `?${params}`
                return (
                  <button
                    key={view.id}
                    onClick={() => navigate(viewUrl)}
                    className="w-full text-left pl-11 pr-4 py-1.5 text-xs cursor-pointer border-none transition-colors duration-150"
                    style={{
                      backgroundColor: isActive ? 'var(--color-bg-tertiary)' : 'transparent',
                      color: isActive ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
                    }}
                  >
                    {view.label}
                  </button>
                )
              })}
            </div>
          )}

          {/* Reports */}
          <NavLink
            to="/reports"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors duration-150 ${
                isActive ? 'border-r-2' : ''
              }`
            }
            style={({ isActive }) => ({
              color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              backgroundColor: isActive ? 'var(--color-bg-tertiary)' : 'transparent',
              borderColor: isActive ? 'var(--color-accent)' : 'transparent',
            })}
          >
            <ReportsIcon />
            Reports
          </NavLink>

          {/* Meetings */}
          <NavLink
            to="/meetings"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors duration-150 ${
                isActive ? 'border-r-2' : ''
              }`
            }
            style={({ isActive }) => ({
              color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              backgroundColor: isActive ? 'var(--color-bg-tertiary)' : 'transparent',
              borderColor: isActive ? 'var(--color-accent)' : 'transparent',
            })}
          >
            <MeetingsIcon />
            Meetings
          </NavLink>

          {/* Schedule */}
          <NavLink
            to="/schedule"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors duration-150 ${
                isActive ? 'border-r-2' : ''
              }`
            }
            style={({ isActive }) => ({
              color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              backgroundColor: isActive ? 'var(--color-bg-tertiary)' : 'transparent',
              borderColor: isActive ? 'var(--color-accent)' : 'transparent',
            })}
          >
            <ScheduleIcon />
            Schedule
          </NavLink>

          {/* Archive */}
          <NavLink
            to="/archive"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors duration-150 ${
                isActive ? 'border-r-2' : ''
              }`
            }
            style={({ isActive }) => ({
              color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              backgroundColor: isActive ? 'var(--color-bg-tertiary)' : 'transparent',
              borderColor: isActive ? 'var(--color-accent)' : 'transparent',
            })}
          >
            <ArchiveIcon />
            Archive
          </NavLink>
        </nav>

        <div className="p-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <button
            onClick={signOut}
            className="w-full py-2 text-xs rounded cursor-pointer border-none"
            style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
        <Outlet />
      </main>

      {/* Mobile Bottom Nav */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 flex border-t"
        style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}
      >
        <NavLink
          to="/dashboard"
          className="flex-1 flex flex-col items-center gap-0.5 py-2"
          style={({ isActive }) => ({
            color: isActive ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
          })}
        >
          <DashboardIcon />
          <span className="text-[10px]">Dashboard</span>
        </NavLink>
        <NavLink
          to="/objects"
          className="flex-1 flex flex-col items-center gap-0.5 py-2"
          style={({ isActive }) => ({
            color: isActive ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
          })}
        >
          <ObjectsIcon />
          <span className="text-[10px]">Objects</span>
        </NavLink>
        <NavLink
          to="/issues"
          className="flex-1 flex flex-col items-center gap-0.5 py-2"
          style={({ isActive }) => ({
            color: isActive ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
          })}
        >
          <IssuesIcon />
          <span className="text-[10px]">Issues</span>
        </NavLink>
        <NavLink
          to="/reports"
          className="flex-1 flex flex-col items-center gap-0.5 py-2"
          style={({ isActive }) => ({
            color: isActive ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
          })}
        >
          <ReportsIcon />
          <span className="text-[10px]">Reports</span>
        </NavLink>
        <NavLink
          to="/meetings"
          className="flex-1 flex flex-col items-center gap-0.5 py-2"
          style={({ isActive }) => ({
            color: isActive ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
          })}
        >
          <MeetingsIcon />
          <span className="text-[10px]">Meetings</span>
        </NavLink>
        <NavLink
          to="/schedule"
          className="flex-1 flex flex-col items-center gap-0.5 py-2"
          style={({ isActive }) => ({
            color: isActive ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
          })}
        >
          <ScheduleIcon />
          <span className="text-[10px]">Schedule</span>
        </NavLink>
        <NavLink
          to="/archive"
          className="flex-1 flex flex-col items-center gap-0.5 py-2"
          style={({ isActive }) => ({
            color: isActive ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
          })}
        >
          <ArchiveIcon />
          <span className="text-[10px]">Archive</span>
        </NavLink>
      </nav>
    </div>
  )
}

function DashboardIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}

function ObjectsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
      <path d="M9 21V9" />
    </svg>
  )
}

function IssuesIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </svg>
  )
}

function ReportsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="M7 16l4-8 4 4 4-6" />
    </svg>
  )
}

function MeetingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )
}

function ScheduleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <path d="M8 14h.01" />
      <path d="M12 14h.01" />
      <path d="M16 14h.01" />
      <path d="M8 18h.01" />
      <path d="M12 18h.01" />
    </svg>
  )
}

function ArchiveIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="5" rx="1" />
      <path d="M4 8v11a2 2 0 002 2h12a2 2 0 002-2V8" />
      <path d="M10 12h4" />
    </svg>
  )
}
