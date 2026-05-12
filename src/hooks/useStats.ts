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
}

// A lead is considered "converted" when its status equals this value.
// (The `statuses` table uses the `ifg_converted` row for this.)
const CONVERTED_STATUS = 'ifg_converted'

export function useStats(dateRange: DateRange | null) {
  return useQuery<DashboardStats>({
    queryKey: ['stats', dateRange],
    queryFn: async () => {
      let leadsQuery = supabase.from('leads').select('*', { count: 'exact', head: true })
      let contactsQuery = supabase.from('contacts').select('*', { count: 'exact', head: true })
      let convsQuery = supabase.from('sessions').select('*', { count: 'exact', head: true })
      let scoreQuery = supabase.from('leads').select('ai_score').not('ai_score', 'is', null)
      let convertedQuery = supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('status', CONVERTED_STATUS)

      if (dateRange) {
        const startGte = dateRange.start
        const endLte = dateRange.end + 'T23:59:59'
        leadsQuery = leadsQuery.gte('created_at', startGte).lte('created_at', endLte)
        contactsQuery = contactsQuery.gte('created_at', startGte).lte('created_at', endLte)
        convsQuery = convsQuery.gte('created_at', startGte).lte('created_at', endLte)
        scoreQuery = scoreQuery.gte('created_at', startGte).lte('created_at', endLte)
        convertedQuery = convertedQuery.gte('created_at', startGte).lte('created_at', endLte)
      }

      const [leadsRes, contactsRes, convsRes, scoreRes, convertedRes] = await Promise.all([
        leadsQuery,
        contactsQuery,
        convsQuery,
        scoreQuery,
        convertedQuery,
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

      // Conversion rate = leads that reached `ifg_converted` ÷ total leads.
      // (Previous version was leads ÷ contacts which is ~100% by design,
      // because Ivy creates a lead row for every contact.)
      const conversionRate = totalLeads > 0
        ? Math.round((convertedLeads / totalLeads) * 100)
        : 0

      return {
        totalLeads,
        totalContacts,
        totalConversations,
        avgAiScore,
        conversionRate,
        convertedLeads,
      }
    },
    refetchInterval: 1000 * 30,
  })
}
