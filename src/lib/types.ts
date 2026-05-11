// Auto-aligned with Supabase public schema (project: vixufpnqefeumkefzpvf).
// Tables prefixed `ifg_*` are intentionally ignored here.

export interface Contact {
  id: string
  phone: string | null
  email: string | null
  first_name: string | null
  last_name: string | null
  origin: string | null
  created_at: string
}

export interface Lead {
  id: string
  contact_id: string | null
  ai_score: number | null
  policy: string | null
  risk_details: string | null
  status: string | null
  details: LeadDetails
  origin: string | null
  session_id: string | null
  created_at: string
}

// Mirrors the jsonb shape produced by Ivy / Hugh agents.
// All fields optional — agents fill them in over time.
export interface LeadDetails {
  stage?: string
  purpose?: string
  duration?: string
  org_type?: string
  destination?: string
  is_returning?: boolean
  organisation?: string
  channel_preference?: 'email' | 'whatsapp' | 'website' | string
  channel_session_id?: string
  conversation_summary?: string
  handoff_sent_at?: string
  hugh_notified_at?: string
  last_user_message_at?: string
  [key: string]: unknown
}

export interface LeadWithContact extends Lead {
  contact: Contact | null
}

export interface ConversationMessage {
  type: 'ai' | 'human' | 'tool' | string
  content: string
  additional_kwargs?: Record<string, unknown>
  response_metadata?: Record<string, unknown>
  tool_calls?: unknown[]
  invalid_tool_calls?: unknown[]
}

export type ConversationChannel = 'website' | 'whatsapp' | 'email' | null

export interface Conversation {
  id: number
  session_id: string
  message: ConversationMessage
  channel: ConversationChannel
  created_at: string
}

export interface Session {
  id: string
  session_id: string
  origin: string | null
  processing_until: string | null
  lead_id: string | null
  created_at: string
}

export interface Status {
  id: number
  name: string
  label: string
  colour: string
  created_at: string
}

export interface FollowupSchedule {
  id: number
  lead_id: string
  session_id: string
  next_step: 'step_20min' | 'step_day3' | 'step_day7' | 'completed' | 'cancelled'
  next_due_at: string
  cancelled_at: string | null
  cancelled_reason: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export type AlertType =
  | 'qualified_lead'
  | 'returning_customer'
  | 'lead_dropped_off'
  | 'manual_followup_needed'

export interface DashboardAlert {
  id: number
  lead_id: string
  alert_type: AlertType
  title: string
  body: string | null
  is_read: boolean
  read_at: string | null
  created_at: string
}

// Derived type for the conversations list view
export interface ConversationSummary {
  session_id: string
  channel: ConversationChannel
  last_message: ConversationMessage
  last_message_at: string
  contact: Contact | null
  lead: Pick<Lead, 'id' | 'status' | 'ai_score' | 'policy'> | null
  message_count: number
}

export type TabId = 'dashboard' | 'leads' | 'conversations' | 'contacts' | 'settings'

export interface DateRange {
  start: string // ISO date "YYYY-MM-DD"
  end: string
}
