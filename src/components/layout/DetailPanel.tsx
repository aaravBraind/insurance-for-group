import { useState, useEffect, useRef } from 'react'
import { useUpdateLeadStatus } from '../../hooks/useLeads'
import { useFollowupsForLead } from '../../hooks/useFollowups'
import { ConversationChat } from '../shared/ConversationChat'
import type { LeadWithContact, Status, FollowupSchedule } from '../../lib/types'

const STEP_LABEL: Record<FollowupSchedule['next_step'], string> = {
  step_20min: '20-min check-in',
  step_day3:  'Day 3 follow-up',
  step_day7:  'Day 7 follow-up',
  completed:  'Completed',
  cancelled:  'Cancelled',
}

function followupStateMeta(f: FollowupSchedule): { icon: string; label: string; colour: string } {
  if (f.cancelled_at) return { icon: '❌', label: 'Cancelled', colour: '#EF4444' }
  if (f.completed_at) return { icon: '✅', label: 'Sent',      colour: '#0A8754' }
  return { icon: '⏳', label: 'Pending', colour: '#F59E0B' }
}

interface DetailPanelProps {
  lead: LeadWithContact | null
  statuses: Status[]
  onClose: () => void
  onViewConversation: (sessionId: string) => void
}

// Labels for the keys Ivy / Hugh write into leads.details.
const LABEL_MAP: Record<string, string> = {
  stage: 'Stage',
  purpose: 'Purpose',
  duration: 'Duration',
  org_type: 'Organisation Type',
  destination: 'Destination',
  is_returning: 'Returning Customer',
  organisation: 'Organisation',
  channel_preference: 'Channel Preference',
  handoff_sent_at: 'Handoff Sent',
  hugh_notified_at: 'Hugh Notified',
  last_user_message_at: 'Last User Message',
}

// Keys we never want to surface in the "Additional Details" grid (internal /
// shown elsewhere on the panel).
const HIDDEN_KEYS = new Set<string>([
  'conversation_summary',
  'channel_session_id',
])

function toTitleCase(key: string) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined || v === 'null' || v === '') return '—'
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
    const d = new Date(v)
    if (!isNaN(d.getTime())) {
      return d.toLocaleString('en-IE', { dateStyle: 'medium', timeStyle: 'short' })
    }
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
  const { data: followups = [] } = useFollowupsForLead(lead?.id ?? null)
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

  const summary = lead.details?.conversation_summary ?? null

  const detailEntries = lead.details
    ? Object.entries(lead.details).filter(([k, v]) =>
        !HIDDEN_KEYS.has(k) && v !== null && v !== undefined && v !== '' && v !== 'unknown'
      )
    : []

  function handleStatusChange(newStatus: string) {
    setCurrentStatus(newStatus)
    updateStatus.mutate({ leadId: lead!.id, status: newStatus })
  }

  const contactName = contact
    ? (`${contact.first_name ?? ''} ${contact.last_name ?? ''}`.trim()
        || contact.phone || contact.email || 'Unknown')
    : 'Unknown'

  // session_id lives on the lead itself; fall back to nothing if absent.
  const sessionId = lead.session_id ?? null

  if (convOpen && sessionId) {
    return (
      <div className="lead-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setConvOpen(false) }}>
        <div className="lead-modal">
          <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #e0e6ed' }}>
            <button
              onClick={() => setConvOpen(false)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '20px', border: '1px solid #e0e6ed', background: 'white', fontFamily: 'inherit', fontSize: '13px', fontWeight: 600, color: '#374151', cursor: 'pointer' }}
            >
              <i className="fas fa-arrow-left" style={{ fontSize: '11px' }}></i> Back to Lead
            </button>
            <span style={{ fontWeight: 700, fontSize: '14px', color: '#1a1a1a' }}>{contactName} · Conversation</span>
          </div>
          <div style={{ padding: '0 16px 16px' }}>
            <ConversationChat sessionId={sessionId} contactName={contactName} />
          </div>
        </div>
      </div>
    )
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
            {sessionId && (
              <button
                onClick={() => setConvOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '20px', border: '1.5px solid #e0e6ed', background: 'white', fontFamily: 'inherit', fontSize: '13px', fontWeight: 600, color: '#1a1a1a', cursor: 'pointer' }}
              >
                <i className="fas fa-comments" style={{ fontSize: '12px' }}></i> View Conversation
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
        {(lead.policy || lead.risk_details) && (
          <div className="lead-modal-section">
            <div className="lead-modal-section-title">
              <i className="fas fa-shield-alt" style={{ color: '#0A8754', fontSize: '13px' }}></i> Policy
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#7a8fa0', marginBottom: '2px' }}>Policy</div>
                <div style={{ fontSize: '13px', fontWeight: 500 }}>{lead.policy ?? '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#7a8fa0', marginBottom: '2px' }}>Risk Details</div>
                <div style={{ fontSize: '13px', fontWeight: 500 }}>{lead.risk_details ?? '—'}</div>
              </div>
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

        {/* Conversation Summary (from details.conversation_summary) */}
        {summary && (
          <div className="lead-modal-section">
            <div className="lead-modal-section-title">
              <i className="fas fa-file-alt" style={{ color: '#1a1a1a', fontSize: '13px' }}></i> Conversation Summary
            </div>
            <p style={{ fontSize: '13px', lineHeight: 1.6, color: '#374151', margin: 0, whiteSpace: 'pre-wrap' }}>
              {String(summary)}
            </p>
          </div>
        )}

        {/* Follow-up Schedule (from `followup_schedule` table) — always shown */}
        <div className="lead-modal-section">
          <div className="lead-modal-section-title">
            <i className="fas fa-calendar-check" style={{ color: '#0A8754', fontSize: '13px' }}></i> Follow-up Schedule
            <span style={{ marginLeft: '8px', fontSize: '11px', color: '#7a8fa0', fontWeight: 500 }}>
              {followups.length} {followups.length === 1 ? 'item' : 'items'}
            </span>
          </div>
          {followups.length === 0 ? (
            <div
              style={{
                padding: '14px',
                border: '1px dashed #e0e6ed',
                borderRadius: '10px',
                fontSize: '12.5px',
                color: '#7a8fa0',
                textAlign: 'center',
              }}
            >
              No follow-ups scheduled for this lead.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {followups.map(f => {
                const meta = followupStateMeta(f)
                const stepLabel = STEP_LABEL[f.next_step] ?? f.next_step
                const dateStr = new Date(f.next_due_at).toLocaleString('en-IE', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })
                return (
                  <div
                    key={f.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      padding: '10px 12px',
                      border: '1px solid #e0e6ed',
                      borderRadius: '10px',
                      background: f.cancelled_at ? '#fef2f2' : f.completed_at ? '#f0fdf4' : 'white',
                    }}
                  >
                    <div style={{ fontSize: '16px', lineHeight: 1, paddingTop: '1px' }}>{meta.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#1a1a1a' }}>{stepLabel}</span>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '10px',
                            background: meta.colour + '20',
                            color: meta.colour,
                            fontSize: '11px',
                            fontWeight: 700,
                          }}
                        >
                          {meta.label}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#7a8fa0', marginTop: '2px' }}>
                        Due {dateStr}
                      </div>
                      {f.cancelled_at && f.cancelled_reason && (
                        <div style={{ fontSize: '12px', color: '#EF4444', marginTop: '4px', lineHeight: 1.4 }}>
                          Reason: {f.cancelled_reason}
                        </div>
                      )}
                      {f.completed_at && (
                        <div style={{ fontSize: '12px', color: '#7a8fa0', marginTop: '4px' }}>
                          Sent {new Date(f.completed_at).toLocaleString('en-IE', { dateStyle: 'medium', timeStyle: 'short' })}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

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
