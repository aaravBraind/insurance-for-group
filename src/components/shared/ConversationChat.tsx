import { useConversationMessages } from '../../hooks/useConversations'
import { LoadingSpinner } from './LoadingSpinner'
import type { ConversationMessage } from '../../lib/types'

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

export function ConversationChat({ sessionId, contactName }: {
  sessionId: string
  contactName: string
}) {
  const { data: messages = [], isLoading } = useConversationMessages(sessionId)

  if (isLoading) return <LoadingSpinner />

  return (
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
        return (
          <div key={m.id} className={`conv-msg ${m.message.type === 'ai' ? 'ai' : 'contact'}`}>
            {m.message.content}
            <div className="conv-msg-time">
              {m.message.type === 'ai' ? 'Ivy' : contactName} · {new Date(m.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        )
      })}
      {messages.length === 0 && <p style={{ color: '#7a8fa0', fontSize: '13px' }}>No messages</p>}
    </div>
  )
}
