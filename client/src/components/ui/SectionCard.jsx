import styles from './SectionCard.module.css'

export default function SectionCard({ title, children, noPadding = false }) {
  return (
    <div
      className={styles.card}
      style={noPadding ? { padding: 0, overflow: 'hidden' } : {}}
    >
      {title && (
        <div className={styles.title}>
          {title}
        </div>
      )}
      {children}
    </div>
  )
}
