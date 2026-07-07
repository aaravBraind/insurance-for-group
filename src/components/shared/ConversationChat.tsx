import { useMemo, useState } from 'react'
import { useConversationMessages } from '../../hooks/useConversations'
import { useTranslateMessages } from '../../hooks/useTranslate'
import { LoadingSpinner } from './LoadingSpinner'
import type { Conversation, ConversationMessage } from '../../lib/types'

function getToolName(msg: ConversationMessage): string | null {
  if (msg.tool_calls && Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) {
    const tc = msg.tool_calls[0] as { name?: string }
    return (tc.name ?? 'Tool Call').replace(/_/g, ' ')
  }
  const akCalls = msg.additional_kwargs?.tool_calls
  if (akCalls && Array.isArray(akCalls) && akCalls.length > 0) {
    const tc = (akCalls as { function?: { name?: string } }[])[0]
    return (tc?.function?.name ?? 'Tool Call').replace(/_/g, ' ')
  }
  const match = (msg.content ?? '').match(/^Calling\s+(\w+)\s+with\s+input:/i)
  if (match) return match[1].replace(/_/g, ' ')
  return null
}

function isToolResult(msg: ConversationMessage): boolean {
  if ((msg.type as string) === 'tool') return true
  const c = (msg.content ?? '').trim()
  return c.startsWith('[{') && c.includes('"response"')
}

/** True for messages that render as an actual chat bubble (not a tool chip). */
function isBubble(m: Conversation): boolean {
  return !isToolResult(m.message) && !getToolName(m.message)
}

export function ConversationChat({ sessionId, contactName }: {
  sessionId: string
  contactName: string
}) {
  const { data: messages = [], isLoading } = useConversationMessages(sessionId)
  const [translate, setTranslate] = useState(false)
  // Message ids the viewer has expanded back to their original language.
  const [showOriginal, setShowOriginal] = useState<Set<number>>(new Set())

  // Only bubble messages get translated (tool chips are skipped anyway).
  const translatable = useMemo(
    () =>
      messages
        .filter(m => isBubble(m) && (m.message.content ?? '').trim().length > 0)
        .map(m => ({ id: m.id, text: m.message.content })),
    [messages],
  )

  const {
    data: translations = {},
    isLoading: translating,
    isError: translateError,
  } = useTranslateMessages(sessionId, translatable, translate)

  const toggleOriginal = (id: number) =>
    setShowOriginal(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  if (isLoading) return <LoadingSpinner />

  return (
    <div>
      {/* Translate control */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        gap: '10px', marginBottom: '10px',
      }}>
        {translate && translateError && (
          <span style={{ fontSize: '12px', color: '#b91c1c' }}>
            Translation failed
          </span>
        )}
        {translate && translating && (
          <span style={{ fontSize: '12px', color: '#7a8fa0' }}>
            Translating…
          </span>
        )}
        <button
          onClick={() => setTranslate(v => !v)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '7px',
            padding: '6px 13px', borderRadius: '20px',
            border: translate ? '1.5px solid #0A8754' : '1.5px solid #e0e6ed',
            background: translate ? '#0A8754' : 'white',
            color: translate ? 'white' : '#374151',
            fontFamily: 'inherit', fontSize: '13px', fontWeight: 600,
            cursor: 'pointer', outline: 'none',
          }}
        >
          <i className="fas fa-language" style={{ fontSize: '14px' }} />
          {translate ? 'Showing English' : 'Translate to English'}
        </button>
      </div>

      <div className="conv-chat">
        {messages.map(m => {
          const toolName = getToolName(m.message)
          if (isToolResult(m.message)) return null
          if (toolName) {
            return (
              <div key={m.id} style={{ display: 'flex', justifyContent: 'center', margin: '4px 0' }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '5px 12px', borderRadius: '16px',
                  background: '#f5f5f5', border: '1px solid #e0e0e0',
                  fontSize: '12px', color: '#6b7280',
                }}>
                  <i className="fas fa-key" style={{ fontSize: '10px' }}></i>
                  {toolName}
                </span>
              </div>
            )
          }

          const original = m.message.content
          const translatedText = translations[m.id]
          // Show the translation when the toggle is on, we have one, it
          // actually differs from the original, and the viewer hasn't asked
          // to see the original for this specific bubble.
          const isViewingOriginal = showOriginal.has(m.id)
          const showTranslated =
            translate &&
            !!translatedText &&
            translatedText !== original &&
            !isViewingOriginal
          const body = showTranslated ? translatedText : original
          const hasTranslation =
            translate && !!translatedText && translatedText !== original

          return (
            <div key={m.id} className={`conv-msg ${m.message.type === 'ai' ? 'ai' : 'contact'}`}>
              {body}
              {hasTranslation && (
                <button
                  onClick={() => toggleOriginal(m.id)}
                  style={{
                    display: 'block', marginTop: '5px',
                    background: 'none', border: 'none', padding: 0,
                    fontFamily: 'inherit', fontSize: '11px', fontWeight: 600,
                    color: m.message.type === 'ai' ? '#0A8754' : '#5b7284',
                    cursor: 'pointer', opacity: 0.85,
                  }}
                >
                  {isViewingOriginal ? 'Show translation' : 'Show original'}
                </button>
              )}
              <div className="conv-msg-time">
                {m.message.type === 'ai' ? 'Ivy' : contactName} · {new Date(m.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          )
        })}
        {messages.length === 0 && <p style={{ color: '#7a8fa0', fontSize: '13px' }}>No messages</p>}
      </div>
    </div>
  )
}
