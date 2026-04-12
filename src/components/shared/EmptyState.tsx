interface EmptyStateProps {
  icon?: string
  message?: string
}

export function EmptyState({ icon = 'fa-inbox', message = 'No data yet' }: EmptyStateProps) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 40px', color: '#7a8fa0' }}>
      <i className={`fas ${icon}`} style={{ fontSize: '32px', marginBottom: '12px', display: 'block', opacity: 0.4 }}></i>
      <p style={{ fontSize: '14px' }}>{message}</p>
    </div>
  )
}
