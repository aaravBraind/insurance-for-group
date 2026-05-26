import { useState, useEffect, useRef } from 'react'
import { useUpdateLeadStatus } from '../../hooks/useLeads'
import { useLeadSessions } from '../../hooks/useConversations'
import { LeadConversationsModal } from '../shared/LeadConversationsModal'
import type { LeadWithContact, Status } from '../../lib/types'
import { formatPolicy, formatEnum, formatDateTime, formatCapturedVia, toTitleCase } from '../../lib/format'

interface DetailPanelProps {
  lead: LeadWithContact | null
  statuses: Status[]
  onClose: () => void
  onViewConversation: (sessionId: string) => void
}

// Keys to surface in the "Additional Details" grid — the qualification
// answers Ivy collects. Everything else (handoff timestamps, channel ids,
// thread ids, etc.) is internal noise and hidden.
const VISIBLE_DETAIL_KEYS = [
  'purpose',
  'duration',
  'org_type',
  'destination',
  'organisation',
  'channel_preference',
  'last_user_message_at',
] as const

const LABEL_MAP: Record<string, string> = {
  purpose: 'Purpose',
  duration: 'Duration',
  org_type: 'Organisation Type',
  destination: 'Destination',
  organisation: 'Organisation',
  channel_preference: 'Channel Preference',
  last_user_message_at: 'Last User Message',
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined || v === 'null' || v === '') return '—'
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  if (typeof v === 'string') {
    if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(v)) return formatDateTime(v)
    return formatEnum(v)
  }
  return String(v)
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `about ${mins} minute${mins !== 1 ? 's' : ''} ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `about ${hrs} hour${hrs !== 1 ? 's' : ''} ago`
  const days = Math.floor(hrs / 24)
  return `${days} day${days !== 1 ? 's' : ''} ago`
}

export function DetailPanel({ lead, statuses, onClose }: DetailPanelProps) {
  const updateStatus = useUpdateLeadStatus()
  const [currentStatus, setCurrentStatus] = useState(lead?.status ?? '')
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false)
  const [convOpen, setConvOpen] = useState(false)
  const statusDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!statusDropdownOpen) return
    function handleOutsideClick(e: MouseEvent) {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) {
        setStatusDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [statusDropdownOpen])

  useEffect(() => {
    if (lead) { setCurrentStatus(lead.status ?? ''); setConvOpen(false) }
  }, [lead?.id])

  if (!lead) return null

  const contact = lead.contact
  const statusObj = statuses.find(s => s.name === currentStatus)
  const displayScore = lead.ai_score != null
    ? (lead.ai_score > 10 ? (lead.ai_score / 10).toFixed(1) : lead.ai_score.toFixed(1))
    : null

  const detailEntries = lead.details
    ? VISIBLE_DETAIL_KEYS
        .map(k => [k, (lead.details as Record<string, unknown>)[k]] as const)
        .filter(([, v]) => v !== null && v !== undefined && v !== '' && v !== 'unknown')
    : []

  function handleStatusChange(newStatus: string) {
    setCurrentStatus(newStatus)
    updateStatus.mutate({ leadId: lead!.id, status: newStatus })
  }

  // A lead can have conversations either via its own `session_id` OR via
  // rows in the `sessions` table that point back to it by `lead_id`.
  // Show the View Conversation button whenever at least one exists.
  const { data: leadSessions = [] } = useLeadSessions(lead.id, lead.session_id ?? null)
  const hasConversation = leadSessions.length > 0

  if (convOpen && hasConversation) {
    return <LeadConversationsModal lead={lead} onClose={() => setConvOpen(false)} />
  }

  return (
    <div className="lead-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="lead-modal">
        {/* Header row */}
        <div style={{ padding: '20px 24px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#7a8fa0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Lead Details
          </span>
          <button
            onClick={onClose}
            style={{ width: '28px', height: '28px', borderRadius: '8px', border: '1px solid #e0e6ed', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: '#7a8fa0' }}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Name + status dropdown + view conversation */}
        <div style={{ padding: '0 24px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#1a1a1a' }}>
            {contact ? `${contact.first_name ?? ''} ${contact.last_name ?? ''}`.trim() || contact.phone || contact.email : 'Unknown contact'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Custom status dropdown */}
            <div ref={statusDropdownRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setStatusDropdownOpen(o => !o)}
                disabled={updateStatus.isPending}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 12px', borderRadius: '20px',
                  border: `1.5px solid ${statusObj?.colour ?? '#0A8754'}`,
                  background: (statusObj?.colour ?? '#0A8754') + '18',
                  color: statusObj?.colour ?? '#0A8754',
                  fontFamily: 'inherit', fontSize: '13px', fontWeight: 600,
                  cursor: 'pointer', outline: 'none',
                }}
              >
                {statusObj?.label ?? currentStatus ?? '—'}
                <i className="fas fa-chevron-down" style={{ fontSize: '10px' }}></i>
              </button>
              {statusDropdownOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 4px)', left: 0,
                  background: 'white', border: '1px solid #e0e6ed', borderRadius: '12px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  zIndex: 20, minWidth: '170px', overflow: 'hidden',
                }}>
                  {statuses.map(s => (
                    <button
                      key={s.name}
                      onClick={() => { handleStatusChange(s.name); setStatusDropdownOpen(false) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '9px',
                        width: '100%', padding: '9px 14px',
                        border: 'none',
                        background: currentStatus === s.name ? s.colour + '15' : 'white',
                        fontFamily: 'inherit', fontSize: '13px', fontWeight: 500,
                        cursor: 'pointer', textAlign: 'left', color: '#1a1a1a',
                      }}
                    >
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.colour, flexShrink: 0 }}></span>
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {hasConversation && (
              <button
                onClick={() => setConvOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '20px', border: '1.5px solid #e0e6ed', background: 'white', fontFamily: 'inherit', fontSize: '13px', fontWeight: 600, color: '#1a1a1a', cursor: 'pointer' }}
              >
                <i className="fas fa-comments" style={{ fontSize: '12px' }}></i>
                View Conversation{leadSessions.length > 1 ? `s (${leadSessions.length})` : ''}
              </button>
            )}
          </div>
        </div>

        {/* Contact Information */}
        {contact && (
          <div className="lead-modal-section">
            <div className="lead-modal-section-title">
              <i className="fas fa-user" style={{ color: '#0A8754', fontSize: '13px' }}></i> Contact Information
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#EBF5FB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className="fas fa-envelope" style={{ color: '#3B82F6', fontSize: '13px' }}></i>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#7a8fa0' }}>Email</div>
                  <div style={{ fontSize: '13px', fontWeight: 500 }}>{contact.email ?? '—'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className="fas fa-phone" style={{ color: '#0A8754', fontSize: '13px' }}></i>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#7a8fa0' }}>Phone</div>
                  <div style={{ fontSize: '13px', fontWeight: 500 }}>{contact.phone ?? '—'}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Policy / Risk */}
        {(lead.policy || lead.risk_details || lead.origin || (lead.details?.captured_via as string | undefined)) && (
          <div className="lead-modal-section">
            <div className="lead-modal-section-title">
              <i className="fas fa-shield-alt" style={{ color: '#0A8754', fontSize: '13px' }}></i> Policy
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#7a8fa0', marginBottom: '2px' }}>Policy</div>
                <div style={{ fontSize: '13px', fontWeight: 500 }}>{formatPolicy(lead.policy)}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#7a8fa0', marginBottom: '2px' }}>Risk Details</div>
                <div style={{ fontSize: '13px', fontWeight: 500 }}>{formatEnum(lead.risk_details)}</div>
              </div>
              {formatCapturedVia(lead.details?.captured_via as string | undefined, lead.origin) && (
                <div>
                  <div style={{ fontSize: '12px', color: '#7a8fa0', marginBottom: '2px' }}>Captured Via</div>
                  <div style={{ fontSize: '13px', fontWeight: 500 }}>
                    {formatCapturedVia(lead.details?.captured_via as string | undefined, lead.origin)}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="lead-modal-section">
          <div className="lead-modal-section-title">
            <i className="fas fa-clock" style={{ color: '#1a1a1a', fontSize: '13px' }}></i> Timeline
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#F0F4FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className="fas fa-calendar" style={{ color: '#3B82F6', fontSize: '13px' }}></i>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#7a8fa0' }}>Created</div>
                <div style={{ fontSize: '13px', fontWeight: 500 }}>
                  {new Date(lead.created_at).toLocaleString('en-IE', { dateStyle: 'medium', timeStyle: 'medium' })}
                </div>
                <div style={{ fontSize: '12px', color: '#7a8fa0', marginTop: '2px' }}>{timeAgo(lead.created_at)}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className="fas fa-tag" style={{ color: '#0A8754', fontSize: '13px' }}></i>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#7a8fa0' }}>Current Stage</div>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>{statusObj?.label ?? currentStatus ?? '—'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Score */}
        {displayScore !== null && (
          <div className="lead-modal-section">
            <div className="lead-modal-section-title">
              <i className="fas fa-chart-line" style={{ color: '#0A8754', fontSize: '13px' }}></i> AI Score
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#0A8754' }}>{displayScore}</div>
              <div style={{ fontSize: '14px', color: '#7a8fa0' }}>/ 10</div>
              <div style={{ flex: 1, height: '8px', background: '#e0e6ed', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(parseFloat(displayScore) * 10, 100)}%`, background: '#0A8754', borderRadius: '4px' }}></div>
              </div>
            </div>
          </div>
        )}

        {/* Additional Details */}
        {detailEntries.length > 0 && (
          <div className="lead-modal-section">
            <div className="lead-modal-section-title">
              <i className="fas fa-info-circle" style={{ color: '#1a1a1a', fontSize: '13px' }}></i> Additional Details
            </div>
            <div className="lead-modal-details-grid">
              {detailEntries.map(([key, val]) => (
                <div key={key}>
                  <div style={{ fontSize: '12px', color: '#7a8fa0', marginBottom: '2px' }}>
                    {LABEL_MAP[key] ?? toTitleCase(key)}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#1a1a1a' }}>
                    {formatValue(val)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Close */}
        <div style={{ padding: '8px 24px 20px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{ padding: '9px 24px', borderRadius: '8px', border: '1px solid #e0e6ed', background: 'white', fontFamily: 'inherit', fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: '#1a1a1a' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
