export function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '60px' }}>
      <div className="typing-ind">
        <div className="t-dot"></div>
        <div className="t-dot"></div>
        <div className="t-dot"></div>
      </div>
    </div>
  )
}
