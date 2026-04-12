export interface Contact {
  id: string
  phone: string
  first_name: string | null
  last_name: string | null
  email: string | null
  location: string | null
  origin: string
  created_at: string
}

export interface Lead {
  id: string
  contact_id: string
  ai_score: number | null
  status: string
  details: LeadDetails
  origin: string
  created_at: string
}

export interface LeadDetails {
  insurance_type?: string
  num_properties?: string
  cover_needed?: string
  callback_time?: string
  term?: string | number
  cover_amount?: string | number
  annual_salary?: string | number
  occupation?: string
  renewal_date?: string
  date_of_birth?: string
  smoker_status?: string
  retirement_age?: string | number
  deferred_period?: string
  current_provider?: string
  [key: string]: unknown
}

export interface LeadWithContact extends Lead {
  contact: Contact
}

export interface ConversationMessage {
  type: 'ai' | 'human'
  content: string
  additional_kwargs?: Record<string, unknown>
  response_metadata?: Record<string, unknown>
  tool_calls?: unknown[]
  invalid_tool_calls?: unknown[]
}

export interface Conversation {
  id: number
  session_id: string
  message: ConversationMessage
  created_at: string
}

export interface Session {
  id: string
  session_id: string
  origin: string
  created_at: string
}

export interface Status {
  id: number
  name: string
  label: string
  colour: string
  created_at: string
}

export interface OutreachTracking {
  id: string
  contact_id: string
  outreach_sent_at: string
  whatsapp_outreach: boolean
  has_replied: boolean
  replied_at: string | null
  notification_sent: boolean
  notification_sent_at: string | null
  created_at: string
}

export interface CnaSequence {
  id: string
  contact_id: string | null
  lead_id: string | null
  status: string | null
  current_step: number
  phone: string | null
  next_message_at: string | null
  created_at: string
}

export interface LeadGenerationLog {
  id: string
  session_id: string | null
  lead_id: string | null
  summary: string | null
  processed_until: number | null
  created_at: string
}

// Derived type for the conversations list view
export interface ConversationSummary {
  session_id: string
  last_message: ConversationMessage
  last_message_at: string
  contact: Contact | null
  lead: Lead | null
  message_count: number
}

export type TabId = 'dashboard' | 'leads' | 'conversations' | 'contacts' | 'settings'

export interface DateRange {
  start: string  // ISO date string "YYYY-MM-DD"
  end: string
}
