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
        query = query
          .gte('created_at', dateRange.start)
          .lte('created_at', dateRange.end + 'T23:59:59')
      }

      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as LeadWithContact[]
    },
    refetchInterval: 1000 * 30,
  })
}

export function useCreateLead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      contact_id,
      status,
      policy,
      risk_details,
      details,
    }: {
      contact_id: string
      status: string
      policy?: string | null
      risk_details?: string | null
      details?: Record<string, unknown>
    }) => {
      const { error } = await supabase.from('leads').insert({
        contact_id,
        status,
        origin: 'manual',
        policy: policy ?? null,
        risk_details: risk_details ?? null,
        details: details ?? {},
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
