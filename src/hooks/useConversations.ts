import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type {
  Conversation,
  Contact,
  Lead,
  ConversationSummary,
  DateRange,
} from '../lib/types'

/**
 * Real join path (per schema):
 *   conversations.session_id  →  sessions.session_id
 *   sessions.lead_id          →  leads.id
 *   leads.contact_id          →  contacts.id
 *
 * We fetch conversations, then hydrate sessions + leads + contacts in two
 * extra round-trips (cheaper than per-row embeds for the typical "last
 * message per session" view).
 */
export function useConversations(dateRange: DateRange | null) {
  return useQuery<ConversationSummary[]>({
    queryKey: ['conversations', dateRange],
    queryFn: async () => {
      let query = supabase
        .from('conversations')
        .select('*')
        .order('created_at', { ascending: false })

      if (dateRange) {
        query = query
          .gte('created_at', dateRange.start)
          .lte('created_at', dateRange.end + 'T23:59:59')
      }

      const { data: convs, error: convError } = await query
      if (convError) throw convError

      const rows = (convs ?? []) as Conversation[]

      // Aggregate: count messages per session_id + keep latest (already
      // ordered desc, so first occurrence per session_id wins).
      const sessionCounts = new Map<string, number>()
      const latestPerSession: Conversation[] = []
      const seen = new Set<string>()
      for (const c of rows) {
        sessionCounts.set(c.session_id, (sessionCounts.get(c.session_id) ?? 0) + 1)
        if (!seen.has(c.session_id)) {
          seen.add(c.session_id)
          latestPerSession.push(c)
        }
      }
      if (latestPerSession.length === 0) return []

      const sessionIds = latestPerSession.map(c => c.session_id)

      // Pull sessions for those session_ids
      const { data: sessions, error: sessError } = await supabase
        .from('sessions')
        .select('session_id, lead_id')
        .in('session_id', sessionIds)
      if (sessError) throw sessError

      const sessionToLeadId = new Map<string, string | null>()
      const leadIds: string[] = []
      for (const s of sessions ?? []) {
        sessionToLeadId.set(s.session_id, s.lead_id ?? null)
        if (s.lead_id) leadIds.push(s.lead_id)
      }

      // Pull leads + embedded contacts for the leads we found
      const leadMap = new Map<
        string,
        { lead: Pick<Lead, 'id' | 'status' | 'ai_score' | 'policy'>; contact: Contact | null }
      >()
      if (leadIds.length > 0) {
        const { data: leads, error: leadsError } = await supabase
          .from('leads')
          .select('id, status, ai_score, policy, contact:contacts(*)')
          .in('id', leadIds)
        if (leadsError) throw leadsError
        for (const l of (leads ?? []) as Array<
          Pick<Lead, 'id' | 'status' | 'ai_score' | 'policy'> & {
            contact: Contact | Contact[] | null
          }
        >) {
          const contact = Array.isArray(l.contact) ? (l.contact[0] ?? null) : l.contact
          leadMap.set(l.id, {
            lead: { id: l.id, status: l.status, ai_score: l.ai_score, policy: l.policy },
            contact,
          })
        }
      }

      return latestPerSession.map<ConversationSummary>(c => {
        const leadId = sessionToLeadId.get(c.session_id) ?? null
        const joined = leadId ? leadMap.get(leadId) : undefined
        return {
          session_id: c.session_id,
          channel: c.channel ?? null,
          last_message: c.message,
          last_message_at: c.created_at,
          contact: joined?.contact ?? null,
          lead: joined?.lead ?? null,
          message_count: sessionCounts.get(c.session_id) ?? 1,
        }
      })
    },
    refetchInterval: 1000 * 30,
  })
}

/**
 * All sessions tied to a single lead, with the channel + message count for
 * each. Pulled from both `sessions.lead_id = leadId` and the lead's own
 * `session_id` field (some manual leads don't have a row in `sessions`).
 */
export interface LeadSessionInfo {
  session_id: string
  channel: 'website' | 'whatsapp' | 'email' | null
  message_count: number
  last_message_at: string | null
}

export function useLeadSessions(leadId: string | null, leadSessionId: string | null) {
  return useQuery<LeadSessionInfo[]>({
    queryKey: ['lead-sessions', leadId, leadSessionId],
    queryFn: async () => {
      const sessionIds = new Set<string>()

      if (leadId) {
        const { data, error } = await supabase
          .from('sessions')
          .select('session_id')
          .eq('lead_id', leadId)
        if (error) throw error
        for (const s of data ?? []) sessionIds.add(s.session_id)
      }
      if (leadSessionId) sessionIds.add(leadSessionId)
      if (sessionIds.size === 0) return []

      const ids = Array.from(sessionIds)
      const { data: convs, error: convError } = await supabase
        .from('conversations')
        .select('session_id, channel, created_at')
        .in('session_id', ids)
      if (convError) throw convError

      const map = new Map<string, LeadSessionInfo>()
      for (const id of ids) {
        map.set(id, { session_id: id, channel: null, message_count: 0, last_message_at: null })
      }
      for (const c of (convs ?? []) as Array<{ session_id: string; channel: LeadSessionInfo['channel']; created_at: string }>) {
        const cur = map.get(c.session_id)!
        cur.message_count += 1
        if (!cur.channel && c.channel) cur.channel = c.channel
        if (!cur.last_message_at || c.created_at > cur.last_message_at) cur.last_message_at = c.created_at
      }
      return Array.from(map.values()).sort((a, b) => (b.last_message_at ?? '').localeCompare(a.last_message_at ?? ''))
    },
    enabled: !!(leadId || leadSessionId),
  })
}

/**
 * Map of lead.id → list of channels this lead has any conversation in.
 * Used by the kanban so each lead card can show per-channel chat buttons.
 */
export function useLeadChannelsMap() {
  return useQuery<Record<string, ('website' | 'whatsapp' | 'email')[]>>({
    queryKey: ['lead-channels-map'],
    queryFn: async () => {
      const { data: sess, error: sessErr } = await supabase
        .from('sessions')
        .select('lead_id, session_id')
        .not('lead_id', 'is', null)
      if (sessErr) throw sessErr

      const sessionToLead = new Map<string, string>()
      const sessionIds: string[] = []
      for (const s of (sess ?? []) as Array<{ lead_id: string; session_id: string }>) {
        sessionToLead.set(s.session_id, s.lead_id)
        sessionIds.push(s.session_id)
      }
      if (sessionIds.length === 0) return {}

      const { data: convs, error: convErr } = await supabase
        .from('conversations')
        .select('session_id, channel')
        .in('session_id', sessionIds)
      if (convErr) throw convErr

      const result: Record<string, Set<'website' | 'whatsapp' | 'email'>> = {}
      for (const c of (convs ?? []) as Array<{ session_id: string; channel: 'website' | 'whatsapp' | 'email' | null }>) {
        if (!c.channel) continue
        const leadId = sessionToLead.get(c.session_id)
        if (!leadId) continue
        const set = result[leadId] ?? new Set()
        set.add(c.channel)
        result[leadId] = set
      }
      const out: Record<string, ('website' | 'whatsapp' | 'email')[]> = {}
      for (const [k, v] of Object.entries(result)) out[k] = Array.from(v)
      return out
    },
    refetchInterval: 1000 * 60,
  })
}

export function useConversationMessages(sessionId: string | null) {
  return useQuery<Conversation[]>({
    queryKey: ['conversation-messages', sessionId],
    queryFn: async () => {
      if (!sessionId) return []
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as Conversation[]
    },
    enabled: !!sessionId,
  })
}
