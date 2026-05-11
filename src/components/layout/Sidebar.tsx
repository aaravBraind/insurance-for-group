import type { TabId } from '../../lib/types'
import { supabase } from '../../lib/supabase'
import logo from '../../assets/logo.jpg'

interface SidebarProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
}

const navItems: { id: TabId; icon: string; label: string }[] = [
  { id: 'dashboard', icon: 'fa-th-large', label: 'Dashboard' },
  { id: 'leads', icon: 'fa-filter', label: 'Leads' },
  { id: 'conversations', icon: 'fa-comments', label: 'Conversations' },
  { id: 'contacts', icon: 'fa-address-book', label: 'Contacts' },
  { id: 'settings', icon: 'fa-cog', label: 'Settings' },
]

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <img
          src={logo}
          alt="InsuranceForGroup"
          style={{ width: '28px', height: '28px', objectFit: 'contain', borderRadius: '6px', flexShrink: 0 }}
        />
        <h2>InsuranceForGroup</h2>
      </div>
      <div className="brand-sub">Powered by Ivy</div>
      {navItems.map(item => (
        <button
          key={item.id}
          className={`nav-btn${activeTab === item.id ? ' active' : ''}`}
          onClick={() => onTabChange(item.id)}
        >
          <i className={`fas ${item.icon}`}></i> {item.label}
        </button>
      ))}
      <button
        className="nav-btn"
        onClick={() => supabase.auth.signOut()}
        style={{ marginTop: 'auto', color: '#ef4444' }}
      >
        <i className="fas fa-sign-out-alt"></i> Sign Out
      </button>
    </aside>
  )
}
