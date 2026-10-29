import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { CcBooking, CcEvent, CcNextOfKin } from '../lib/types'

// Conflict Cover is written by n8n (post-approve + scheduler). The tab polls
// so a booking approved in the portal stub shows up within seconds.
const POLL_MS = 5000

export function useCcBookings() {
  return useQuery<CcBooking[]>({
    queryKey: ['cc_bookings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cc_bookings')
        .select('id, booking_ref, certificate_no, client_name, client_billing, booker_name, booker_email, person_name, person_email, over_65, residence_country, destination, zone, cover_start, cover_end, policy_days, sum_insured_usd, premium_usd, addon_sickness, addon_income, status, approved_at, issued_at, confirmation_sent_at, nok_requested_at, nok_chasers, nok_completed_at, nok_missing_flagged_at, sales_reported_at, end_reminder_at, doc_token')
        .order('approved_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as CcBooking[]
    },
    refetchInterval: POLL_MS,
  })
}

export function useCcEvents(bookingId: number | null) {
  return useQuery<CcEvent[]>({
    queryKey: ['cc_events', bookingId],
    enabled: bookingId != null,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cc_events')
        .select('id, booking_id, event_type, channel, recipient, subject, created_at')
        .eq('booking_id', bookingId!)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as CcEvent[]
    },
    refetchInterval: POLL_MS,
  })
}

export function useCcNextOfKin(bookingId: number | null) {
  return useQuery<CcNextOfKin | null>({
    queryKey: ['cc_next_of_kin', bookingId],
    enabled: bookingId != null,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cc_next_of_kin')
        .select('id, booking_id, full_name, relationship, phone, email, submitted_at')
        .eq('booking_id', bookingId!)
        .order('submitted_at', { ascending: false })
        .limit(1)
      if (error) throw error
      return ((data ?? [])[0] as CcNextOfKin) ?? null
    },
    refetchInterval: POLL_MS,
  })
}

// Something IFG should look at: cover running with no next of kin, or ending within 24h.
export function ccNeedsAttention(b: CcBooking): boolean {
  if (b.status === 'cancelled' || b.status === 'ended') return false
  if (b.nok_missing_flagged_at && !b.nok_completed_at) return true
  return b.status === 'ending'
}

// The PDF comes straight from the edge function. The HTML pages (cover card, next-of-kin form) are
// served through the n8n "Traveller Pages" webhook, because Supabase's default domain returns function
// HTML as plain text.
export const DOCS_BASE = `${import.meta.env.VITE_SUPABASE_URL as string}/functions/v1/cc-docs`
export const PAGE_BASE = 'https://braind.app.n8n.cloud/webhook/cc-page'
export const docLink = (b: CcBooking, view: 'cert' | 'pass' | 'nok') =>
  `${view === 'cert' ? DOCS_BASE : PAGE_BASE}?t=${b.doc_token}&view=${view}`
