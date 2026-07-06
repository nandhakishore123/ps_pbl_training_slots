import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { facultyService } from '../../services/features/facultyService'
import styles from './FacultyApprovals.module.css'

function Toast({ message, type, onClose }) {
  if (!message) return null
  const bg = type === 'error' ? 'var(--red)' : type === 'warning' ? 'var(--gold)' : 'var(--green)'
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 11000, background: bg, color: '#fff', padding: '12px 16px', borderRadius: 12, fontSize: 13, fontWeight: 600, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
      <span>{message}</span>
      <button onClick={onClose} style={{ marginLeft: 10, background: 'none', border: 'none', color: '#fff', cursor: 'pointer', opacity: 0.8 }}>×</button>
    </div>
  )
}

// Faculty Lab Record approvals — ownership-gated server-side (faculty only sees
// bookings in their own venues). Approve/reject writes only end_survey approval
// columns; nothing touches seats or points.
export default function FacultyApprovals() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('pending')
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [toast, setToast] = useState({ message: '', type: 'success' })

  const notify = (message, type = 'success') => setToast({ message, type })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await facultyService.getLabRecordApprovals(status)
      setRecords(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      notify(err?.response?.data?.message || 'Failed to load lab records', 'error')
      setRecords([])
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => { load() }, [load])

  const openDetail = async (b) => {
    setDetailLoading(true)
    setDetail({ booking: b, responses: null })
    try {
      const res = await facultyService.getLabRecordApprovalDetail(b.booking_id)
      setDetail(res.data || null)
    } catch (err) {
      notify(err?.response?.data?.message || 'Failed to load record', 'error')
      setDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }

  const decide = async (b, kind) => {
    if (!window.confirm(`${kind === 'approve' ? 'Approve' : 'Reject'} ${b.student_name}'s lab record?`)) return
    setBusyId(b.booking_id)
    try {
      if (kind === 'approve') await facultyService.approveLabRecord(b.booking_id)
      else await facultyService.rejectLabRecord(b.booking_id)
      notify(kind === 'approve' ? 'Lab record approved' : 'Lab record rejected', kind === 'approve' ? 'success' : 'warning')
      load()
    } catch (err) {
      notify(err?.response?.data?.message || 'Action failed', 'error')
    } finally {
      setBusyId(null)
    }
  }

  const statusPill = (s) => {
    const v = (s || 'PENDING').toUpperCase()
    const cls = v === 'APPROVED' ? styles.pillGreen : v === 'REJECTED' ? styles.pillRed : v === 'PENDING' ? styles.pillGold : styles.pillGray
    return <span className={`${styles.pill} ${cls}`}>{v}</span>
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <button onClick={() => navigate(-1)} className={styles.backBtn}>← Back</button>

        <div className={styles.headerBlock}>
          <h1 className={styles.title}>Lab Record Approvals</h1>
          <p className={styles.subtitle}>
            Review and approve/reject lab records for students in your venues.
          </p>
        </div>

        <div className={styles.toolbar}>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={styles.select}>
            <option value="pending">Pending</option>
            <option value="all">All</option>
          </select>
        </div>

        <div className={`${styles.card} ${styles.accentPurple}`}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Reg No</th>
                  <th>Course / Lab</th>
                  <th>Slot Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className={styles.cellEmpty}>Loading…</td></tr>
                ) : records.length === 0 ? (
                  <tr><td colSpan={6} className={styles.cellEmpty}>
                    {status === 'pending' ? 'No pending lab records.' : 'No lab records found.'}
                  </td></tr>
                ) : records.map((l, i) => {
                  const pending = (l.approval_status || 'PENDING') === 'PENDING'
                  return (
                    <tr key={l.booking_id} className={i % 2 ? styles.rowAlt : ''}>
                      <td className={styles.cellName}>{l.student_name}</td>
                      <td className={styles.cellMono}>{l.reg_num}</td>
                      <td>{l.skill_name}{l.level_name ? ` · L${l.level_name}` : ''}</td>
                      <td>{l.slot_date || '—'}</td>
                      <td>{statusPill(l.approval_status)}</td>
                      <td>
                        <div className={styles.actions}>
                          <button onClick={() => openDetail(l)} className={`${styles.btn} ${styles.btnOutlinePurple}`}>View</button>
                          {pending && (
                            <>
                              <button onClick={() => decide(l, 'approve')} disabled={busyId === l.booking_id} className={`${styles.btn} ${styles.btnGreen}`}>Approve</button>
                              <button onClick={() => decide(l, 'reject')} disabled={busyId === l.booking_id} className={`${styles.btn} ${styles.btnRed}`}>Reject</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {detail && (
        <div onClick={() => setDetail(null)} className={styles.overlay}>
          <div onClick={(e) => e.stopPropagation()} className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Lab Record — {detail.booking?.student_name || ''}</h2>
              <button onClick={() => setDetail(null)} className={styles.modalClose}>×</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalMeta}>
                {detail.booking?.reg_num} · {detail.booking?.skill_name}{detail.booking?.level_name ? ` · L${detail.booking.level_name}` : ''} · {detail.booking?.slot_date || ''} · status {detail.booking?.approval_status || 'PENDING'}
              </div>
              {detailLoading || detail.responses == null ? (
                <div className={styles.loadingText}>Loading responses…</div>
              ) : detail.responses.length === 0 ? (
                <div className={styles.loadingText}>No responses recorded.</div>
              ) : detail.responses.map((r) => (
                <div key={r.survey_question_id} className={styles.qBlock}>
                  <div className={styles.qText}>{r.question}</div>
                  <div className={styles.aText}>{r.student_response || '—'}</div>
                </div>
              ))}
            </div>
            <div className={styles.modalFooter}>
              <button onClick={() => setDetail(null)} className={`${styles.btn} ${styles.btnMuted}`}>Close</button>
            </div>
          </div>
        </div>
      )}

      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />
    </div>
  )
}
