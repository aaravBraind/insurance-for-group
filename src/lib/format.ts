// Display helpers for turning raw DB values (snake_case enum codes, Postgres
// timestamps, etc.) into human-readable text for the UI.

export function toTitleCase(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// Specific policy codes whose display name differs from a plain title-cased
// version of the snake_case key.
const POLICY_LABEL_MAP: Record<string, string> = {
  individual_self_serve: 'Individual Cover',
}

export function formatPolicy(v: string | null | undefined): string {
  if (!v) return '—'
  return POLICY_LABEL_MAP[v] ?? toTitleCase(v)
}

// Generic "enum-ish" code: turns "website_chat" into "Website Chat".
// Leaves plain words and values containing whitespace/punctuation untouched.
export function formatEnum(v: string | null | undefined): string {
  if (!v) return '—'
  if (/^[a-z0-9]+(_[a-z0-9]+)+$/.test(v)) return toTitleCase(v)
  return v
}

// Normalise a date string (ISO 8601 or Postgres "YYYY-MM-DD HH:MM:SS.ffffff+00")
// into a human-readable date+time for display.
// Normalise lead.details.captured_via (e.g. "website_chat") into one of the
// three channel codes used on conversations.
export type Channel = 'website' | 'whatsapp' | 'email'

export function leadChannel(capturedVia: string | null | undefined): Channel | null {
  if (!capturedVia) return null
  const v = capturedVia.toLowerCase()
  if (v.includes('whatsapp')) return 'whatsapp'
  if (v.includes('email')) return 'email'
  if (v.includes('website') || v.includes('web') || v.includes('chat')) return 'website'
  return null
}

export const CHANNEL_LABEL: Record<Channel, string> = {
  website: 'Website Chat',
  whatsapp: 'WhatsApp',
  email: 'Email',
}

// Friendly display for how a lead reached us. Prefers
// `lead.details.captured_via` (e.g. "website_chat"), falls back to the
// `leads.origin` column (e.g. "website", "email_inbound", "manual").
const CAPTURED_VIA_LABEL: Record<string, string> = {
  website_chat: 'Website Chat',
  website: 'Website Chat',
  email_inbound: 'Email',
  email: 'Email',
  whatsapp: 'WhatsApp',
  manual: 'Manual',
  automated: 'Automated',
  corporate_inquiry: 'Corporate Inquiry Form',
  'insuranceforgroup.com': 'Website',
}

export function formatCapturedVia(capturedVia: string | null | undefined, origin: string | null | undefined): string | null {
  const raw = (capturedVia ?? origin ?? '').trim()
  if (!raw) return null
  return CAPTURED_VIA_LABEL[raw.toLowerCase()] ?? toTitleCase(raw)
}

export function formatDateTime(v: string | null | undefined): string {
  if (!v) return '—'
  if (!/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(v)) return v
  const iso = v.replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00')
  const d = new Date(iso)
  if (isNaN(d.getTime())) return v
  return d.toLocaleString('en-IE', { dateStyle: 'medium', timeStyle: 'short' })
}
