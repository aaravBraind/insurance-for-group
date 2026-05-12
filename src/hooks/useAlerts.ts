import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { DashboardAlert } from '../lib/types'

export function useAlerts(opts: { unreadOnly?: boolean } = {}) {
  return useQuery<DashboardAlert[]>({
    queryKey: ['dashboard_alerts', opts.unreadOnly ?? false],
    queryFn: async () => {
      let q = supabase
        .from('dashboard_alerts')
        .select('*')
        .order('created_at', { ascending: false })
      if (opts.unreadOnly) q = q.eq('is_read', false)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as DashboardAlert[]
    },
    refetchInterval: 1000 * 30,
  })
}

export function useMarkAlertRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('dashboard_alerts')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard_alerts'] })
    },
  })
}

export function useMarkAllAlertsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('dashboard_alerts')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('is_read', false)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard_alerts'] })
    },
  })
}
