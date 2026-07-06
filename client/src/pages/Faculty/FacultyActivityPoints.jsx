import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { facultyService } from '../../services/features/facultyService'
import styles from './FacultyActivityPoints.module.css'

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

function ResultPill({ status }) {
  const v = (status || '').toUpperCase()
  const map = { PASSED: [styles.pillGreen, 'PASSED'], FAILED: [styles.pillRed, 'FAILED'] }
  const [cls, label] = map[v] || [styles.pillGray, 'Not taken']
  return <span className={`${styles.pill} ${styles.pillLg} ${cls}`}>{label}</span>
}

function ConfirmPill({ status }) {
  const v = (status || 'PENDING').toUpperCase()
  const cls = v === 'APPROVED' ? styles.pillGreen : v === 'REJECTED' ? styles.pillRed : v === 'PENDING' ? styles.pillGold : styles.pillGray
  return <span className={`${styles.pill} ${styles.pillSm} ${cls}`}>{v}</span>
}

// Faculty Activity-Points pass/fail view. Lists the faculty's own venue slots →
// pass/fail list. Approve/Disapprove sets a confirmation flag (NO points
// awarded) and is allowed ONLY for students who PASSED. No CSV export.
export default function FacultyActivityPoints() {
  const navigate = useNavigate()
  const [view, setView] = useState('slots') // 'slots' | 'students'
  const [slots, setSlots] = useState([])
  const [slot, setSlot] = useState(null)
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [toast, setToast] = useState({ message: '', type: 'success' })
  const notify = (message, type = 'success') => setToast({ message, type })

  const loadSlots = useCallback(async () => {
    setLoading(true)
    try {
      const res = await facultyService.getMyVenueSlots()
      setSlots(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      notify(err?.response?.data?.message || 'Failed to load your slots', 'error')
      setSlots([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadSlots() }, [loadSlots])

  const openSlot = async (s) => {
    setSlot(s); setView('students'); setLoading(true)
    try {
      const res = await facultyService.getActivityPointsSlotStudents(s.venue_slot_id)
      setStudents(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      notify(err?.response?.data?.message || 'Failed to load students', 'error')
      setStudents([])
    } finally {
      setLoading(false)
    }
  }

  const reload = async () => {
    try {
      const res = await facultyService.getActivityPointsSlotStudents(slot.venue_slot_id)
      setStudents(Array.isArray(res.data) ? res.data : [])
    } catch { /* keep existing */ }
  }

  const decide = async (r, approve) => {
    setBusyId(r.booking_id)
    try {
      if (approve) await facultyService.approveActivityPoint(r.booking_id)
      else await facultyService.disapproveActivityPoint(r.booking_id)
      notify(approve ? 'Result confirmed' : 'Confirmation revoked', approve ? 'success' : 'warning')
      reload()
    } catch (err) {
      notify(err?.response?.data?.message || 'Action failed (faculty can only confirm PASSED students)', 'error')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <button onClick={() => (view === 'students' ? setView('slots') : navigate(-1))} className={styles.backBtn}>← Back</button>

        <h1 className={styles.title}>
          {view === 'slots' ? 'Activity Points — My Slots' : 'Pass / Fail List'}
        </h1>
        <p className={styles.subtitle}>
          {view === 'slots'
            ? 'Pick one of your venue slots to review its pass/fail list.'
            : 'Confirm (approve) or revoke (disapprove) — you can only act on students who PASSED. No points are awarded.'}
        </p>

        {view === 'slots' && (
          loading ? <Empty>Loading your slots…</Empty> : slots.length === 0 ? <Empty>No venue slots assigned to you.</Empty> : (
            <Table cols={['Date', 'Time', 'Venue', 'Booked', '']}>
              {slots.map((s) => (
                <tr key={s.venue_slot_id}>
                  <td><b>{s.slot_date}</b></td>
                  <td>{s.start_time?.slice(0, 5)}–{s.end_time?.slice(0, 5)}</td>
                  <td>{s.venue_name}</td>
                  <td>{s.current_bookings}</td>
                  <td><button onClick={() => openSlot(s)} className={`${styles.btn} ${styles.btnOutlinePurple}`}>View list →</button></td>
                </tr>
              ))}
            </Table>
          )
        )}

        {view === 'students' && (
          loading ? <Empty>Loading students…</Empty> : students.length === 0 ? <Empty>No students for this slot.</Empty> : (
            <Table cols={['Student', 'Reg No', 'Attendance', 'Result', 'Score', 'Confirmation', 'Action']}>
              {students.map((r) => {
                const passed = (r.assessment_status || '').toUpperCase() === 'PASSED'
                return (
                  <tr key={r.booking_id}>
                    <td className={styles.cellName}>{r.student_name}</td>
                    <td className={styles.cellMono}>{r.reg_num}</td>
                    <td>{r.attendance_status || '—'}</td>
                    <td><ResultPill status={r.assessment_status} /></td>
                    <td>{r.assessment_score != null ? `${r.assessment_score}/${r.assessment_total ?? '?'}` : '—'}</td>
                    <td><ConfirmPill status={r.confirm_status} /></td>
                    <td>
                      {passed ? (
                        <div className={styles.actions}>
                          <button onClick={() => decide(r, true)} disabled={busyId === r.booking_id} className={`${styles.btn} ${styles.btnGreen}`}>Approve</button>
                          <button onClick={() => decide(r, false)} disabled={busyId === r.booking_id} className={`${styles.btn} ${styles.btnRed}`}>Disapprove</button>
                        </div>
                      ) : (
                        <span className={styles.passedOnly}>Passed only</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </Table>
          )
        )}
      </div>
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />
    </div>
  )
}

function Empty({ children }) {
  return <div className={styles.empty}>{children}</div>
}

function Table({ cols, children }) {
  return (
    <div className={`${styles.card} ${styles.accentPurple}`}>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr>{cols.map((c, i) => <th key={i}>{c}</th>)}</tr></thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  )
}
