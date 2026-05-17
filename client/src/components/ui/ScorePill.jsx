import styles from './ScorePill.module.css'

export default function ScorePill({ score, max = 100 }) {
  const pct = score / max
  const cls =
    pct >= 0.6 ? styles.high : pct >= 0.4 ? styles.mid : styles.low

  return (
    <span className={`${styles.pill} ${cls}`}>
      {score}
    </span>
  )
}
