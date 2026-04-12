import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Conversation, Contact, ConversationSummary, DateRange } from '../lib/types'

export function useConversations(dateRange: DateRange | null) {
  return useQuery<ConversationSummary[]>({
    queryKey: ['conversations', dateRange],
    queryFn: async () => {
      let query = supabase
        .from('conversations')
        .select('*')
        .order('created_at', { ascending: false })

      if (dateRange) {
        query = query.gte('created_at', dateRange.start).lte('created_at', dateRange.end + 'T23:59:59')
      }

      const { data: convs, error: convError } = await query
      if (convError) throw convError

      const sessionCounts = new Map<string, number>()
      const seenSessions = new Set<string>()
      const latestPerSession: Conversation[] = []
      for (const c of (convs ?? [])) {
        sessionCounts.set(c.session_id, (sessionCounts.get(c.session_id) ?? 0) + 1)
        if (!seenSessions.has(c.session_id)) {
          seenSessions.add(c.session_id)
          latestPerSession.push(c)
        }
      }

      if (latestPerSession.length === 0) return []

      const sessionIds = latestPerSession.map(c => c.session_id)
      const { data: contacts, error: contactError } = await supabase
        .from('contacts')
        .select('*')
        .in('phone', sessionIds)
      if (contactError) throw contactError

      const contactMap = new Map<string, Contact>(
        (contacts ?? []).map(c => [c.phone, c])
      )

      const contactIds = (contacts ?? []).map(c => c.id)
      let leadMap = new Map<string, { status: string; ai_score: number | null }>()
      if (contactIds.length > 0) {
        const { data: leads } = await supabase
          .from('leads')
          .select('contact_id, status, ai_score')
          .in('contact_id', contactIds)
        for (const l of (leads ?? [])) {
          leadMap.set(l.contact_id, { status: l.status, ai_score: l.ai_score })
        }
      }

      return latestPerSession.map(c => {
        const contact = contactMap.get(c.session_id) ?? null
        const lead = contact ? (leadMap.get(contact.id) ?? null) : null
        return {
          session_id: c.session_id,
          last_message: c.message,
          last_message_at: c.created_at,
          contact,
          lead,
          message_count: sessionCounts.get(c.session_id) ?? 1,
        } as ConversationSummary
      })
    },
    refetchInterval: 1000 * 30,
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
      return data ?? []
    },
    enabled: !!sessionId,
  })
}
