import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { FollowupSchedule } from '../lib/types'

export function useFollowupsForLead(leadId: string | null) {
  return useQuery<FollowupSchedule[]>({
    queryKey: ['followup_schedule', leadId],
    queryFn: async () => {
      if (!leadId) return []
      const { data, error } = await supabase
        .from('followup_schedule')
        .select('*')
        .eq('lead_id', leadId)
        .order('next_due_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as FollowupSchedule[]
    },
    enabled: !!leadId,
  })
}

export function useUpcomingFollowups() {
  return useQuery<FollowupSchedule[]>({
    queryKey: ['followup_schedule', 'upcoming'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('followup_schedule')
        .select('*')
        .is('completed_at', null)
        .is('cancelled_at', null)
        .order('next_due_at', { ascending: true })
        .limit(50)
      if (error) throw error
      return (data ?? []) as FollowupSchedule[]
    },
    refetchInterval: 1000 * 60,
  })
}
