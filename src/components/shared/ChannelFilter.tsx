import { useState, useEffect, useRef } from 'react'
import { CHANNEL_LABEL, type Channel } from '../../lib/format'

interface ChannelFilterProps {
  value: Channel | 'all'
  onChange: (v: Channel | 'all') => void
}

const OPTIONS: { value: Channel | 'all'; label: string; icon: string }[] = [
  { value: 'all',      label: 'All Channels',          icon: 'fas fa-layer-group' },
  { value: 'website',  label: CHANNEL_LABEL.website,   icon: 'fas fa-globe' },
  { value: 'whatsapp', label: CHANNEL_LABEL.whatsapp,  icon: 'fab fa-whatsapp' },
  { value: 'email',    label: CHANNEL_LABEL.email,     icon: 'fas fa-envelope' },
]

export function ChannelFilter({ value, onChange }: ChannelFilterProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  const selected = OPTIONS.find(o => o.value === value) ?? OPTIONS[0]

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '8px 14px', borderRadius: '20px',
          border: '1.5px solid #e0e6ed', background: 'white',
          fontFamily: 'inherit', fontSize: '13px', fontWeight: 600,
          color: '#374151', cursor: 'pointer', outline: 'none',
          minWidth: '160px',
        }}
      >
        <i className={selected.icon} style={{ fontSize: '12px', color: '#0A8754' }} />
        <span style={{ flex: 1, textAlign: 'left' }}>{selected.label}</span>
        <i className="fas fa-chevron-down" style={{ fontSize: '10px', color: '#7a8fa0' }} />
      </button>
      {open && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0,
            background: 'white', border: '1px solid #e0e6ed', borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            zIndex: 20, minWidth: '180px', overflow: 'hidden',
          }}
        >
          {OPTIONS.map(o => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false) }}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                width: '100%', padding: '9px 14px',
                border: 'none',
                background: value === o.value ? '#f0fdf4' : 'white',
                fontFamily: 'inherit', fontSize: '13px',
                fontWeight: value === o.value ? 700 : 500,
                cursor: 'pointer', textAlign: 'left',
                color: value === o.value ? '#0A8754' : '#1a1a1a',
              }}
            >
              <i className={o.icon} style={{ fontSize: '12px', width: '14px', color: value === o.value ? '#0A8754' : '#7a8fa0' }} />
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
