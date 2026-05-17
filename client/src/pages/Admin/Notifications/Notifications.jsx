import styles from './Notifications.module.css'
import Header from '../Header/Header'
import { useApp } from '../context/AppContext'

const notifications = [
  {
    icon: '🔴',
    msg: 'PBL Lab 3 has no faculty incharge for Thursday slot',
    sub: 'Venue Alert',
    action: 'venue-allocation',
  },
  {
    icon: '🟡',
    msg: '23 lab record approvals pending system-wide',
    sub: 'Lab Records',
    action: 'approvals',
  },
  {
    icon: '🟣',
    msg: '5 AP claims pending for more than 7 days',
    sub: 'Activity Points',
    action: 'approvals',
  },
  {
    icon: '🔵',
    msg: 'Dr. R. Suresh has no slot assigned this week',
    sub: 'Faculty Alert',
    action: 'faculty-allocation',
  },
  {
    icon: '🟠',
    msg: '3 venues free with no upcoming bookings',
    sub: 'Venue Utilization',
    action: 'venue-allocation',
  },
  {
    icon: '🟡',
    msg: 'New student batch import pending approval',
    sub: 'Student Management',
    action: 'students',
  },
  {
    icon: '🔴',
    msg: 'Transfer request: Dr. Meenakshi → Dr. Rajkumar (Slot Tue 2PM)',
    sub: 'Transfer Request',
    action: 'faculty-allocation',
  },
]

export default function Notifications() {
  const { navigate } = useApp()

  return (
    <div className={styles.page}>
      <Header showBack />

      <div className={styles.content}>
        <div className={styles.pageTitle}>Alerts & Notifications</div>
        <div className={styles.pageSub}>7 items need attention</div>

        <div className={styles.list}>
          {notifications.map((n, i) => (
            <div key={i} className={styles.item}>
              <div className={styles.icon}>{n.icon}</div>
              <div className={styles.info}>
                <div className={styles.msg}>{n.msg}</div>
                <div className={styles.sub}>{n.sub}</div>
              </div>
              <button
                className={styles.goBtn}
                onClick={() => navigate(n.action)}
              >
                Go
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
