import { useState, useRef, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

interface DemoAnswers {
  name?: string
  company?: string
  email?: string
  insuranceType?: string
  numProps?: string
  policyStatus?: string
  callbackTime?: string
}

interface ChatMessage {
  from: 'bot' | 'user'
  text: string
}

interface DemoStep {
  getPrompt: (a: DemoAnswers) => string
  input: 'text' | 'quick'
  options?: string[]
  field: keyof DemoAnswers
}

const STEPS: DemoStep[] = [
  {
    getPrompt: () => "Hi there! 👋 Welcome to Coversure. I'm Ivy — Malcolm's AI assistant. I'd love to help you explore your insurance options. What's your name?",
    input: 'text',
    field: 'name',
  },
  {
    getPrompt: a => `Nice to meet you, ${a.name}! 😊 And what company or organisation are you with?`,
    input: 'text',
    field: 'company',
  },
  {
    getPrompt: a => `Great, thanks ${a.name}. What's the best email to reach you on?`,
    input: 'text',
    field: 'email',
  },
  {
    getPrompt: () => 'Now, what type of insurance are you looking for?',
    input: 'quick',
    options: ['Landlords Insurance', 'Commercial Property', 'Buildings Insurance', 'Other'],
    field: 'insuranceType',
  },
  {
    getPrompt: a => {
      if (a.insuranceType === 'Landlords Insurance') return "Brilliant — landlords insurance is right in our wheelhouse. How many properties are we looking at?"
      if (a.insuranceType === 'Commercial Property') return "Commercial property — Malcolm has some great partner insurers for that. How many properties?"
      return "No problem — Malcolm covers a wide range. How many properties do you need covered?"
    },
    input: 'quick',
    options: ['Just 1', '2-3 properties', '4-5 properties', '6+'],
    field: 'numProps',
  },
  {
    getPrompt: a => `${a.numProps} — great. What's your current situation?`,
    input: 'quick',
    options: ['Switching insurers', 'New policy', 'Renewal coming up'],
    field: 'policyStatus',
  },
  {
    getPrompt: a => `Perfect. When would be a good time for Malcolm to give you a call about your ${a.insuranceType?.toLowerCase()}?`,
    input: 'quick',
    options: ['Tomorrow morning', 'Tomorrow afternoon', 'This week sometime', 'ASAP please!'],
    field: 'callbackTime',
  },
]

function calcScore(a: DemoAnswers): number {
  let score = 5.0
  if (a.insuranceType === 'Landlords Insurance') score += 1.5
  else if (a.insuranceType === 'Commercial Property') score += 1.0
  else score += 0.5
  if (a.numProps === '6+') score += 2.0
  else if (a.numProps === '4-5 properties') score += 1.5
  else if (a.numProps === '2-3 properties') score += 1.0
  else score += 0.5
  if (a.policyStatus === 'Renewal coming up') score += 1.0
  else if (a.policyStatus === 'Switching insurers') score += 0.5
  if (a.callbackTime === 'ASAP please!') score += 0.5
  return Math.min(10, Math.round(score * 10) / 10)
}

interface DemoModalProps {
  onClose: () => void
}

export function DemoModal({ onClose }: DemoModalProps) {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<DemoAnswers>({})
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputVal, setInputVal] = useState('')
  const [typing, setTyping] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [score, setScore] = useState(0)
  const chatRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    showStep(0, {})
  }, [])

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, typing])

  function showStep(stepIdx: number, currentAnswers: DemoAnswers) {
    if (stepIdx >= STEPS.length) {
      const finalScore = calcScore(currentAnswers)
      setScore(finalScore)
      setTyping(false)
      setShowResult(true)
      return
    }
    setTyping(true)
    setTimeout(() => {
      const text = STEPS[stepIdx].getPrompt(currentAnswers)
      setTyping(false)
      setMessages(prev => [...prev, { from: 'bot', text }])
    }, 800)
  }

  function handleAnswer(value: string) {
    const currentStep = STEPS[step]
    const newAnswers = { ...answers, [currentStep.field]: value }
    setAnswers(newAnswers)
    setMessages(prev => [...prev, { from: 'user', text: value }])
    setInputVal('')
    const nextStep = step + 1
    setStep(nextStep)
    setTimeout(() => showStep(nextStep, newAnswers), 600)
  }

  function handleTextSubmit() {
    if (inputVal.trim()) handleAnswer(inputVal.trim())
  }

  async function viewInPipeline() {
    // Insert a new lead + contact into Supabase
    try {
      const phone = `demo_${Date.now()}`
      const { data: contact } = await supabase
        .from('contacts')
        .insert({ phone, first_name: answers.name?.split(' ')[0] ?? 'Demo', last_name: answers.name?.split(' ').slice(1).join(' ') || null, email: answers.email ?? null, origin: 'demo' })
        .select()
        .single()

      if (contact) {
        await supabase.from('leads').insert({
          contact_id: contact.id,
          ai_score: Math.round(score * 10),
          status: 'new_lead',
          origin: 'demo',
          details: {
            insurance_type: answers.insuranceType,
            num_properties: answers.numProps,
            cover_needed: answers.policyStatus,
            callback_time: answers.callbackTime,
          },
        })
      }
    } catch (e) {
      console.error('Demo insert failed:', e)
    }
    onClose()
  }

  function resetDemo() {
    setStep(0)
    setAnswers({})
    setMessages([])
    setInputVal('')
    setTyping(false)
    setShowResult(false)
    showStep(0, {})
  }

  return (
    <div className="demo-modal active">
      <div className="demo-frame">
        <div className="demo-header">
          <div className="demo-avatar">🌿</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '15px' }}>Ivy Qualification Bot</div>
            <div style={{ fontSize: '11px', opacity: 0.8 }}>Online</div>
          </div>
          <button className="demo-close" onClick={onClose}><i className="fas fa-times"></i></button>
        </div>

        {!showResult ? (
          <>
            <div className="demo-chat" ref={chatRef}>
              {messages.map((m, i) => (
                <div key={i} className={`demo-msg ${m.from === 'bot' ? 'bot' : 'user'}`}>
                  {m.text}
                </div>
              ))}
              {typing && (
                <div className="typing-ind">
                  <div className="t-dot"></div>
                  <div className="t-dot"></div>
                  <div className="t-dot"></div>
                </div>
              )}
            </div>

            {!typing && step < STEPS.length && STEPS[step].input === 'quick' && (
              <div className="demo-quick-replies">
                {STEPS[step].options?.map(opt => (
                  <button key={opt} className="demo-qr" onClick={() => handleAnswer(opt)}>{opt}</button>
                ))}
              </div>
            )}

            {!typing && step < STEPS.length && STEPS[step].input === 'text' && (
              <div className="demo-input-area">
                <input
                  type="text"
                  value={inputVal}
                  placeholder="Type a message..."
                  onChange={e => setInputVal(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleTextSubmit()}
                  autoFocus
                />
                <button onClick={handleTextSubmit}><i className="fas fa-paper-plane"></i></button>
              </div>
            )}
          </>
        ) : (
          <div className="demo-result active">
            <h3>Lead Qualified!</h3>
            <div className="score">{score.toFixed(1)}</div>
            <p>AI Score based on qualification answers</p>
            <div className="demo-result-btns">
              <button style={{ background: '#0A8754', color: 'white' }} onClick={viewInPipeline}>
                View in Leads Pipeline
              </button>
              <button style={{ background: '#f5f7fa', color: '#1a1a1a' }} onClick={resetDemo}>
                Run Another Demo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
