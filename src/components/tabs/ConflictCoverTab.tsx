import { useState } from 'react'
import { useCcBookings, useCcEvents, useCcNextOfKin, ccNeedsAttention, docLink } from '../../hooks/useConflictCover'
import { LoadingSpinner } from '../shared/LoadingSpinner'
import { EmptyState } from '../shared/EmptyState'
import { StatCard } from '../shared/StatCard'
import { formatDateTime } from '../../lib/format'
import type { CcBooking, CcEvent } from '../../lib/types'

// Conflict Cover: everything Ivy does after a line is approved in Martin's
// portal. Booking, pricing and payment live in the portal; this tab shows the
// issued documents, next-of-kin progress, reminders and anything IFG should
// look at. Demo data only until the portal integration lands (target March).

const STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  approved:  { label: 'Approved',       bg: '#EBF4FF', fg: '#3B82F6' },
  issued:    { label: 'Upcoming',       bg: '#EBF4FF', fg: '#3B82F6' },
  in_force:  { label: 'In force',       bg: '#f0fdf4', fg: '#15803d' },
  ending:    { label: 'Ends within 24h', bg: '#fffbeb', fg: '#b45309' },
  ended:     { label: 'Ended',          bg: '#f5f7fa', fg: '#7a8fa0' },
  cancelled: { label: 'Cancelled',      bg: '#fef2f2', fg: '#dc2626' },
}

const EVENT_ICON: Record<string, string> = {
  booking_approved: 'fa-square-check',
  certificate_issued: 'fa-file-pdf',
  confirmation_sent: 'fa-envelope',
  nok_requested: 'fa-user-plus',
  nok_chased: 'fa-bell',
  nok_completed: 'fa-user-check',
  nok_missing: 'fa-triangle-exclamation',
  sales_reported: 'fa-chart-column',
  end_reminder_sent: 'fa-clock',
  cover_ended: 'fa-flag-checkered',
}

function fDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
}
const money = (n: number) => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function Badge({ status }: { status: string }) {
  const s = STATUS[status] ?? { label: status, bg: '#f5f7fa', fg: '#7a8fa0' }
  return <span className="status-badge" style={{ background: s.bg, color: s.fg }}>{s.label}</span>
}

function NokCell({ b }: { b: CcBooking }) {
  if (b.nok_completed_at) return <span style={{ color: '#15803d', fontWeight: 600 }}><i className="fas fa-check" style={{ marginRight: 6 }} />On file</span>
  if (b.nok_missing_flagged_at) return <span style={{ color: '#dc2626', fontWeight: 600 }}><i className="fas fa-triangle-exclamation" style={{ marginRight: 6 }} />Missing, booker alerted</span>
  return <span style={{ color: '#b45309', fontWeight: 600 }}>Waiting{b.nok_chasers > 0 ? ` · ${b.nok_chasers} reminder${b.nok_chasers > 1 ? 's' : ''}` : ''}</span>
}

function Timeline({ events }: { events: CcEvent[] }) {
  if (!events.length) return <p style={{ fontSize: 13, color: '#7a8fa0' }}>Nothing recorded yet.</p>
  return (
    <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {events.map(e => (
        <li key={e.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <span style={{ width: 28, height: 28, borderRadius: 8, background: e.event_type === 'nok_missing' ? '#fef2f2' : '#f0fdf4', color: e.event_type === 'nok_missing' ? '#dc2626' : '#0A8754', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <i className={`fas ${EVENT_ICON[e.event_type] ?? 'fa-circle'}`} style={{ fontSize: 12 }} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{e.subject ?? e.event_type}</div>
            <div style={{ fontSize: 12, color: '#7a8fa0' }}>
              {formatDateTime(e.created_at)}{e.recipient ? ` · to ${e.recipient}` : ''}
            </div>
          </div>
        </li>
      ))}
    </ol>
  )
}

function Detail({ b }: { b: CcBooking }) {
  const { data: events = [], isLoading } = useCcEvents(b.id)
  const { data: nok } = useCcNextOfKin(b.id)
  const kv: [string, string][] = [
    ['Client', `${b.client_name} · ${b.client_billing}`],
    ['Booked by', b.booker_name ?? '—'],
    ['Covered person', `${b.person_name} · ${b.person_email}`],
    ['Over 65', b.over_65 ? 'Yes (10% loading in portal)' : 'No'],
    ['Residence', b.residence_country],
    ['Destination', `${b.destination}${b.zone ? ` · Zone ${b.zone}` : ''}`],
    ['Cover', `00:00 ${fDate(b.cover_start)} to 00:00 ${fDate(b.cover_end)} · ${b.policy_days} days`],
    ['Sum insured', `${money(b.sum_insured_usd)} pro rata`],
    ['Extras', [b.addon_sickness && 'Sickness cover', b.addon_income && 'Weekly income benefit'].filter(Boolean).join(', ') || 'None'],
    ['Premium', money(b.premium_usd)],
    ['Portal booking', b.booking_ref],
  ]
  return (
    <div style={{ background: 'white', border: '1px solid #e0e6ed', borderRadius: 14, padding: 20, display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 24 }}>
      <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{b.person_name} <span style={{ color: '#7a8fa0', fontWeight: 500 }}>· {b.certificate_no}</span></div>
          <div style={{ fontSize: 12, color: '#7a8fa0', marginTop: 2 }}>Approved {formatDateTime(b.approved_at)}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Badge status={b.status} />
          <a className="cc-doc" href={docLink(b, 'cert')} target="_blank" rel="noreferrer"><i className="fas fa-file-pdf" /> Proof of cover</a>
          <a className="cc-doc" href={docLink(b, 'pass')} target="_blank" rel="noreferrer"><i className="fas fa-wallet" /> Cover card</a>
          <a className="cc-doc" href={docLink(b, 'nok')} target="_blank" rel="noreferrer"><i className="fas fa-user-plus" /> Next-of-kin form</a>
        </div>
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#7a8fa0', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Booking</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <tbody>
            {kv.map(([k, v]) => (
              <tr key={k}><td style={{ padding: '6px 12px 6px 0', color: '#7a8fa0', whiteSpace: 'nowrap', borderTop: '1px solid #f0f0f0', verticalAlign: 'top' }}>{k}</td><td style={{ padding: '6px 0', fontWeight: 600, borderTop: '1px solid #f0f0f0' }}>{v}</td></tr>
            ))}
            <tr>
              <td style={{ padding: '6px 12px 6px 0', color: '#7a8fa0', borderTop: '1px solid #f0f0f0' }}>Next of kin</td>
              <td style={{ padding: '6px 0', borderTop: '1px solid #f0f0f0' }}>
                {nok ? <span style={{ fontWeight: 600 }}>{nok.full_name}{nok.relationship ? `, ${nok.relationship.toLowerCase()}` : ''} · {nok.phone}</span> : <NokCell b={b} />}
                <div style={{ fontSize: 11, color: '#7a8fa0', marginTop: 2 }}>Only IFG sees these details. The client sees done or not done.</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#7a8fa0', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>What Ivy did</div>
        {isLoading ? <LoadingSpinner /> : <Timeline events={events} />}
      </div>
    </div>
  )
}

export function ConflictCoverTab() {
  const { data: bookings = [], isLoading, error } = useCcBookings()
  const [openId, setOpenId] = useState<number | null>(null)
  const [filter, setFilter] = useState<'all' | 'attention'>('all')

  if (isLoading) return <LoadingSpinner />
  if (error) return <EmptyState icon="fa-triangle-exclamation" message="Conflict Cover data could not be loaded. Check the cc_bookings grants." />

  const live = bookings.filter(b => b.status !== 'cancelled')
  const inForce = live.filter(b => b.status === 'in_force' || b.status === 'ending').length
  const upcoming = live.filter(b => b.status === 'issued' || b.status === 'approved').length
  const ending = live.filter(b => b.status === 'ending').length
  const nokMissing = live.filter(b => !b.nok_completed_at && b.status !== 'ended').length
  const attention = live.filter(ccNeedsAttention)
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
  const premiumMonth = live.filter(b => new Date(b.approved_at) >= monthStart).reduce((a, b) => a + Number(b.premium_usd), 0)
  const rows = filter === 'attention' ? attention : bookings
  const open = bookings.find(b => b.id === openId) ?? null

  const styles = (
    <style>{`
        .cc-doc{display:inline-flex;align-items:center;gap:6px;font:600 12px 'Plus Jakarta Sans',sans-serif;color:#0A8754;background:white;border:1px solid #e0e6ed;border-radius:8px;padding:6px 10px;text-decoration:none;cursor:pointer}
        .cc-doc:hover{border-color:#0A8754}
        .cc-table tr.open td{background:#f0fdf4}
        .cc-filter{display:inline-flex;gap:8px}
        .cc-filter button{font:500 13px 'Plus Jakarta Sans',sans-serif;padding:8px 16px;border-radius:8px;border:1px solid #e0e6ed;background:white;color:#7a8fa0;cursor:pointer}
        .cc-filter button[aria-pressed="true"]{background:#0A8754;border-color:#0A8754;color:white;font-weight:600}
        .cc-table tbody tr:hover td{background:#f9fafb}
      `}</style>
  )

  // One booking open: the detail replaces the list, with a way back.
  if (open) {
    return (
      <>
        {styles}
        <button className="conv-back" onClick={() => setOpenId(null)}>
          <i className="fas fa-arrow-left"></i> Back to bookings
        </button>
        <Detail b={open} />
      </>
    )
  }

  return (
    <>
      {styles}

      <div className="gap-intro">
        <div>
          <div className="gap-intro-title">After approve, Ivy takes over</div>
          <div className="gap-intro-sub">
            Martin's portal owns booking, pricing and payment. The moment a line is approved, Ivy issues the proof of cover and cover card to the covered person,
            asks for their next of kin and chases it, reports the sale to Hugh and Martin, and reminds the traveller 24 hours before cover ends.
          </div>
        </div>
        <span className="gap-intro-stat">{attention.length === 0 ? 'Nothing needs you' : `${attention.length} need${attention.length === 1 ? 's' : ''} a look`}</span>
      </div>

      <div className="stats-grid">
        <StatCard value={inForce} label="In force now" />
        <StatCard value={upcoming} label="Upcoming" />
        <StatCard value={ending} label="Ending within 24h" info="The traveller has had the reminder with the exact end time and an extend link." />
        <StatCard value={nokMissing} label="Next of kin outstanding" info="Ivy chases twice before cover starts. If cover starts without one, the booker is alerted and the row is flagged here." />
        <StatCard value={money(premiumMonth)} label="Premium this month" info="Totals from the portal, as reported to Hugh and Martin." />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <div className="cc-filter">
          <button aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>All bookings ({bookings.length})</button>
          <button aria-pressed={filter === 'attention'} onClick={() => setFilter('attention')}>Needs a look ({attention.length})</button>
        </div>
        <span style={{ fontSize: 12, color: '#7a8fa0' }}>Demo data. Updates every few seconds.</span>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon="fa-shield-halved" message={filter === 'attention' ? 'Nothing needs a look.' : 'No bookings yet. Approve one in the portal stand-in.'} />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="contacts-table cc-table">
            <thead>
              <tr>
                <th>Covered person</th><th>Client</th><th>Destination</th><th>Cover</th><th>Status</th><th>Next of kin</th><th>Premium</th><th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(b => (
                <tr key={b.id} className={b.id === openId ? 'open' : ''} onClick={() => setOpenId(b.id)} style={{ cursor: 'pointer' }}>
                  <td><div style={{ fontWeight: 600 }}>{b.person_name}</div><div style={{ fontSize: 11, color: '#7a8fa0' }}>{b.certificate_no}</div></td>
                  <td><div>{b.client_name}</div><div style={{ fontSize: 11, color: '#7a8fa0' }}>{b.client_billing}</div></td>
                  <td><div>{b.destination}</div><div style={{ fontSize: 11, color: '#7a8fa0' }}>{b.zone ? `Zone ${b.zone}` : 'Zone TBC'} · from {b.residence_country}</div></td>
                  <td><div>{fDate(b.cover_start)} to {fDate(b.cover_end)}</div><div style={{ fontSize: 11, color: '#7a8fa0' }}>{b.policy_days} days, from 00:00</div></td>
                  <td><Badge status={b.status} /></td>
                  <td><NokCell b={b} /></td>
                  <td style={{ fontWeight: 600 }}>{money(b.premium_usd)}</td>
                  <td onClick={e => e.stopPropagation()} style={{ whiteSpace: 'nowrap' }}>
                    <a className="cc-doc" href={docLink(b, 'cert')} target="_blank" rel="noreferrer" title="Proof of cover"><i className="fas fa-file-pdf" /></a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
