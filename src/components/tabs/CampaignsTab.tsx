import { useState } from 'react'

type CampTab = 'overview' | 'enrichment' | 'triggers' | 'nurture'

const CAMP_TABS: { id: CampTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'enrichment', label: 'Contacts & Enrichment' },
  { id: 'triggers', label: 'Trigger Feed' },
  { id: 'nurture', label: 'Nurture Pipeline' },
]

export function CampaignsTab() {
  const [activeTab, setActiveTab] = useState<CampTab>('overview')

  return (
    <>
      <div className="camp-tabs">
        {CAMP_TABS.map(t => (
          <button
            key={t.id}
            className={`camp-tab${activeTab === t.id ? ' active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div style={{ textAlign: 'center', padding: '60px 40px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '28px' }}>🚀</div>
          <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1a1a1a', marginBottom: '8px' }}>Campaigns — Coming Soon</h3>
          <p style={{ fontSize: '14px', color: '#7a8fa0', maxWidth: '420px', margin: '0 auto 20px' }}>
            Once the WhatsApp engagement system is live and performing, this is where you'll manage database re-engagement campaigns, email outreach, and more.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <div style={{ padding: '8px 16px', borderRadius: '8px', background: '#FFF7ED', color: '#F59E0B', fontSize: '13px', fontWeight: 500 }}>Database Re-engagement</div>
            <div style={{ padding: '8px 16px', borderRadius: '8px', background: '#EBF4FF', color: '#3B82F6', fontSize: '13px', fontWeight: 500 }}>Email Campaigns</div>
            <div style={{ padding: '8px 16px', borderRadius: '8px', background: '#F3E8FF', color: '#8B5CF6', fontSize: '13px', fontWeight: 500 }}>Seasonal Outreach</div>
          </div>
        </div>
      )}

      {activeTab === 'enrichment' && (
        <div style={{ textAlign: 'center', padding: '60px 40px', color: '#7a8fa0', fontSize: '14px' }}>
          <i className="fas fa-database" style={{ fontSize: '32px', marginBottom: '12px', display: 'block', opacity: 0.4 }}></i>
          Contact enrichment data will appear here as your pipeline grows.
        </div>
      )}

      {activeTab === 'triggers' && (
        <div style={{ textAlign: 'center', padding: '60px 40px', color: '#7a8fa0', fontSize: '14px' }}>
          <i className="fas fa-bolt" style={{ fontSize: '32px', marginBottom: '12px', display: 'block', opacity: 0.4 }}></i>
          Trigger events from Companies House, LinkedIn, and renewals will appear here.
        </div>
      )}

      {activeTab === 'nurture' && (
        <div style={{ textAlign: 'center', padding: '60px 40px', color: '#7a8fa0', fontSize: '14px' }}>
          <i className="fas fa-seedling" style={{ fontSize: '32px', marginBottom: '12px', display: 'block', opacity: 0.4 }}></i>
          Contacts in nurture sequences will appear here.
        </div>
      )}
    </>
  )
}
