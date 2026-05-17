import styles from './Badge.module.css'

export default function Badge({ status }) {
  const labelMap = {
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    active: 'Active',
    inactive: 'Inactive',
    occupied: 'Occupied',
    free: 'Free',
    transferred: 'Transferred',
  }

  const label = labelMap[status] || status.charAt(0).toUpperCase() + status.slice(1)

  return (
    <span className={`${styles.badge} ${styles[status]}`}>
      {label}
    </span>
  )
}
