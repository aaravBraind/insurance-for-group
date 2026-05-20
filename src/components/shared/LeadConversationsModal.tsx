import { useState, useEffect } from 'react'
import { useLeadSessions } from '../../hooks/useConversations'
import { ConversationChat } from './ConversationChat'
import { LoadingSpinner } from './LoadingSpinner'
import { CHANNEL_LABEL, type Channel } from '../../lib/format'
import type { LeadWithContact } from '../../lib/types'

interface LeadConversationsModalProps {
  lead: LeadWithContact
  initialChannel?: Channel | null
  onClose: () => void
}

const CHANNEL_ICON: Record<Channel, string> = {
  website: 'fas fa-globe',
  whatsapp: 'fab fa-whatsapp',
  email: 'fas fa-envelope',
}

export function LeadConversationsModal({ lead, initialChannel, onClose }: LeadConversationsModalProps) {
  const { data: sessions = [], isLoading } = useLeadSessions(lead.id, lead.session_id ?? null)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)

  useEffect(() => {
    if (sessions.length > 0 && !activeSessionId) {
      const byChannel = initialChannel ? sessions.find(s => s.channel === initialChannel) : null
      const byId = sessions.find(s => s.session_id === lead.session_id)
      setActiveSessionId((byChannel ?? byId ?? sessions[0]).session_id)
    }
  }, [sessions, activeSessionId, lead.session_id, initialChannel])

  const contactName = lead.contact
    ? (`${lead.contact.first_name ?? ''} ${lead.contact.last_name ?? ''}`.trim()
        || lead.contact.phone || lead.contact.email || 'Unknown')
    : 'Unknown'

  return (
    <div
      className="lead-modal-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="lead-modal" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #e0e6ed', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#7a8fa0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Conversations
            </div>
            <div style={{ fontWeight: 700, fontSize: '16px', color: '#1a1a1a', marginTop: '2px' }}>
              {contactName}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ width: '28px', height: '28px', borderRadius: '8px', border: '1px solid #e0e6ed', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: '#7a8fa0' }}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {isLoading ? (
          <div style={{ padding: '24px' }}><LoadingSpinner /></div>
        ) : sessions.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#7a8fa0', fontSize: '13px' }}>
            No conversations linked to this lead.
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: '8px', padding: '12px 24px', borderBottom: '1px solid #e0e6ed', overflowX: 'auto', flexWrap: 'wrap' }}>
              {sessions.map(s => {
                const isActive = activeSessionId === s.session_id
                const icon = s.channel ? CHANNEL_ICON[s.channel] : 'fas fa-comment'
                const label = s.channel ? CHANNEL_LABEL[s.channel] : 'Unknown'
                return (
                  <button
                    key={s.session_id}
                    onClick={() => setActiveSessionId(s.session_id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '7px 14px', borderRadius: '20px',
                      border: isActive ? '1.5px solid #0A8754' : '1.5px solid #e0e6ed',
                      background: isActive ? '#0A8754' : 'white',
                      color: isActive ? 'white' : '#374151',
                      fontFamily: 'inherit', fontSize: '13px', fontWeight: 600,
                      cursor: 'pointer', outline: 'none',
                    }}
                  >
                    <i className={icon} style={{ fontSize: '12px' }} />
                    {label}
                    <span style={{
                      padding: '1px 7px', borderRadius: '10px',
                      background: isActive ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
                      color: isActive ? 'white' : '#64748b',
                      fontSize: '11px', fontWeight: 700,
                    }}>{s.message_count}</span>
                  </button>
                )
              })}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
              {activeSessionId && (
                <ConversationChat sessionId={activeSessionId} contactName={contactName} />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
