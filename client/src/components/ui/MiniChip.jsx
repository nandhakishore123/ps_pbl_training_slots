import styles from './MiniChip.module.css'

export default function MiniChip({ label, color = 'gray' }) {
  return (
    <span className={`${styles.chip} ${styles[color]}`}>
      {label}
    </span>
  )
}
