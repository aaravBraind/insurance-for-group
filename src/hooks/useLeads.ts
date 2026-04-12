import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { LeadWithContact, DateRange } from '../lib/types'

export function useLeads(dateRange: DateRange | null) {
  return useQuery<LeadWithContact[]>({
    queryKey: ['leads', dateRange],
    queryFn: async () => {
      let query = supabase
        .from('leads')
        .select(`*, contact:contacts(*)`)
        .order('created_at', { ascending: false })

      if (dateRange) {
        query = query.gte('created_at', dateRange.start).lte('created_at', dateRange.end + 'T23:59:59')
      }

      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as LeadWithContact[]
    },
    refetchInterval: 1000 * 30,
  })
}

export function useLeadSummary(leadId: string | null) {
  return useQuery<string | null>({
    queryKey: ['lead-summary', leadId],
    queryFn: async () => {
      if (!leadId) return null
      const { data } = await supabase
        .from('lead_generation_log')
        .select('summary')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      return data?.summary ?? null
    },
    enabled: !!leadId,
  })
}

export function useCreateLead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ contact_id, status, details }: {
      contact_id: string
      status: string
      details: Record<string, unknown>
    }) => {
      const { error } = await supabase.from('leads').insert({
        contact_id,
        status,
        origin: 'manual',
        details,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
    },
  })
}

export function useUpdateLeadStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ leadId, status }: { leadId: string; status: string }) => {
      const { error } = await supabase.from('leads').update({ status }).eq('id', leadId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
    },
  })
}
