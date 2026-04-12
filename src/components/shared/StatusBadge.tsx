import type { Status } from '../../lib/types'

interface StatusBadgeProps {
  statusName: string
  statuses: Status[]
}

export function StatusBadge({ statusName, statuses }: StatusBadgeProps) {
  const s = statuses.find(st => st.name === statusName)
  if (!s) return <span className="status-badge">{statusName}</span>
  return (
    <span
      className="status-badge"
      style={{ background: s.colour + '20', color: s.colour }}
    >
      {s.label}
    </span>
  )
}
