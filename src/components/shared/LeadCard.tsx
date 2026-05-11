import type { LeadWithContact, Status } from '../../lib/types'

interface LeadCardProps {
  lead: LeadWithContact
  statuses: Status[]
  onClick: () => void
}

function getInitials(c: { first_name: string | null; last_name: string | null } | null) {
  if (!c) return '?'
  return ((c.first_name?.[0] ?? '') + (c.last_name?.[0] ?? '')).toUpperCase() || '?'
}

function getAvatarColor(id: string) {
  const colors = ['#0A8754', '#3B82F6', '#F59E0B', '#8B5CF6', '#0EAD6A']
  let hash = 0
  for (const ch of id) hash = ch.charCodeAt(0) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

export function LeadCard({ lead, statuses, onClick }: LeadCardProps) {
  const { contact } = lead
  const displayScore = lead.ai_score != null
    ? (lead.ai_score > 10 ? (lead.ai_score / 10).toFixed(1) : lead.ai_score.toFixed(1))
    : '—'
  const statusObj = statuses.find(s => s.name === lead.status)
  const dateLabel = new Date(lead.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

  const fullName = contact
    ? `${contact.first_name ?? ''} ${contact.last_name ?? ''}`.trim() || contact.phone || contact.email || 'Unknown'
    : 'Unknown'
  const subtitle = contact?.phone ?? contact?.email ?? (lead.policy ?? '—')

  return (
    <div className="lead-card" onClick={onClick}>
      <div className="lead-top">
        <div className="lead-avatar" style={{ background: getAvatarColor(lead.id) }}>
          {getInitials(contact)}
        </div>
        <div>
          <div className="lead-name">{fullName}</div>
          <div className="lead-company">{subtitle}</div>
        </div>
      </div>
      <div className="lead-meta">
        <span className="lead-score">{displayScore}</span>
        {statusObj && (
          <span className="lead-source" style={{ background: statusObj.colour + '20', color: statusObj.colour }}>
            {statusObj.label}
          </span>
        )}
        <span className="lead-date">{dateLabel}</span>
      </div>
    </div>
  )
}
