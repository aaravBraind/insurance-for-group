import { useState, useRef, useEffect } from 'react'
import type { TabId, DateRange } from '../../lib/types'
import { AlertsPanel } from './AlertsPanel'

const TAB_TITLES: Record<TabId, string> = {
  dashboard: 'Dashboard',
  leads: 'Leads Pipeline',
  conversations: 'Conversations',
  contacts: 'Contacts',
  settings: 'Settings',
}

function formatDate(iso: string) {
  const [year, month, day] = iso.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
}

interface HeaderProps {
  activeTab: TabId
  dateRange: DateRange
  onDateRangeChange: (r: DateRange) => void
  onOpenLeadById: (leadId: string) => void
}

export function Header({ activeTab, dateRange, onDateRangeChange, onOpenLeadById }: HeaderProps) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [draft, setDraft] = useState<DateRange>(dateRange)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!pickerOpen) return
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [pickerOpen])

  function openPicker() {
    setDraft(dateRange)
    setPickerOpen(true)
  }

  function applyRange() {
    onDateRangeChange(draft)
    setPickerOpen(false)
  }

  return (
    <header className="header">
      <h1>{TAB_TITLES[activeTab]}</h1>
      <div className="header-right">
        <div style={{ position: 'relative' }} ref={popoverRef}>
          <button
            onClick={openPicker}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 14px', border: '1px solid #e0e6ed',
              borderRadius: '20px', background: '#fff', cursor: 'pointer',
              fontSize: '13px', fontWeight: 500, fontFamily: 'inherit',
              color: '#1a1a1a', whiteSpace: 'nowrap',
            }}
          >
            <i className="fas fa-calendar-alt" style={{ color: '#0A8754' }}></i>
            {formatDate(dateRange.start)} – {formatDate(dateRange.end)}
          </button>

          {pickerOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              background: '#fff', border: '1px solid #e0e6ed', borderRadius: '12px',
              padding: '16px', zIndex: 100, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              minWidth: '260px',
            }}>
              <div style={{ marginBottom: '12px', fontSize: '13px', fontWeight: 600, color: '#1a1a1a' }}>
                Select Date Range
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#7a8fa0', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    START DATE
                  </label>
                  <input
                    type="date"
                    value={draft.start}
                    max={draft.end}
                    onChange={e => setDraft(d => ({ ...d, start: e.target.value }))}
                    style={{
                      width: '100%', padding: '8px 10px', border: '1px solid #e0e6ed',
                      borderRadius: '8px', fontFamily: 'inherit', fontSize: '13px',
                      outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#7a8fa0', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    END DATE
                  </label>
                  <input
                    type="date"
                    value={draft.end}
                    min={draft.start}
                    onChange={e => setDraft(d => ({ ...d, end: e.target.value }))}
                    style={{
                      width: '100%', padding: '8px 10px', border: '1px solid #e0e6ed',
                      borderRadius: '8px', fontFamily: 'inherit', fontSize: '13px',
                      outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
              <button
                onClick={applyRange}
                style={{
                  marginTop: '14px', width: '100%', padding: '9px',
                  background: '#0A8754', color: '#fff', border: 'none',
                  borderRadius: '8px', fontFamily: 'inherit', fontSize: '13px',
                  fontWeight: 600, cursor: 'pointer',
                }}
              >
                Apply
              </button>
            </div>
          )}
        </div>

        <AlertsPanel onOpenLead={onOpenLeadById} />
        <div className="user-info">
          <div className="user-avatar">MS</div>
          <span style={{ fontSize: '13px', fontWeight: 600 }}>Hugh</span>
        </div>
      </div>
    </header>
  )
}
