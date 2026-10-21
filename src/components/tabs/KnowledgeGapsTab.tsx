import { useState } from 'react'
import { useGapCards, useGapCardAsks, useResolveGapCard } from '../../hooks/useKnowledgeGaps'
import { LoadingSpinner } from '../shared/LoadingSpinner'
import { ConversationChat } from '../shared/ConversationChat'
import { CHANNEL_LABEL, formatDateTime } from '../../lib/format'
import type { GapCard, GapBoardStatus } from '../../lib/types'

// Martin's board. The weekly triage workflow (ivy_weekly_gap_triage) only puts
// real gaps here, already merged, so every card needs one decision:
// add the answer, confirm Ivy was right, or mark it not a problem.

type ColumnId = 'needs_answer' | 'check_claim' | 'done' | 'not_a_problem'

const COLUMNS: { id: ColumnId; title: string; icon: string; hint: string }[] = [
  { id: 'needs_answer', title: 'Needs your answer', icon: 'fa-circle-question', hint: "Ivy didn't know. Your answer teaches it." },
  { id: 'check_claim', title: "Check Ivy's answer", icon: 'fa-magnifying-glass', hint: 'Ivy answered without a source. Is it right?' },
  { id: 'done', title: 'Done', icon: 'fa-circle-check', hint: 'Answered or confirmed' },
  { id: 'not_a_problem', title: 'Not a problem', icon: 'fa-ban', hint: 'Dismissed' },
]

// Resolved columns only show the most recent few until expanded.
const RESOLVED_PREVIEW = 8

function columnOf(c: GapCard): ColumnId {
  if (c.board_status === 'todo') return c.card_type
  if (c.board_status === 'not_a_problem') return 'not_a_problem'
  return 'done'
}

function shortDate(v: string | null) {
  if (!v) return ''
  return new Date(v).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

interface CardProps {
  card: GapCard
  editing: boolean
  unsavedAnswer?: string
  onEdit: (id: number | null) => void
  onResolve: (id: number, status: GapBoardStatus, answer?: string) => void
  onOpenDetails: (card: GapCard) => void
  dragging: boolean
  onDragStart: (id: number) => void
  onDragEnd: () => void
}

function GapCardView({ card, editing, unsavedAnswer, onEdit, onResolve, onOpenDetails, dragging, onDragStart, onDragEnd }: CardProps) {
  const [draft, setDraft] = useState(unsavedAnswer ?? card.martin_answer ?? '')
  const isTodo = card.board_status === 'todo'
  const isClaim = card.card_type === 'check_claim'

  function save() {
    if (!draft.trim()) return
    onResolve(card.id, 'answered', draft)
    onEdit(null)
  }

  return (
    <div
      className={`gap-card${isTodo ? '' : ' resolved'}`}
      draggable={!editing}
      onDragStart={e => {
        e.dataTransfer.setData('gapCardId', String(card.id))
        e.dataTransfer.effectAllowed = 'move'
        onDragStart(card.id)
      }}
      onDragEnd={onDragEnd}
      style={{ opacity: dragging ? 0.4 : 1 }}
    >
      <div className="gap-card-meta">
        {card.topic && <span className="gap-topic">{card.topic}</span>}
        {card.times_asked > 1 && (
          <span className="gap-asked" title="How many leads asked this">
            <i className="fas fa-user-group"></i> Asked {card.times_asked}×
          </span>
        )}
        <button type="button" className="gap-link" onClick={() => onOpenDetails(card)} title="See what leads asked">
          {shortDate(card.last_asked_at)} <i className="fas fa-chevron-right"></i>
        </button>
      </div>

      <div className="gap-question">{card.question}</div>

      {card.ivy_said && (
        <div className="gap-ivy">
          <span>Ivy said:</span> {card.ivy_said}
        </div>
      )}

      {card.board_status === 'answered' && !editing && (
        <div className="gap-answer"><i className="fas fa-pen"></i> {card.martin_answer}</div>
      )}
      {card.board_status === 'ivy_correct' && (
        <div className="gap-answer"><i className="fas fa-check"></i> Ivy's answer confirmed</div>
      )}

      {editing ? (
        <div style={{ marginTop: '10px' }}>
          <textarea
            className="gap-textarea"
            autoFocus
            rows={4}
            value={draft}
            placeholder={isClaim ? 'What is actually correct?' : 'The answer Ivy should give'}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save()
              if (e.key === 'Escape') onEdit(null)
            }}
          />
          <div className="gap-actions">
            <button type="button" className="gap-btn primary" disabled={!draft.trim()} onClick={save}>
              Save answer
            </button>
            <button type="button" className="gap-btn" onClick={() => { setDraft(card.martin_answer ?? ''); onEdit(null) }}>
              Cancel
            </button>
          </div>
        </div>
      ) : isTodo ? (
        <div className="gap-actions">
          {isClaim && (
            <button type="button" className="gap-btn primary" onClick={() => onResolve(card.id, 'ivy_correct')}>
              <i className="fas fa-check"></i> Ivy was right
            </button>
          )}
          <button type="button" className={`gap-btn${isClaim ? '' : ' primary'}`} onClick={() => onEdit(card.id)}>
            <i className="fas fa-pen"></i> {isClaim ? 'Correct it' : 'Add answer'}
          </button>
          <button type="button" className="gap-btn quiet" onClick={() => onResolve(card.id, 'not_a_problem')}>
            Not a problem
          </button>
        </div>
      ) : (
        <div className="gap-actions">
          {card.board_status === 'answered' && (
            <button type="button" className="gap-btn quiet" onClick={() => onEdit(card.id)}>Edit</button>
          )}
          <button type="button" className="gap-btn quiet" onClick={() => onResolve(card.id, 'todo')}>Reopen</button>
        </div>
      )}
    </div>
  )
}

function GapDetailsModal({ card, onClose }: { card: GapCard; onClose: () => void }) {
  const { data: asks = [], isLoading } = useGapCardAsks(card.id)
  const [openSession, setOpenSession] = useState<string | null>(null)

  return (
    <div className="lead-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="lead-modal" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #e0e6ed', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#7a8fa0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {openSession ? 'Conversation' : `What leads asked (${card.times_asked})`}
            </div>
            <div style={{ fontWeight: 700, fontSize: '15px', color: '#1a1a1a', marginTop: '4px', lineHeight: 1.4 }}>
              {card.question}
            </div>
            {card.why && <div style={{ fontSize: '12px', color: '#7a8fa0', marginTop: '4px' }}>{card.why}</div>}
          </div>
          <button className="dp-close" onClick={onClose}><i className="fas fa-times"></i></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {openSession ? (
            <>
              <button className="conv-back" onClick={() => setOpenSession(null)}>
                <i className="fas fa-arrow-left"></i> Back to questions
              </button>
              <ConversationChat sessionId={openSession} contactName="Lead" />
            </>
          ) : isLoading ? (
            <LoadingSpinner />
          ) : (
            asks.map(a => (
              <div key={a.id} className="gap-ask">
                <div className="gap-ask-meta">
                  {formatDateTime(a.created_at)}
                  {a.channel && <> · {CHANNEL_LABEL[a.channel]}</>}
                  <button type="button" className="gap-link" style={{ marginLeft: 'auto' }} onClick={() => setOpenSession(a.session_id)}>
                    View conversation <i className="fas fa-chevron-right"></i>
                  </button>
                </div>
                <div className="gap-ask-q">{a.question.replace(/\s*translate it.*$/i, '')}</div>
                {a.answer_given && (
                  <div className="gap-ask-a"><span>Ivy:</span> {a.answer_given}</div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export function KnowledgeGapsTab() {
  const { data: cards = [], isLoading } = useGapCards()
  const resolve = useResolveGapCard()
  const [editingId, setEditingId] = useState<number | null>(null)
  const [detailsCard, setDetailsCard] = useState<GapCard | null>(null)
  const [draggingId, setDraggingId] = useState<number | null>(null)
  const [dragOverCol, setDragOverCol] = useState<ColumnId | null>(null)
  const [expanded, setExpanded] = useState<Partial<Record<ColumnId, boolean>>>({})
  const [weekAgo] = useState(() => Date.now() - 7 * 24 * 3600 * 1000)
  // Answers whose save failed, so the box reopens with Martin's text intact.
  const [unsaved, setUnsaved] = useState<Record<number, string>>({})

  if (isLoading) return <LoadingSpinner />

  const byColumn = (col: ColumnId) => {
    const list = cards.filter(c => columnOf(c) === col)
    if (col === 'done' || col === 'not_a_problem') {
      list.sort((a, b) => (b.resolved_at ?? '').localeCompare(a.resolved_at ?? ''))
    }
    return list
  }

  const todo = cards.filter(c => c.board_status === 'todo').length
  const clearedThisWeek = cards.filter(c => c.resolved_at && new Date(c.resolved_at).getTime() >= weekAgo).length

  function handleResolve(id: number, status: GapBoardStatus, answer?: string) {
    resolve.mutate({ id, status, answer }, {
      onSuccess: () => setUnsaved(u => {
        const rest = { ...u }
        delete rest[id]
        return rest
      }),
      onError: () => {
        if (status !== 'answered' || !answer) return
        setUnsaved(u => ({ ...u, [id]: answer }))
        setEditingId(id)
      },
    })
  }

  // Dragging mirrors the buttons. Dropping a "needs answer" card on Done opens
  // the answer box, since it can't be done without an answer.
  function handleDrop(id: number, col: ColumnId) {
    const card = cards.find(c => c.id === id)
    if (!card || columnOf(card) === col) return
    if (col === 'not_a_problem') handleResolve(id, 'not_a_problem')
    else if (col === 'done') {
      if (card.card_type === 'check_claim') handleResolve(id, 'ivy_correct')
      else setEditingId(id)
    } else if (col === card.card_type) handleResolve(id, 'todo')
  }

  return (
    <>
      <div className="gap-intro">
        <div>
          <div className="gap-intro-title">
            {todo === 0 ? 'All clear, nothing needs you right now.' : `${todo} item${todo === 1 ? '' : 's'} need${todo === 1 ? 's' : ''} you`}
          </div>
          <div className="gap-intro-sub">
            Real questions from leads that Ivy couldn't answer, or answered without a source. Repeats are merged and noise is filtered out.
            Your answers are added to Ivy so it can answer them next time.
          </div>
        </div>
        {clearedThisWeek > 0 && (
          <div className="gap-intro-stat"><i className="fas fa-circle-check"></i> {clearedThisWeek} cleared this week</div>
        )}
      </div>

      {resolve.isError && (
        <div className="login-error" style={{ marginBottom: '12px' }}>
          <i className="fas fa-exclamation-circle"></i> That change didn't save. Please try again.
        </div>
      )}

      <div className="kanban gap-board">
        {COLUMNS.map(col => {
          const list = byColumn(col.id)
          const resolvedCol = col.id === 'done' || col.id === 'not_a_problem'
          const visible = resolvedCol && !expanded[col.id] ? list.slice(0, RESOLVED_PREVIEW) : list
          const isOver = dragOverCol === col.id
          return (
            <div
              key={col.id}
              className="kanban-col gap-col"
              onDragOver={e => { e.preventDefault(); setDragOverCol(col.id) }}
              onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverCol(null) }}
              onDrop={e => {
                e.preventDefault()
                const id = Number(e.dataTransfer.getData('gapCardId'))
                if (id) handleDrop(id, col.id)
                setDragOverCol(null)
              }}
              style={{ borderColor: isOver ? '#0A8754' : '#e0e6ed', background: isOver ? '#f0fdf4' : 'white' }}
            >
              <div className="kanban-header">
                <span className="kanban-title"><i className={`fas ${col.icon}`} style={{ color: '#0A8754', marginRight: '6px' }}></i>{col.title}</span>
                <span className="kanban-count">{list.length}</span>
              </div>
              <div className="gap-col-hint">{col.hint}</div>
              {visible.map(card => (
                <GapCardView
                  key={`${card.id}-${card.board_status}`}
                  card={card}
                  editing={editingId === card.id}
                  unsavedAnswer={unsaved[card.id]}
                  onEdit={setEditingId}
                  onResolve={handleResolve}
                  onOpenDetails={setDetailsCard}
                  dragging={draggingId === card.id}
                  onDragStart={setDraggingId}
                  onDragEnd={() => setDraggingId(null)}
                />
              ))}
              {list.length > visible.length && (
                <button type="button" className="gap-btn quiet" style={{ width: '100%' }} onClick={() => setExpanded(x => ({ ...x, [col.id]: true }))}>
                  Show {list.length - visible.length} more
                </button>
              )}
              {list.length === 0 && (
                <div style={{ fontSize: '12px', color: isOver ? '#0A8754' : '#b0bec5', textAlign: 'center', padding: '16px 0' }}>
                  {isOver ? 'Drop here' : resolvedCol ? 'Nothing yet' : 'All clear'}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {detailsCard && <GapDetailsModal card={detailsCard} onClose={() => setDetailsCard(null)} />}
    </>
  )
}
