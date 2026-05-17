import styles from './ActionBtn.module.css'

export default function ActionBtn({
  label,
  variant = 'default',
  onClick,
  style,
}) {
  return (
    <button
      className={`${styles.btn} ${styles[variant]}`}
      onClick={onClick}
      style={style}
    >
      {label}
    </button>
  )
}
