import { useState } from 'react'
import { useContacts } from '../../hooks/useContacts'
import { useStatuses } from '../../hooks/useStatuses'
import { useCreateLead } from '../../hooks/useLeads'
import { LoadingSpinner } from '../shared/LoadingSpinner'
import { EmptyState } from '../shared/EmptyState'
import type { Contact, Status, DateRange } from '../../lib/types'
import type { ContactWithLead } from '../../hooks/useContacts'

interface ContactsTabProps {
  dateRange: DateRange
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  border: '1px solid #e0e6ed',
  borderRadius: '10px',
  fontFamily: 'inherit',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 600,
  color: '#1a1a1a',
  marginBottom: '6px',
}

function ConvertToLeadModal({
  contact,
  statuses,
  onClose,
}: {
  contact: Contact
  statuses: Status[]
  onClose: () => void
}) {
  const createLead = useCreateLead()
  const [status, setStatus] = useState('')
  const [policy, setPolicy] = useState('')
  const [riskDetails, setRiskDetails] = useState('')
  const [extraFields, setExtraFields] = useState<{ name: string; value: string }[]>([{ name: '', value: '' }])

  function addField() {
    setExtraFields(f => [...f, { name: '', value: '' }])
  }

  function removeField(i: number) {
    setExtraFields(f => f.filter((_, idx) => idx !== i))
  }

  function updateField(i: number, key: 'name' | 'value', val: string) {
    setExtraFields(f => f.map((row, idx) => idx === i ? { ...row, [key]: val } : row))
  }

  function handleSubmit() {
    if (!status) return
    const details: Record<string, unknown> = {}
    for (const f of extraFields) {
      if (f.name.trim()) details[f.name.trim()] = f.value
    }
    createLead.mutate(
      {
        contact_id: contact.id,
        status,
        policy: policy || null,
        risk_details: riskDetails || null,
        details,
      },
      { onSuccess: onClose },
    )
  }

  const name = `${contact.first_name ?? ''} ${contact.last_name ?? ''}`.trim() || contact.phone || contact.email || 'Contact'

  return (
    <div className="lead-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="lead-modal" style={{ maxWidth: '500px' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 4px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#1a1a1a' }}>Convert to Lead</div>
            <div style={{ fontSize: '13px', color: '#7a8fa0', marginTop: '2px' }}>
              Create a lead for <strong style={{ color: '#1a1a1a' }}>{name}</strong>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ width: '28px', height: '28px', borderRadius: '8px', border: '1px solid #e0e6ed', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: '#7a8fa0', flexShrink: 0 }}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Form */}
        <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Status */}
          <div>
            <label style={labelStyle}>Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              style={{ ...inputStyle, color: status ? '#1a1a1a' : '#9ca3af' }}
            >
              <option value="" disabled style={{ color: '#9ca3af' }}>Select status</option>
              {statuses.map(s => (
                <option key={s.name} value={s.name} style={{ color: '#1a1a1a' }}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Policy (column on leads) */}
          <div>
            <label style={labelStyle}>Policy</label>
            <input
              type="text"
              placeholder="e.g. corporate_group, landlord, commercial"
              value={policy}
              onChange={e => setPolicy(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Risk Details (column on leads) */}
          <div>
            <label style={labelStyle}>Risk Details</label>
            <input
              type="text"
              placeholder="e.g. high risk, pre-existing conditions"
              value={riskDetails}
              onChange={e => setRiskDetails(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Additional Details */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Additional Details</label>
              <button
                onClick={addField}
                style={{ background: 'none', border: 'none', color: '#3B82F6', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <i className="fas fa-plus" style={{ fontSize: '11px' }}></i> Add Field
              </button>
            </div>
            {extraFields.map((f, i) => (
              <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Field name"
                  value={f.name}
                  onChange={e => updateField(i, 'name', e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <input
                  type="text"
                  placeholder="Value"
                  value={f.value}
                  onChange={e => updateField(i, 'value', e.target.value)}
                  style={{ ...inputStyle, flex: 1.5 }}
                />
                <button
                  onClick={() => removeField(i)}
                  style={{ width: '32px', height: '38px', border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <i className="fas fa-trash" style={{ fontSize: '13px' }}></i>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '4px 24px 20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            onClick={onClose}
            style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid #e0e6ed', background: 'white', fontFamily: 'inherit', fontSize: '14px', fontWeight: 500, cursor: 'pointer', color: '#374151' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!status || createLead.isPending}
            style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: !status ? '#9ca3af' : '#1E3A5F', fontFamily: 'inherit', fontSize: '14px', fontWeight: 600, cursor: status ? 'pointer' : 'not-allowed', color: 'white' }}
          >
            {createLead.isPending ? 'Converting...' : 'Convert to Lead'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function ContactsTab({ dateRange }: ContactsTabProps) {
  const { data: contacts = [], isLoading } = useContacts(dateRange)
  const { data: statuses = [] } = useStatuses()
  const [search, setSearch] = useState('')
  const [convertingContact, setConvertingContact] = useState<Contact | null>(null)

  if (isLoading) return <LoadingSpinner />
  if (contacts.length === 0) return <EmptyState icon="fa-address-book" message="No contacts yet" />

  const filtered = (contacts as ContactWithLead[]).filter(c => {
    const q = search.toLowerCase()
    return (
      !q ||
      c.phone?.toLowerCase().includes(q) ||
      c.first_name?.toLowerCase().includes(q) ||
      c.last_name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    )
  })

  return (
    <>
      <div style={{ marginBottom: '16px' }}>
        <input
          type="text"
          placeholder="Search Contacts"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding: '10px 16px', border: '1px solid #e0e6ed', borderRadius: '10px', width: '300px', fontFamily: 'inherit', fontSize: '14px', outline: 'none' }}
        />
      </div>
      <table className="contacts-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Phone</th>
            <th>Email</th>
            <th>Source</th>
            <th>Converted</th>
            <th>Created At</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(c => (
            <tr key={c.id}>
              <td><strong>{c.first_name ?? ''} {c.last_name ?? ''}</strong></td>
              <td>{c.phone ?? '—'}</td>
              <td>{c.email ?? '—'}</td>
              <td style={{ textTransform: 'capitalize' }}>{c.origin ?? '—'}</td>
              <td>
                {c.lead ? (
                  <span className="status-badge" style={{ background: '#f0fdf4', color: '#15803d' }}>Converted</span>
                ) : (
                  <button className="convert-btn" onClick={() => setConvertingContact(c)}>
                    Convert to Lead
                  </button>
                )}
              </td>
              <td style={{ color: '#7a8fa0', whiteSpace: 'nowrap' }}>
                {new Date(c.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {convertingContact && (
        <ConvertToLeadModal
          contact={convertingContact}
          statuses={statuses}
          onClose={() => setConvertingContact(null)}
        />
      )}
    </>
  )
}
