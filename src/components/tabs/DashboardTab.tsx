import { useStats } from '../../hooks/useStats'
import { useConversationSources } from '../../hooks/useConversations'
import { useLeads } from '../../hooks/useLeads'
import { useStatuses } from '../../hooks/useStatuses'
import { StatCard } from '../shared/StatCard'
import { LeadCard } from '../shared/LeadCard'
import { LoadingSpinner } from '../shared/LoadingSpinner'
import type { LeadWithContact, Status, DateRange } from '../../lib/types'

interface DashboardTabProps {
  onOpenLead: (lead: LeadWithContact) => void
  dateRange: DateRange
}

function LeadStatusChart({ leads, statuses }: { leads: LeadWithContact[]; statuses: Status[] }) {
  const counts: Record<string, number> = {}
  for (const l of leads) {
    if (!l.status) continue
    counts[l.status] = (counts[l.status] ?? 0) + 1
  }
  const max = Math.max(...statuses.map(s => counts[s.name] ?? 0), 1)

  return (
    <div className="chart-card" style={{ marginBottom: '24px' }}>
      <div className="chart-title">Lead Status Distribution</div>
      <div style={{ height: '200px', display: 'flex', alignItems: 'flex-end', gap: '16px', padding: '10px 10px 0' }}>
        {statuses.map(s => {
          const count = counts[s.name] ?? 0
          const height = count === 0 ? 4 : Math.max(16, (count / max) * 140)
          return (
            <div key={s.name} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: count > 0 ? s.colour : '#b0bec5' }}>{count}</div>
              <div style={{ width: '100%', borderRadius: '6px 6px 0 0', background: count > 0 ? s.colour : '#e8edf2', height: `${height}px` }}></div>
              <div style={{ fontSize: '10px', color: '#7a8fa0', textAlign: 'center', lineHeight: '1.3' }}>{s.label}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function DashboardTab({ onOpenLead, dateRange }: DashboardTabProps) {
  const { data: stats, isLoading: statsLoading } = useStats(dateRange)
  const { data: leads = [], isLoading: leadsLoading } = useLeads(dateRange)
  const { data: convSources } = useConversationSources(dateRange)
  const { data: statuses = [] } = useStatuses()

  if (statsLoading || leadsLoading) return <LoadingSpinner />

  const recentLeads = leads.filter(l => (l.ai_score ?? 0) > 0).slice(0, 4)
  const highScoreLeads = leads
    .filter(l => l.ai_score != null && (l.ai_score > 10 ? l.ai_score / 10 : l.ai_score) >= 7)
    .slice(0, 4)

  return (
    <>
      <div className="stats-grid">
        <StatCard value={stats?.totalLeads ?? 0} label="Total Leads" />
        <StatCard value={stats?.totalContacts ?? 0} label="Total Contacts" />
        <StatCard
          value={stats?.totalConversations ?? 0}
          label="Conversations"
          info={
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontWeight: 700, marginBottom: '2px' }}>Conversations by source</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                <span>Website Chat</span>
                <strong>{convSources?.website ?? 0}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                <span>Insure Your Team</span>
                <strong>{convSources?.insureYourTeam ?? 0}</strong>
              </div>
            </div>
          }
        />
        <StatCard value={stats?.avgAiScore?.toFixed(1) ?? '—'} label="Avg AI Score" />
        <StatCard
          value={`${stats?.conversionRate ?? 0}%`}
          label={`Conversion Rate (${stats?.qualifiedLeads ?? 0}/${stats?.totalLeads ?? 0})`}
        />
      </div>

      <LeadStatusChart leads={leads.filter(l => (l.ai_score ?? 0) > 0)} statuses={statuses} />

      {recentLeads.length > 0 && (
        <>
          <div className="leads-section-title">Recent Leads</div>
          <div className="leads-grid">
            {recentLeads.map(l => (
              <LeadCard key={l.id} lead={l} statuses={statuses} onClick={() => onOpenLead(l)} />
            ))}
          </div>
        </>
      )}

      {highScoreLeads.length > 0 && (
        <>
          <div className="leads-section-title">High Score Leads (7+)</div>
          <div className="leads-grid">
            {highScoreLeads.map(l => (
              <LeadCard key={l.id} lead={l} statuses={statuses} onClick={() => onOpenLead(l)} />
            ))}
          </div>
        </>
      )}

      {leads.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#7a8fa0', fontSize: '14px' }}>
          No leads yet — they'll appear here as Ivy qualifies contacts.
        </div>
      )}
    </>
  )
}
