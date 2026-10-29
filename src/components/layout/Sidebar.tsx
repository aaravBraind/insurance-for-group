import type { TabId } from '../../lib/types'
import { supabase } from '../../lib/supabase'
import { useGapCards } from '../../hooks/useKnowledgeGaps'
import { useCcBookings, ccNeedsAttention } from '../../hooks/useConflictCover'
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
  { id: 'knowledge', icon: 'fa-lightbulb', label: 'Knowledge Gaps' },
  { id: 'conflict-cover', icon: 'fa-shield-halved', label: 'Conflict Cover' },
  { id: 'settings', icon: 'fa-cog', label: 'Settings' },
]

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const { data: gapCards = [] } = useGapCards()
  const gapsTodo = gapCards.filter(c => c.board_status === 'todo').length
  const { data: ccBookings = [] } = useCcBookings()
  const ccAttention = ccBookings.filter(ccNeedsAttention).length

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
          {item.id === 'knowledge' && gapsTodo > 0 && <span className="nav-badge">{gapsTodo}</span>}
          {item.id === 'conflict-cover' && ccAttention > 0 && <span className="nav-badge">{ccAttention}</span>}
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
