import { useQuery } from '@tanstack/react-query'

/**
 * Translates a batch of conversation message texts to English via the n8n
 * "Translate Conversations to English" webhook (which proxies Claude). Results
 * are keyed by message `id` so the chat can render translated text alongside
 * originals.
 *
 * The webhook URL comes from VITE_TRANSLATE_WEBHOOK_URL — point it at the
 * workflow's *production* URL (…/webhook/translate-conversations, not
 * …/webhook-test/…).
 *
 * Enabled lazily: nothing is requested until `enabled` flips true (i.e. the
 * user turns on the "Translate to English" toggle). react-query caches per
 * session, so toggling off/on again is instant.
 */
const WEBHOOK_URL = import.meta.env.VITE_TRANSLATE_WEBHOOK_URL as string | undefined

export function useTranslateMessages(
  sessionId: string | null,
  items: { id: number; text: string }[],
  enabled: boolean,
) {
  return useQuery<Record<number, string>>({
    queryKey: ['translate', sessionId, items.map(i => i.id).join(',')],
    enabled: enabled && !!sessionId && items.length > 0,
    staleTime: Infinity, // a message's text never changes
    queryFn: async () => {
      if (!WEBHOOK_URL) {
        throw new Error('VITE_TRANSLATE_WEBHOOK_URL is not configured')
      }

      const res = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts: items.map(i => i.text) }),
      })
      if (!res.ok) {
        throw new Error(`Translation request failed (${res.status})`)
      }
      const data = (await res.json()) as { translations?: string[] }
      const translations = data?.translations

      const map: Record<number, string> = {}
      if (Array.isArray(translations) && translations.length === items.length) {
        items.forEach((item, idx) => {
          map[item.id] = translations[idx]
        })
      } else {
        // Shape mismatch → fall back to originals so the UI still renders.
        items.forEach(item => {
          map[item.id] = item.text
        })
      }
      return map
    },
  })
}
