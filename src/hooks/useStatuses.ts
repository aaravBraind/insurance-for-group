import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Status } from '../lib/types'

export function useStatuses() {
  return useQuery<Status[]>({
    queryKey: ['statuses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('statuses')
        .select('*')
        .order('id')
      if (error) throw error
      return data ?? []
    },
    staleTime: 1000 * 60 * 10, // statuses rarely change
  })
}
