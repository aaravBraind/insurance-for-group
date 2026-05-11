import { useState } from 'react'
import { useLeads, useUpdateLeadStatus } from '../../hooks/useLeads'
import { useStatuses } from '../../hooks/useStatuses'
import { LoadingSpinner } from '../shared/LoadingSpinner'
import type { LeadWithContact, Status, DateRange } from '../../lib/types'

interface LeadsTabProps {
  onOpenLead: (lead: LeadWithContact) => void
  dateRange: DateRange
}

interface KanbanColumnProps {
  status: Status
  leads: LeadWithContact[]
  onOpenLead: (l: LeadWithContact) => void
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

function KanbanColumn({ status, leads, onOpenLead, draggingId, dragOverCol, setDraggingId, setDragOverCol, onDrop }: KanbanColumnProps) {
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
              <div className="kc-co">{l.contact?.phone ?? l.contact?.email ?? l.policy ?? '—'}</div>
            </div>
          </div>
          <span className="kc-score">{displayScore(l)}</span>
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

export function LeadsTab({ onOpenLead, dateRange }: LeadsTabProps) {
  const { data: leads = [], isLoading } = useLeads(dateRange)
  const { data: statuses = [] } = useStatuses()
  const updateStatus = useUpdateLeadStatus()
  const [search, setSearch] = useState('')
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<string | null>(null)

  if (isLoading) return <LoadingSpinner />

  const filteredLeads = search.trim()
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

  function handleDrop(leadId: string, targetStatus: string) {
    const lead = leads.find(l => l.id === leadId)
    if (lead && lead.status !== targetStatus) {
      updateStatus.mutate({ leadId, status: targetStatus })
    }
  }

  return (
    <>
      <div style={{ marginBottom: '16px' }}>
        <input
          type="text"
          placeholder="Search Leads"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding: '10px 16px', border: '1px solid #e0e6ed', borderRadius: '10px', width: '320px', fontFamily: 'inherit', fontSize: '14px', outline: 'none' }}
        />
      </div>
      <div className="kanban">
        {statuses.map(status => (
          <KanbanColumn
            key={status.name}
            status={status}
            leads={filteredLeads.filter(l => l.status === status.name)}
            onOpenLead={onOpenLead}
            draggingId={draggingId}
            dragOverCol={dragOverCol}
            setDraggingId={setDraggingId}
            setDragOverCol={setDragOverCol}
            onDrop={handleDrop}
          />
        ))}
      </div>
    </>
  )
}
