import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Contact, Lead, DateRange } from '../lib/types'

export interface ContactWithLead extends Contact {
  lead: Pick<Lead, 'status' | 'ai_score'> | null
}

export function useContacts(dateRange: DateRange | null) {
  return useQuery<ContactWithLead[]>({
    queryKey: ['contacts', dateRange],
    queryFn: async () => {
      let query = supabase
        .from('contacts')
        .select(`*, lead:leads(status, ai_score)`)
        .order('created_at', { ascending: false })

      if (dateRange) {
        query = query.gte('created_at', dateRange.start).lte('created_at', dateRange.end + 'T23:59:59')
      }

      const { data, error } = await query
      if (error) throw error

      return (data ?? []).map((c: Contact & { lead: Lead[] | null }) => ({
        ...c,
        lead: Array.isArray(c.lead) ? (c.lead[0] ?? null) : c.lead,
      })) as ContactWithLead[]
    },
    refetchInterval: 1000 * 30,
  })
}
