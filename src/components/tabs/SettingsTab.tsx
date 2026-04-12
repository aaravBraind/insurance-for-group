export function SettingsTab() {
  return (
    <>
      <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Account Settings</h3>
      <div className="settings-card">
        <div className="settings-row">
          <span className="settings-label">Name</span>
          <span className="settings-val">Malcolm Skinner</span>
        </div>
        <div className="settings-row">
          <span className="settings-label">Email</span>
          <span className="settings-val">malcolm@coversure.co.uk</span>
        </div>
        <div className="settings-row">
          <span className="settings-label">Organisation</span>
          <span className="settings-val">Coversure (Kent)</span>
        </div>
        <div className="settings-row">
          <span className="settings-label">Plan</span>
          <span className="settings-val">Ivy Front-End Intelligence</span>
        </div>
        <div className="settings-row">
          <span className="settings-label">WhatsApp Status</span>
          <span className="settings-val" style={{ color: '#0A8754' }}>
            <i className="fas fa-check-circle"></i> Verified
          </span>
        </div>
      </div>
    </>
  )
}
