import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { DateRange } from '../lib/types'

export interface DashboardStats {
  totalLeads: number
  totalContacts: number
  totalConversations: number
  avgAiScore: number
  conversionRate: number
}

export function useStats(dateRange: DateRange | null) {
  return useQuery<DashboardStats>({
    queryKey: ['stats', dateRange],
    queryFn: async () => {
      let leadsQuery = supabase.from('leads').select('*', { count: 'exact', head: true })
      let contactsQuery = supabase.from('contacts').select('*', { count: 'exact', head: true })
      let convsQuery = supabase.from('sessions').select('*', { count: 'exact', head: true })
      let scoreQuery = supabase.from('leads').select('ai_score').not('ai_score', 'is', null)

      if (dateRange) {
        leadsQuery = leadsQuery.gte('created_at', dateRange.start).lte('created_at', dateRange.end + 'T23:59:59')
        contactsQuery = contactsQuery.gte('created_at', dateRange.start).lte('created_at', dateRange.end + 'T23:59:59')
        convsQuery = convsQuery.gte('created_at', dateRange.start).lte('created_at', dateRange.end + 'T23:59:59')
        scoreQuery = scoreQuery.gte('created_at', dateRange.start).lte('created_at', dateRange.end + 'T23:59:59')
      }

      const [leadsRes, contactsRes, convsRes, scoreRes] = await Promise.all([
        leadsQuery,
        contactsQuery,
        convsQuery,
        scoreQuery,
      ])

      const totalLeads = leadsRes.count ?? 0
      const totalContacts = contactsRes.count ?? 0
      const totalConversations = convsRes.count ?? 0

      const scores = (scoreRes.data ?? []).map(r => r.ai_score as number)
      const avgRaw = scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : 0
      // Scores >10 are stored on a 0–100 scale and need dividing by 10 for display.
      // Scores ≤10 are already on a 0–10 scale.
      const avgAiScore = scores.length > 0
        ? Math.round((avgRaw > 10 ? avgRaw / 10 : avgRaw) * 10) / 10
        : 0

      const conversionRate = totalContacts > 0 ? Math.round((totalLeads / totalContacts) * 100) : 0

      return { totalLeads, totalContacts, totalConversations, avgAiScore, conversionRate }
    },
    refetchInterval: 1000 * 30,
  })
}
