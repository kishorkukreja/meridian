import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '@/lib/AuthContext'
import { Layout } from '@/components/Layout'
import { LoginPage } from '@/pages/LoginPage'
import { ObjectListPage } from '@/pages/ObjectListPage'
import { ObjectDetailPage } from '@/pages/ObjectDetailPage'
import { ObjectFormPage } from '@/pages/ObjectFormPage'
import { IssueListPage } from '@/pages/IssueListPage'
import { IssueDetailPage } from '@/pages/IssueDetailPage'
import { IssueFormPage } from '@/pages/IssueFormPage'
import { ArchivePage } from '@/pages/ArchivePage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ReportsPage } from '@/pages/ReportsPage'
import { MeetingListPage } from '@/pages/MeetingListPage'
import { MeetingFormPage } from '@/pages/MeetingFormPage'
import { MeetingDetailPage } from '@/pages/MeetingDetailPage'
import { MeetingEditPage } from '@/pages/MeetingEditPage'
import { SchedulePage } from '@/pages/SchedulePage'
import { RecurringMeetingFormPage } from '@/pages/RecurringMeetingFormPage'
import { RecurringMeetingListPage } from '@/pages/RecurringMeetingListPage'
import { ApiTokensPage } from '@/pages/ApiTokensPage'
import type { ReactNode } from 'react'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      retry: 1,
    },
  },
})

function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Loading...</div>
      </div>
    )
  }

  if (!user) return <LoginPage />

  return <>{children}</>
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AuthGuard>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/objects" element={<ObjectListPage />} />
                <Route path="/objects/new" element={<ObjectFormPage />} />
                <Route path="/objects/:id" element={<ObjectDetailPage />} />
                <Route path="/objects/:id/edit" element={<ObjectFormPage />} />
                <Route path="/issues" element={<IssueListPage />} />
                <Route path="/issues/new" element={<IssueFormPage />} />
                <Route path="/issues/:id" element={<IssueDetailPage />} />
                <Route path="/issues/:id/edit" element={<IssueFormPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/meetings" element={<MeetingListPage />} />
                <Route path="/meetings/new" element={<MeetingFormPage />} />
                <Route path="/meetings/:id" element={<MeetingDetailPage />} />
                <Route path="/meetings/:id/edit" element={<MeetingEditPage />} />
                <Route path="/schedule" element={<SchedulePage />} />
                <Route path="/schedule/manage" element={<RecurringMeetingListPage />} />
                <Route path="/schedule/new" element={<RecurringMeetingFormPage />} />
                <Route path="/schedule/:id/edit" element={<RecurringMeetingFormPage />} />
                <Route path="/settings/api" element={<ApiTokensPage />} />
                <Route path="/archive" element={<ArchivePage />} />
              </Route>
            </Routes>
          </AuthGuard>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
