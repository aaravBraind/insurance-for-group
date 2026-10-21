import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { GapCard, GapCardAsk, GapBoardStatus } from '../lib/types'

const CARDS_KEY = ['ivy_kb_gap_cards']

export function useGapCards() {
  return useQuery<GapCard[]>({
    queryKey: CARDS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ivy_kb_gap_cards')
        .select('id, card_type, question, topic, ivy_said, why, board_status, martin_answer, resolved_by, resolved_at, times_asked, first_asked_at, last_asked_at, created_at')
        .order('times_asked', { ascending: false })
        .order('last_asked_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as GapCard[]
    },
    refetchInterval: 1000 * 60,
  })
}

// The lead questions merged onto one card, newest first.
export function useGapCardAsks(cardId: number | null) {
  return useQuery<GapCardAsk[]>({
    queryKey: ['ivy_kb_retrievals', 'card', cardId],
    enabled: cardId != null,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ivy_kb_retrievals')
        .select('id, session_id, channel, question, answer_given, created_at')
        .eq('card_id', cardId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as GapCardAsk[]
    },
  })
}

// Records Martin's decision. Optimistic, so cards move columns instantly.
export function useResolveGapCard() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status, answer }: { id: number; status: GapBoardStatus; answer?: string | null }) => {
      const { data: { session } } = await supabase.auth.getSession()
      const reopening = status === 'todo'
      const { error } = await supabase
        .from('ivy_kb_gap_cards')
        .update({
          board_status: status,
          martin_answer: status === 'answered' ? (answer ?? '').trim() : null,
          resolved_by: reopening ? null : session?.user.email ?? null,
          resolved_at: reopening ? null : new Date().toISOString(),
        })
        .eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, status, answer }) => {
      await queryClient.cancelQueries({ queryKey: CARDS_KEY })
      const previous = queryClient.getQueryData<GapCard[]>(CARDS_KEY)
      queryClient.setQueryData<GapCard[]>(CARDS_KEY, cards =>
        (cards ?? []).map(c => c.id === id
          ? {
              ...c,
              board_status: status,
              martin_answer: status === 'answered' ? (answer ?? '').trim() : null,
              resolved_at: status === 'todo' ? null : new Date().toISOString(),
            }
          : c),
      )
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(CARDS_KEY, ctx.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: CARDS_KEY })
    },
  })
}
