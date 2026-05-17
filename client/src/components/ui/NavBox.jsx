import styles from './NavBox.module.css'
import MiniChip from './MiniChip'

export default function NavBox({
  icon,
  iconColor = 'purple',
  label,
  desc,
  chips = [],
  badge,
  notifDot = false,
  onClick,
}) {
  return (
    <div className={styles.box} onClick={onClick}>
      <div className={`${styles.iconWrap} ${styles[iconColor]}`}>
        {icon}
      </div>
      <div className={styles.info}>
        <div className={styles.label}>
          {label}
          {notifDot && <span className={styles.notifDot} />}
        </div>
        <div className={styles.desc}>{desc}</div>
        {chips.length > 0 && (
          <div className={styles.chips}>
            {chips.map((chip, i) => (
              <MiniChip key={i} label={chip.label} color={chip.color} />
            ))}
          </div>
        )}
      </div>
      {badge && (
        <span className={`${styles.badge} ${badge.color ? styles[badge.color] : ''}`}>
          {badge.count}
        </span>
      )}
      <div className={styles.arrow}>›</div>
    </div>
  )
}
