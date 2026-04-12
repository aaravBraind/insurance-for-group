import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Sidebar } from './components/layout/Sidebar'
import { Header } from './components/layout/Header'
import { DetailPanel } from './components/layout/DetailPanel'
import { DashboardTab } from './components/tabs/DashboardTab'
import { LeadsTab } from './components/tabs/LeadsTab'
import { ConversationsTab } from './components/tabs/ConversationsTab'
import { ContactsTab } from './components/tabs/ContactsTab'
import { SettingsTab } from './components/tabs/SettingsTab'
import { LoginPage } from './components/auth/LoginPage'
import { LoadingSpinner } from './components/shared/LoadingSpinner'
import { useAuth } from './hooks/useAuth'
import { useStatuses } from './hooks/useStatuses'
import type { TabId, LeadWithContact, DateRange } from './lib/types'

const queryClient = new QueryClient()

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

function daysAgoISO(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

function AppInner() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard')
  const [selectedLead, setSelectedLead] = useState<LeadWithContact | null>(null)
  const [autoOpenSession, setAutoOpenSession] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<DateRange>({
    start: daysAgoISO(30),
    end: todayISO(),
  })
  const { data: statuses = [] } = useStatuses()

  function handleViewConversation(sessionId: string) {
    setSelectedLead(null)
    setActiveTab('conversations')
    setAutoOpenSession(sessionId)
  }

  return (
    <div className="container">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="main-content">
        <Header activeTab={activeTab} dateRange={dateRange} onDateRangeChange={setDateRange} />
        <div className="content">
          {activeTab === 'dashboard' && (
            <DashboardTab onOpenLead={setSelectedLead} dateRange={dateRange} />
          )}
          {activeTab === 'leads' && (
            <LeadsTab onOpenLead={setSelectedLead} dateRange={dateRange} />
          )}
          {activeTab === 'conversations' && (
            <ConversationsTab
              dateRange={dateRange}
              autoOpenSession={autoOpenSession}
              onAutoOpenHandled={() => setAutoOpenSession(null)}
            />
          )}
          {activeTab === 'contacts' && <ContactsTab dateRange={dateRange} />}
          {activeTab === 'settings' && <SettingsTab />}
        </div>
      </div>

      {selectedLead && (
        <DetailPanel
          lead={selectedLead}
          statuses={statuses}
          onClose={() => setSelectedLead(null)}
          onViewConversation={handleViewConversation}
        />
      )}
    </div>
  )
}

function AuthWrapper() {
  const session = useAuth()
  if (session === undefined) return <LoadingSpinner />
  if (session === null) return <LoginPage />
  return <AppInner />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthWrapper />
    </QueryClientProvider>
  )
}
