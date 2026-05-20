import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { DateRange } from '../lib/types'

export interface DashboardStats {
  totalLeads: number
  totalContacts: number
  totalConversations: number
  avgAiScore: number
  conversionRate: number
  convertedLeads: number
  qualifiedLeads: number
}

// A lead is considered "converted" when its status equals this value.
// (The `statuses` table uses the `ifg_converted` row for this.)
const CONVERTED_STATUS = 'ifg_converted'

// Conversion rate counts contacts that reached this status, to match how the
// sales team tracks qualified pipeline.
const QUALIFIED_STATUS = 'ifg_qualified'

export function useStats(dateRange: DateRange | null) {
  return useQuery<DashboardStats>({
    queryKey: ['stats', dateRange],
    queryFn: async () => {
      let leadsQuery = supabase.from('leads').select('*', { count: 'exact', head: true })
      let contactsQuery = supabase.from('contacts').select('*', { count: 'exact', head: true })
      // One conversation per contact (a message is sent to every contact),
      // so the conversation count is just the contact count.
      let convsQuery = supabase.from('contacts').select('*', { count: 'exact', head: true })
      let scoreQuery = supabase.from('leads').select('ai_score').not('ai_score', 'is', null)
      let convertedQuery = supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('status', CONVERTED_STATUS)
      let qualifiedQuery = supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('status', QUALIFIED_STATUS)

      if (dateRange) {
        const startGte = dateRange.start
        const endLte = dateRange.end + 'T23:59:59'
        leadsQuery = leadsQuery.gte('created_at', startGte).lte('created_at', endLte)
        contactsQuery = contactsQuery.gte('created_at', startGte).lte('created_at', endLte)
        convsQuery = convsQuery.gte('created_at', startGte).lte('created_at', endLte)
        scoreQuery = scoreQuery.gte('created_at', startGte).lte('created_at', endLte)
        convertedQuery = convertedQuery.gte('created_at', startGte).lte('created_at', endLte)
        qualifiedQuery = qualifiedQuery.gte('created_at', startGte).lte('created_at', endLte)
      }

      const [leadsRes, contactsRes, convsRes, scoreRes, convertedRes, qualifiedRes] = await Promise.all([
        leadsQuery,
        contactsQuery,
        convsQuery,
        scoreQuery,
        convertedQuery,
        qualifiedQuery,
      ])

      const totalLeads = leadsRes.count ?? 0
      const totalContacts = contactsRes.count ?? 0
      const totalConversations = convsRes.count ?? 0
      const convertedLeads = convertedRes.count ?? 0

      const scores = (scoreRes.data ?? []).map(r => r.ai_score as number)
      const avgRaw = scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : 0
      // Scores >10 are stored on a 0–100 scale and need dividing by 10 for display.
      // Scores ≤10 are already on a 0–10 scale.
      const avgAiScore = scores.length > 0
        ? Math.round((avgRaw > 10 ? avgRaw / 10 : avgRaw) * 10) / 10
        : 0

      // Conversion rate = qualified leads ÷ total leads.
      const qualifiedLeads = qualifiedRes.count ?? 0
      const conversionRate = totalLeads > 0
        ? Math.round((qualifiedLeads / totalLeads) * 100)
        : 0

      return {
        totalLeads,
        totalContacts,
        totalConversations,
        avgAiScore,
        conversionRate,
        convertedLeads,
        qualifiedLeads,
      }
    },
    refetchInterval: 1000 * 30,
  })
}
