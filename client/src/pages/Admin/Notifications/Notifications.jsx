import styles from './Notifications.module.css'
import Header from '../Header/Header'

export default function Notifications() {
  return (
    <div className={styles.page}>
      <Header showBack />

      <div className={styles.content}>
        <div className={styles.container}>
          <div className={styles.badge}>Coming Soon</div>
          <h1 className={styles.title}>Alerts &amp; Notifications Engine</h1>
          <p className={styles.sub}>
            We are designing a new real-time communication layer to automatically detect slot vacancy warnings, stuck AP approval flows, and notify faculty members of slot transfers.
          </p>

          <div className={styles.features}>
            <div className={styles.featureItem}>
              <span className={styles.featureIcon}>⚡</span>
              <div>
                <h4>Smart Escalate</h4>
                <p>Auto-escalate booking approvals if unresolved for more than 48 hours.</p>
              </div>
            </div>
            
            <div className={styles.featureItem}>
              <span className={styles.featureIcon}>🔔</span>
              <div>
                <h4>In-App Broadcast</h4>
                <p>Broadcast announcements to student batches and departments instantly.</p>
              </div>
            </div>

            <div className={styles.featureItem}>
              <span className={styles.featureIcon}>📨</span>
              <div>
                <h4>Email Digests</h4>
                <p>Receive weekly lab utilization stats and attendance reports directly.</p>
              </div>
            </div>
          </div>

          <div className={styles.footerCard}>
            <div className={styles.pulseDot}></div>
            <span>System engineers are working on this module. ETA: Q3 2026</span>
          </div>
        </div>
      </div>
    </div>
  )
}
