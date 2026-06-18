import { useState, type CSSProperties } from 'react'
import { useLeads, useUpdateLeadStatus } from '../../hooks/useLeads'
import { useStatuses } from '../../hooks/useStatuses'
import { LoadingSpinner } from '../shared/LoadingSpinner'
import type { LeadWithContact, Status, DateRange } from '../../lib/types'
import { formatPolicy, formatCapturedVia, type Channel } from '../../lib/format'
import { ChannelFilter } from '../shared/ChannelFilter'
import { LeadConversationsModal } from '../shared/LeadConversationsModal'
import { useLeadChannelsMap } from '../../hooks/useConversations'

// Leads moved here are dropped into the "Not Responded (Archived)" column.
const ARCHIVED_STATUS = 'ifg_archived'
// The "New Leads" column shows every lead regardless of AI score; all other
// columns are gated to leads the AI has actually scored.
const NEW_LEAD_STATUS = 'ifg_new_lead'

interface LeadsTabProps {
  onOpenLead: (lead: LeadWithContact) => void
  dateRange: DateRange
}

interface KanbanColumnProps {
  status: Status
  leads: LeadWithContact[]
  onOpenLead: (l: LeadWithContact) => void
  onOpenConversation: (lead: LeadWithContact, channel: Channel | null) => void
  onArchive: (lead: LeadWithContact) => void
  draggingId: string | null
  dragOverCol: string | null
  setDraggingId: (id: string | null) => void
  setDragOverCol: (col: string | null) => void
  onDrop: (leadId: string, targetStatus: string) => void
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

function KanbanColumn({ status, leads, onOpenLead, onOpenConversation, onArchive, draggingId, dragOverCol, setDraggingId, setDragOverCol, onDrop }: KanbanColumnProps) {
  const isArchivedColumn = status.name === ARCHIVED_STATUS
  const displayScore = (l: LeadWithContact) =>
    l.ai_score != null ? (l.ai_score > 10 ? (l.ai_score / 10).toFixed(1) : l.ai_score.toFixed(1)) : '—'

  const isOver = dragOverCol === status.name

  return (
    <div
      className="kanban-col"
      onDragOver={e => { e.preventDefault(); setDragOverCol(status.name) }}
      onDragLeave={e => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverCol(null)
      }}
      onDrop={e => {
        e.preventDefault()
        const leadId = e.dataTransfer.getData('leadId')
        if (leadId) onDrop(leadId, status.name)
        setDragOverCol(null)
      }}
      style={{
        borderColor: isOver ? '#0A8754' : 'transparent',
        background: isOver ? '#f0fdf4' : 'white',
        transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      <div className="kanban-header">
        <span className="kanban-title">{status.label}</span>
        <span className="kanban-count">{leads.length}</span>
      </div>
      {leads.map(l => (
        <div
          key={l.id}
          className="kanban-card"
          draggable
          onClick={() => onOpenLead(l)}
          onDragStart={e => {
            e.dataTransfer.setData('leadId', l.id)
            e.dataTransfer.effectAllowed = 'move'
            setDraggingId(l.id)
          }}
          onDragEnd={() => setDraggingId(null)}
          style={{ opacity: draggingId === l.id ? 0.4 : 1, cursor: 'grab' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              background: getAvatarColor(l.id), color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '11px', fontWeight: 700, flexShrink: 0,
            }}>
              {getInitials(l.contact)}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span className="kc-name">
                  {l.contact
                    ? (`${l.contact.first_name ?? ''} ${l.contact.last_name ?? ''}`.trim() || l.contact.phone || l.contact.email || 'Unknown')
                    : 'Unknown'}
                </span>
                {l.origin === 'manual' && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '1px 6px', borderRadius: '10px', background: '#EFF6FF', color: '#3B82F6', fontSize: '10px', fontWeight: 600 }}>
                    <i className="fas fa-user" style={{ fontSize: '9px' }}></i> Manual
                  </span>
                )}
              </div>
              <div className="kc-co">{l.contact?.phone ?? l.contact?.email ?? formatPolicy(l.policy)}</div>
            </div>
          </div>
          {(() => {
            const source = formatCapturedVia(l.details?.captured_via as string | undefined, l.origin)
            return source ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px', fontSize: '11px', color: '#7a8fa0' }}>
                <i className="fas fa-location-arrow" style={{ fontSize: '9px' }} />
                <span>via {source}</span>
              </div>
            ) : null
          })()}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <span className="kc-score">{displayScore(l)}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                title="View conversations"
                onClick={e => { e.stopPropagation(); onOpenConversation(l, null) }}
                onMouseDown={e => e.stopPropagation()}
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: '26px', height: '26px', borderRadius: '50%',
                  border: '1px solid #e0e6ed', background: 'white',
                  cursor: 'pointer', padding: 0,
                }}
              >
                <i className="fas fa-comments" style={{ fontSize: '11px', color: '#0A8754' }} />
              </button>
              {!isArchivedColumn && (
                <button
                  type="button"
                  title="Archive (move to Not Responded)"
                  onClick={e => { e.stopPropagation(); onArchive(l) }}
                  onMouseDown={e => e.stopPropagation()}
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: '26px', height: '26px', borderRadius: '50%',
                    border: '1px solid #e0e6ed', background: 'white',
                    cursor: 'pointer', padding: 0,
                  }}
                >
                  <i className="fas fa-box-archive" style={{ fontSize: '11px', color: '#7a8fa0' }} />
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
      {leads.length === 0 && (
        <div style={{ fontSize: '12px', color: isOver ? '#0A8754' : '#b0bec5', textAlign: 'center', padding: '16px 0', transition: 'color 0.15s' }}>
          {isOver ? 'Drop here' : 'No leads'}
        </div>
      )}
    </div>
  )
}

type DatePreset = 'today' | 'last3' | 'last7' | 'month'

const DATE_PRESETS: { key: DatePreset; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'last3', label: 'Last 3 Days' },
  { key: 'last7', label: 'Last 7 Days' },
  { key: 'month', label: 'This Month' },
]

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Translate a quick preset into a concrete {start, end} range. Returns null
// for the "All" case so the caller falls back to the global header range.
function presetToRange(preset: DatePreset | null): DateRange | null {
  if (!preset) return null
  const now = new Date()
  const end = toISO(now)
  if (preset === 'today') return { start: end, end }
  if (preset === 'last3') {
    const s = new Date(now); s.setDate(s.getDate() - 2)
    return { start: toISO(s), end }
  }
  if (preset === 'last7') {
    const s = new Date(now); s.setDate(s.getDate() - 6)
    return { start: toISO(s), end }
  }
  // 'month' → first day of the current month through today
  return { start: toISO(new Date(now.getFullYear(), now.getMonth(), 1)), end }
}

export function LeadsTab({ onOpenLead, dateRange }: LeadsTabProps) {
  const [preset, setPreset] = useState<DatePreset | null>(null)
  const effectiveRange = presetToRange(preset) ?? dateRange
  const { data: leads = [], isLoading } = useLeads(effectiveRange)
  const { data: leadChannelsMap = {} } = useLeadChannelsMap()
  const { data: statuses = [] } = useStatuses()
  const updateStatus = useUpdateLeadStatus()
  const [search, setSearch] = useState('')
  const [channelFilter, setChannelFilter] = useState<Channel | 'all'>('all')
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<string | null>(null)
  const [convLead, setConvLead] = useState<{ lead: LeadWithContact; channel: Channel | null } | null>(null)

  if (isLoading) return <LoadingSpinner />

  const searchedLeads = search.trim()
    ? leads.filter(l => {
        const q = search.toLowerCase()
        return (
          l.contact?.first_name?.toLowerCase().includes(q) ||
          l.contact?.last_name?.toLowerCase().includes(q) ||
          l.contact?.phone?.toLowerCase().includes(q) ||
          l.contact?.email?.toLowerCase().includes(q) ||
          l.policy?.toLowerCase().includes(q)
        )
      })
    : leads
  const filteredLeads = channelFilter === 'all'
    ? searchedLeads
    : searchedLeads.filter(l => (leadChannelsMap[l.id] ?? []).includes(channelFilter))

  // New Leads shows every matching lead; all other columns stay gated to
  // leads the AI has scored (> 0).
  const leadsForColumn = (statusName: string) =>
    filteredLeads.filter(
      l => l.status === statusName && (statusName === NEW_LEAD_STATUS || (l.ai_score ?? 0) > 0)
    )

  function handleDrop(leadId: string, targetStatus: string) {
    const lead = leads.find(l => l.id === leadId)
    if (lead && lead.status !== targetStatus) {
      updateStatus.mutate({ leadId, status: targetStatus })
    }
  }

  function handleArchive(lead: LeadWithContact) {
    if (lead.status !== ARCHIVED_STATUS) {
      updateStatus.mutate({ leadId: lead.id, status: ARCHIVED_STATUS })
    }
  }

  const presetBtnStyle = (active: boolean): CSSProperties => ({
    padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
    fontFamily: 'inherit', fontSize: '13px', fontWeight: 500,
    border: active ? '1px solid #0A8754' : '1px solid #e0e6ed',
    background: active ? '#f0fdf4' : '#fff',
    color: active ? '#0A8754' : '#7a8fa0', whiteSpace: 'nowrap',
  })

  return (
    <>
      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search Leads"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding: '10px 16px', border: '1px solid #e0e6ed', borderRadius: '10px', width: '320px', fontFamily: 'inherit', fontSize: '14px', outline: 'none' }}
        />
        <ChannelFilter value={channelFilter} onChange={setChannelFilter} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            onClick={() => setPreset(null)}
            style={presetBtnStyle(preset === null)}
          >
            All
          </button>
          {DATE_PRESETS.map(p => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPreset(prev => (prev === p.key ? null : p.key))}
              style={presetBtnStyle(preset === p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div className="kanban">
        {statuses.map(status => (
          <KanbanColumn
            key={status.name}
            status={status}
            leads={leadsForColumn(status.name)}
            onOpenLead={onOpenLead}
            onOpenConversation={(lead, channel) => setConvLead({ lead, channel })}
            onArchive={handleArchive}
            draggingId={draggingId}
            dragOverCol={dragOverCol}
            setDraggingId={setDraggingId}
            setDragOverCol={setDragOverCol}
            onDrop={handleDrop}
          />
        ))}
      </div>
      {convLead && (
        <LeadConversationsModal
          lead={convLead.lead}
          initialChannel={convLead.channel}
          onClose={() => setConvLead(null)}
        />
      )}
    </>
  )
}
