import { useEffect, useState, useCallback } from 'react'
import styles from './Feedback.module.css'
import Header from '../Header/Header'
import SectionCard from '../../../components/ui/SectionCard'
import { useApp } from '../context/AppContext'
import { adminService } from '../../../services/features/adminService'

function formatDate(ts) {
  if (!ts) return '—'
  try {
    return new Date(ts).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return String(ts)
  }
}

function credLine(f) {
  const parts = []
  if (f.course) parts.push(f.course)
  if (f.year_of_study) parts.push(`${f.year_of_study}${['', 'st', 'nd', 'rd', 'th'][f.year_of_study] || 'th'} Year`)
  return parts.join(' · ')
}

export default function Feedback() {
  const { showToast } = useApp()

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all | verified | unverified

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminService.getFeedback()
      setItems(res?.data?.items || [])
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to load feedback', true)
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => { load() }, [load])

  const handleToggle = async (f) => {
    const next = Number(f.is_verified) === 0
    // Optimistic update
    setItems((prev) => prev.map((x) => (x.feedback_id === f.feedback_id ? { ...x, is_verified: next ? 1 : 0 } : x)))
    try {
      await adminService.setFeedbackVerified(f.feedback_id, next)
      showToast(next ? 'Marked verified' : 'Marked not verified')
    } catch (err) {
      // Revert on failure
      setItems((prev) => prev.map((x) => (x.feedback_id === f.feedback_id ? { ...x, is_verified: next ? 0 : 1 } : x)))
      showToast(err?.response?.data?.message || 'Failed to update', true)
    }
  }

  const filtered = items.filter((f) => {
    if (filter === 'verified') return Number(f.is_verified) === 1
    if (filter === 'unverified') return Number(f.is_verified) === 0
    return true
  })

  return (
    <div className={styles.page}>
      <Header showBack />

      <div className={styles.content}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div className={styles.pageTitle}>Student Feedback</div>
            <div className={styles.pageSub}>
              {loading ? 'Loading…' : `${filtered.length} of ${items.length} feedback`} · Verify genuine messages
            </div>
          </div>

          <select className={styles.select} value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="verified">Verified</option>
            <option value="unverified">Not verified</option>
          </select>
        </div>

        <SectionCard noPadding>
          <div className={styles.list}>
            {loading ? (
              <div className={styles.empty}>Loading feedback…</div>
            ) : filtered.length === 0 ? (
              <div className={styles.empty}>No feedback to show</div>
            ) : (
              filtered.map((f) => {
                const verified = Number(f.is_verified) === 1
                return (
                  <div key={f.feedback_id} className={styles.item}>
                    <div className={styles.itemMain}>
                      <div className={styles.cred}>
                        <span className={styles.name}>{f.name || 'Unknown student'}</span>
                        <span className={styles.reg}>{f.reg_num || '—'}</span>
                        {credLine(f) && <span className={styles.meta}>{credLine(f)}</span>}
                      </div>
                      <div className={styles.message}>{f.message}</div>
                      <div className={styles.date}>{formatDate(f.created_at)}</div>
                    </div>

                    <button
                      type="button"
                      className={`${styles.tick} ${verified ? styles.tickOn : ''}`}
                      onClick={() => handleToggle(f)}
                      title={verified ? 'Verified — click to unverify' : 'Not verified — click to verify'}
                      aria-pressed={verified}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span className={styles.tickLabel}>{verified ? 'Verified' : 'Verify'}</span>
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
