import { useState, useEffect, useRef } from 'react'
import { useLeadSummary, useUpdateLeadStatus } from '../../hooks/useLeads'
import { ConversationChat } from '../shared/ConversationChat'
import type { LeadWithContact, Status } from '../../lib/types'

interface DetailPanelProps {
  lead: LeadWithContact | null
  statuses: Status[]
  onClose: () => void
  onViewConversation: (sessionId: string) => void
}

const LABEL_MAP: Record<string, string> = {
  insurance_type: 'Insurance Type',
  num_properties: 'Properties',
  cover_needed: 'Cover Needed',
  callback_time: 'Callback Time',
  term: 'Term',
  cover_amount: 'Cover Amount',
  annual_salary: 'Annual Salary',
  occupation: 'Occupation',
  renewal_date: 'Renewal Date',
  date_of_birth: 'Date of Birth',
  smoker_status: 'Smoker Status',
  retirement_age: 'Retirement Age',
  deferred_period: 'Deferred Period',
  current_provider: 'Current Provider',
}

function toTitleCase(key: string) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined || v === 'null' || v === '') return '—'
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
  const { data: summary } = useLeadSummary(lead?.id ?? null)
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
    if (lead) { setCurrentStatus(lead.status); setConvOpen(false) }
  }, [lead?.id])

  if (!lead) return null

  const { contact } = lead
  const statusObj = statuses.find(s => s.name === currentStatus)
  const displayScore = lead.ai_score != null
    ? (lead.ai_score > 10 ? (lead.ai_score / 10).toFixed(1) : lead.ai_score.toFixed(1))
    : null

  const detailEntries = lead.details ? Object.entries(lead.details) : []

  function handleStatusChange(newStatus: string) {
    setCurrentStatus(newStatus)
    updateStatus.mutate({ leadId: lead!.id, status: newStatus })
  }

  const contactName = `${contact.first_name ?? ''} ${contact.last_name ?? ''}`.trim() || contact.phone

  if (convOpen) {
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
            <ConversationChat sessionId={contact.phone} contactName={contactName} />
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
            {contact.first_name} {contact.last_name}
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
                {statusObj?.label ?? currentStatus}
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
            <button
              onClick={() => setConvOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '20px', border: '1.5px solid #e0e6ed', background: 'white', fontFamily: 'inherit', fontSize: '13px', fontWeight: 600, color: '#1a1a1a', cursor: 'pointer' }}
            >
              <i className="fas fa-comments" style={{ fontSize: '12px' }}></i> View Conversation
            </button>
          </div>
        </div>

        {/* Contact Information */}
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
                <div style={{ fontSize: '13px', fontWeight: 500 }}>{contact.phone}</div>
              </div>
            </div>
          </div>
        </div>

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
                <div style={{ fontSize: '13px', fontWeight: 600 }}>{statusObj?.label ?? currentStatus}</div>
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

        {/* Summary */}
        {summary && (
          <div className="lead-modal-section">
            <div className="lead-modal-section-title">
              <i className="fas fa-file-alt" style={{ color: '#1a1a1a', fontSize: '13px' }}></i> Summary
            </div>
            <p style={{ fontSize: '13px', lineHeight: 1.6, color: '#374151', margin: 0 }}>{summary}</p>
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
