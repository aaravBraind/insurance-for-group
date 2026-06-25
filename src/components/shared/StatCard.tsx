import { useState, type ReactNode } from 'react'

interface StatCardProps {
  value: string | number
  label: string
  /** Optional content shown in a tooltip when hovering the "i" icon. */
  info?: ReactNode
}

export function StatCard({ value, label, info }: StatCardProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <div className="stat-card" style={{ position: 'relative' }}>
      {info != null && (
        <div
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{ position: 'absolute', top: '12px', right: '12px' }}
        >
          <i
            className="fas fa-info-circle"
            aria-label="More info"
            style={{ fontSize: '13px', color: '#b0bec5', cursor: 'pointer' }}
          />
          {hovered && (
            <div
              style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                background: '#1a1a1a', color: 'white', padding: '10px 12px',
                borderRadius: '10px', fontSize: '12px', lineHeight: 1.5,
                width: 'max-content', maxWidth: '220px', zIndex: 50,
                boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
              }}
            >
              {info}
            </div>
          )}
        </div>
      )}
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}
