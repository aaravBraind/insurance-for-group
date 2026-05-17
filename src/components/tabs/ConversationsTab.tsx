import { useState, useEffect } from 'react'
import { useConversations } from '../../hooks/useConversations'
import { useStatuses } from '../../hooks/useStatuses'
import { LoadingSpinner } from '../shared/LoadingSpinner'
import { EmptyState } from '../shared/EmptyState'
import { ConversationChat } from '../shared/ConversationChat'
import type { ConversationSummary, DateRange } from '../../lib/types'

interface ConversationsTabProps {
  dateRange: DateRange
  autoOpenSession?: string | null
  onAutoOpenHandled?: () => void
}

function ConversationDetail({ summary, onBack }: { summary: ConversationSummary; onBack: () => void }) {
  const { contact, channel } = summary
  const name = contact
    ? `${contact.first_name ?? ''} ${contact.last_name ?? ''}`.trim() || contact.phone || contact.email || 'Unknown'
    : 'Unknown'
  const channelLabel = channel ? channel.charAt(0).toUpperCase() + channel.slice(1) : 'Unknown'

  return (
    <div className="conv-detail" style={{ display: 'block' }}>
      <button className="conv-back" onClick={onBack}>
        <i className="fas fa-arrow-left"></i> Back to Conversations
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <div className="lead-avatar" style={{ background: '#0A8754' }}>
          {(name ?? '??').slice(0, 2).toUpperCase()}
        </div>
        <div>
          <div style={{ fontWeight: 700 }}>{name}</div>
          <div style={{ fontSize: '13px', color: '#7a8fa0' }}>{contact ? summary.session_id : 'Unknown'} · {channelLabel}</div>
        </div>
      </div>
      <ConversationChat sessionId={summary.session_id} contactName={name} />
    </div>
  )
}

type LeadFilter = 'all' | 'converted' | 'not_converted'

const filterBtnStyle = (active: boolean): React.CSSProperties => ({
  padding: '6px 14px',
  borderRadius: '20px',
  border: active ? '1.5px solid #0A8754' : '1.5px solid #e0e6ed',
  background: active ? '#0A8754' : 'white',
  color: active ? 'white' : '#374151',
  fontFamily: 'inherit',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
})

export function ConversationsTab({ dateRange, autoOpenSession, onAutoOpenHandled }: ConversationsTabProps) {
  const { data: conversations = [], isLoading } = useConversations(dateRange)
  const { data: statuses = [] } = useStatuses()
  const [selected, setSelected] = useState<ConversationSummary | null>(null)
  const [search, setSearch] = useState('')
  const [minMessages, setMinMessages] = useState(0)
  const [leadFilter, setLeadFilter] = useState<LeadFilter>('all')

  useEffect(() => {
    if (autoOpenSession && conversations.length > 0) {
      const conv = conversations.find(c => c.session_id === autoOpenSession)
      if (conv) {
        setSelected(conv)
        onAutoOpenHandled?.()
      }
    }
  }, [autoOpenSession, conversations])

  if (isLoading) return <LoadingSpinner />
  if (selected) return <ConversationDetail summary={selected} onBack={() => setSelected(null)} />

  if (conversations.length === 0) {
    return <EmptyState icon="fa-comments" message="No conversations yet" />
  }

  const visible = conversations.filter(c => {
    if (search.trim()) {
      const q = search.toLowerCase()
      const nameMatch =
        c.contact?.first_name?.toLowerCase().includes(q) ||
        c.contact?.last_name?.toLowerCase().includes(q) ||
        c.session_id.toLowerCase().includes(q)
      if (!nameMatch) return false
    }
    if (c.message_count < minMessages) return false
    // "Converted" = the lead actually reached the ifg_converted status,
    // not just "has any lead row" (Ivy creates a lead row for every chat).
    const isConverted = c.lead?.status === 'ifg_converted'
    if (leadFilter === 'converted' && !isConverted) return false
    if (leadFilter === 'not_converted' && isConverted) return false
    return true
  })

  return (
    <div id="convListView">
      {/* Search */}
      <div style={{ marginBottom: '12px' }}>
        <input
          type="text"
          placeholder="Search Conversations"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding: '10px 16px', border: '1px solid #e0e6ed', borderRadius: '10px', width: '300px', fontFamily: 'inherit', fontSize: '14px', outline: 'none' }}
        />
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>
            Min Messages: {minMessages}
          </span>
          <input
            type="range"
            min="0"
            max="40"
            value={minMessages}
            onChange={e => setMinMessages(Number(e.target.value))}
            style={{ width: '120px', accentColor: '#0A8754' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={filterBtnStyle(leadFilter === 'all')} onClick={() => setLeadFilter('all')}>All Leads</button>
          <button style={filterBtnStyle(leadFilter === 'converted')} onClick={() => setLeadFilter('converted')}>Converted</button>
          <button style={filterBtnStyle(leadFilter === 'not_converted')} onClick={() => setLeadFilter('not_converted')}>Not Converted</button>
        </div>
      </div>

      <table className="conv-table">
        <thead>
          <tr>
            <th>Contact</th>
            <th>Phone</th>
            <th>Channel</th>
            <th>Last Message</th>
            <th>Lead Status</th>
            <th>Messages</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {visible.map(c => {
            const name = c.contact
              ? `${c.contact.first_name ?? ''} ${c.contact.last_name ?? ''}`.trim()
                || c.contact.phone || c.contact.email || 'Unknown'
              : 'Unknown'
            const lastText = c.last_message?.content ?? ''
            const dateLabel = new Date(c.last_message_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
            const channelIcon =
              c.channel === 'whatsapp' ? 'fab fa-whatsapp' :
              c.channel === 'email' ? 'fas fa-envelope' :
              c.channel === 'website' ? 'fas fa-globe' :
              'fas fa-comment'
            const channelLabel = c.channel
              ? c.channel.charAt(0).toUpperCase() + c.channel.slice(1)
              : 'Unknown'

            return (
              <tr key={c.session_id} onClick={() => setSelected(c)}>
                <td><strong>{name}</strong></td>
                <td>{c.contact?.phone ?? c.contact?.email ?? 'Unknown'}</td>
                <td>
                  <span className="channel-badge ch-wa">
                    <i className={channelIcon}></i> {channelLabel}
                  </span>
                </td>
                <td style={{ maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {lastText}
                </td>
                <td>
                  {(() => {
                    const leadStatus = c.lead?.status ?? null
                    if (!leadStatus) {
                      return <span className="status-badge st-closed">No Lead</span>
                    }
                    const statusObj = statuses.find(s => s.name === leadStatus)
                    const isConverted = leadStatus === 'ifg_converted'
                    if (!statusObj) {
                      return <span className="status-badge st-closed">{leadStatus}</span>
                    }
                    return (
                      <span
                        className="status-badge"
                        style={{
                          background: isConverted ? '#f0fdf4' : statusObj.colour + '20',
                          color: isConverted ? '#15803d' : statusObj.colour,
                          border: isConverted ? '1px solid #bbf7d0' : 'none',
                        }}
                      >
                        {statusObj.label}
                      </span>
                    )
                  })()}
                </td>
                <td style={{ color: '#7a8fa0', textAlign: 'center' }}>{c.message_count}</td>
                <td style={{ color: '#7a8fa0' }}>{dateLabel}</td>
              </tr>
            )
          })}
          {visible.length === 0 && (
            <tr>
              <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: '#7a8fa0', fontSize: '13px' }}>
                No conversations match the current filters
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
