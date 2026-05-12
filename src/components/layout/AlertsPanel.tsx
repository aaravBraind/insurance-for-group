import { useState, useRef, useEffect } from 'react'
import { useAlerts, useMarkAlertRead, useMarkAllAlertsRead } from '../../hooks/useAlerts'
import type { AlertType, DashboardAlert } from '../../lib/types'

interface AlertsPanelProps {
  onOpenLead: (leadId: string) => void
}

type Filter = 'all' | 'qualified_lead' | 'lead_dropped_off' | 'manual_followup_needed'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'qualified_lead', label: 'Qualified' },
  { id: 'lead_dropped_off', label: 'Dropped off' },
  { id: 'manual_followup_needed', label: 'Action needed' },
]

// Per-type visual config (icon + accent colour).
const TYPE_META: Record<AlertType, { icon: string; colour: string; label: string }> = {
  qualified_lead:          { icon: 'fa-star',          colour: '#0A8754', label: 'Qualified Lead' },
  returning_customer:      { icon: 'fa-redo',          colour: '#3B82F6', label: 'Returning Customer' },
  lead_dropped_off:        { icon: 'fa-user-slash',    colour: '#EF4444', label: 'Dropped Off' },
  manual_followup_needed:  { icon: 'fa-hand-pointer', colour: '#F59E0B', label: 'Action Needed' },
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function chipStyle(active: boolean): React.CSSProperties {
  return {
    flex: '0 0 auto',
    padding: '6px 10px',
    borderRadius: '14px',
    border: active ? '1.5px solid #0A8754' : '1.5px solid #e0e6ed',
    background: active ? '#0A8754' : 'white',
    color: active ? 'white' : '#374151',
    fontSize: '11px',
    fontWeight: 600,
    lineHeight: 1.1,
    cursor: 'pointer',
    fontFamily: 'inherit',
    whiteSpace: 'nowrap',
  }
}

export function AlertsPanel({ onOpenLead }: AlertsPanelProps) {
  const { data: alerts = [], isLoading } = useAlerts()
  const markRead = useMarkAlertRead()
  const markAllRead = useMarkAllAlertsRead()
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Close on outside click.
  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  const unreadCount = alerts.filter(a => !a.is_read).length
  const visible = filter === 'all' ? alerts : alerts.filter(a => a.alert_type === filter)

  function handleViewLead(a: DashboardAlert) {
    if (!a.is_read) markRead.mutate(a.id)
    setOpen(false)
    onOpenLead(a.lead_id)
  }

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <button
        className="notif-bell"
        onClick={() => setOpen(o => !o)}
        aria-label={`${unreadCount} unread alerts`}
        style={{ position: 'relative' }}
      >
        <i className="fas fa-bell"></i>
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-2px',
              right: '-2px',
              minWidth: '18px',
              height: '18px',
              padding: '0 5px',
              borderRadius: '9px',
              background: '#EF4444',
              color: 'white',
              fontSize: '10.5px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid white',
              boxSizing: 'content-box',
              lineHeight: 1,
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 'min(420px, 92vw)',
            maxHeight: '520px',
            background: 'white',
            border: '1px solid #e0e6ed',
            borderRadius: '14px',
            boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
            zIndex: 200,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '14px 16px 10px',
              borderBottom: '1px solid #f0f4f7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
            }}
          >
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#1a1a1a' }}>
              Alerts {unreadCount > 0 && (
                <span style={{ color: '#7a8fa0', fontWeight: 500 }}>· {unreadCount} unread</span>
              )}
            </div>
            <button
              onClick={() => markAllRead.mutate()}
              disabled={unreadCount === 0 || markAllRead.isPending}
              style={{
                fontFamily: 'inherit',
                fontSize: '12px',
                fontWeight: 600,
                color: unreadCount === 0 ? '#9ca3af' : '#0A8754',
                background: 'none',
                border: 'none',
                cursor: unreadCount === 0 ? 'default' : 'pointer',
                padding: '4px 6px',
              }}
            >
              {markAllRead.isPending ? 'Marking…' : 'Mark all read'}
            </button>
          </div>

          {/* Filter chips */}
          <div
            style={{
              padding: '10px 14px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px',
              borderBottom: '1px solid #f0f4f7',
              alignItems: 'center',
            }}
          >
            {FILTERS.map(f => (
              <button key={f.id} style={chipStyle(filter === f.id)} onClick={() => setFilter(f.id)}>
                {f.label}
              </button>
            ))}
          </div>

          {/* Body */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {isLoading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#7a8fa0', fontSize: '13px' }}>
                Loading…
              </div>
            ) : visible.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: '#7a8fa0', fontSize: '13px' }}>
                <i className="far fa-bell-slash" style={{ fontSize: '22px', marginBottom: '8px', display: 'block' }}></i>
                {filter === 'all' ? 'No alerts yet' : 'No alerts in this category'}
              </div>
            ) : (
              visible.map(a => {
                const meta = TYPE_META[a.alert_type] ?? {
                  icon: 'fa-info-circle',
                  colour: '#7a8fa0',
                  label: a.alert_type,
                }
                return (
                  <div
                    key={a.id}
                    style={{
                      padding: '12px 14px',
                      borderBottom: '1px solid #f5f7fa',
                      background: a.is_read ? 'white' : '#f8faf9',
                      display: 'flex',
                      gap: '10px',
                    }}
                  >
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '10px',
                        background: meta.colour + '20',
                        color: meta.colour,
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '13px',
                      }}
                    >
                      <i className={`fas ${meta.icon}`}></i>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#1a1a1a' }}>{a.title}</span>
                        {!a.is_read && (
                          <span
                            style={{
                              width: '7px',
                              height: '7px',
                              borderRadius: '50%',
                              background: '#0A8754',
                              flexShrink: 0,
                            }}
                            aria-label="unread"
                          />
                        )}
                      </div>
                      {a.body && (
                        <div style={{ fontSize: '12.5px', color: '#374151', marginTop: '2px', lineHeight: 1.4 }}>
                          {a.body}
                        </div>
                      )}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          marginTop: '6px',
                          fontSize: '11.5px',
                          color: '#7a8fa0',
                        }}
                      >
                        <span>{timeAgo(a.created_at)}</span>
                        <button
                          onClick={() => handleViewLead(a)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#0A8754',
                            fontWeight: 600,
                            cursor: 'pointer',
                            padding: 0,
                            fontFamily: 'inherit',
                            fontSize: '11.5px',
                          }}
                        >
                          View lead
                        </button>
                        {!a.is_read && (
                          <button
                            onClick={() => markRead.mutate(a.id)}
                            disabled={markRead.isPending}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#3B82F6',
                              fontWeight: 600,
                              cursor: 'pointer',
                              padding: 0,
                              fontFamily: 'inherit',
                              fontSize: '11.5px',
                            }}
                          >
                            Mark as read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
