import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { facultyService } from '../../services/features/facultyService'

const P = '#6c47ff'
const C = { green: '#10b981', red: '#ef4444', gray: '#9ca3af' }
const font = "'Plus Jakarta Sans', 'Outfit', system-ui, sans-serif"

function Toast({ message, type, onClose }) {
  if (!message) return null
  const bg = type === 'error' ? '#dc2626' : type === 'warning' ? '#f59e0b' : '#059669'
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 11000, background: bg, color: '#fff', padding: '12px 16px', borderRadius: 12, fontSize: 13, fontWeight: 600, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
      <span>{message}</span>
      <button onClick={onClose} style={{ marginLeft: 10, background: 'none', border: 'none', color: '#fff', cursor: 'pointer', opacity: 0.8 }}>×</button>
    </div>
  )
}

function ResultPill({ status }) {
  const v = (status || '').toUpperCase()
  const map = { PASSED: ['rgba(16,185,129,0.12)', C.green, 'PASSED'], FAILED: ['rgba(239,68,68,0.12)', C.red, 'FAILED'] }
  const [bg, color, label] = map[v] || ['#f3f4f6', C.gray, 'Not taken']
  return <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: bg, color }}>{label}</span>
}

function ConfirmPill({ status }) {
  const v = (status || 'PENDING').toUpperCase()
  const map = { APPROVED: ['rgba(16,185,129,0.12)', C.green], REJECTED: ['rgba(239,68,68,0.12)', C.red], PENDING: ['rgba(245,158,11,0.12)', '#b45309'] }
  const [bg, color] = map[v] || ['#f3f4f6', C.gray]
  return <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: bg, color }}>{v}</span>
}

const th = { textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 800, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.4, whiteSpace: 'nowrap' }
const td = { padding: '12px 14px', fontSize: 13, color: '#1a1a2e', borderTop: '1px solid #f0f2f8' }
const btn = (bg, color, border) => ({ padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${border}`, background: bg, color, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: font })

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
    <div style={{ minHeight: '100vh', background: '#f0f2f8', fontFamily: font }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 24px 48px' }}>
        <button onClick={() => (view === 'students' ? setView('slots') : navigate(-1))} style={{ ...btn('#fff', '#6b7280', '#e5e4eb'), marginBottom: 16 }}>← Back</button>

        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1a1a2e' }}>
          {view === 'slots' ? 'Activity Points — My Slots' : 'Pass / Fail List'}
        </h1>
        <p style={{ fontSize: 13, color: '#6b7280', marginTop: 2, marginBottom: 18 }}>
          {view === 'slots'
            ? 'Pick one of your venue slots to review its pass/fail list.'
            : 'Confirm (approve) or revoke (disapprove) — you can only act on students who PASSED. No points are awarded.'}
        </p>

        {view === 'slots' && (
          loading ? <Empty>Loading your slots…</Empty> : slots.length === 0 ? <Empty>No venue slots assigned to you.</Empty> : (
            <Table cols={['Date', 'Time', 'Venue', 'Booked', '']}>
              {slots.map((s) => (
                <tr key={s.venue_slot_id}>
                  <td style={td}><b>{s.slot_date}</b></td>
                  <td style={td}>{s.start_time?.slice(0, 5)}–{s.end_time?.slice(0, 5)}</td>
                  <td style={td}>{s.venue_name}</td>
                  <td style={td}>{s.current_bookings}</td>
                  <td style={td}><button onClick={() => openSlot(s)} style={btn('rgba(108,71,255,0.08)', P, P)}>View list →</button></td>
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
                    <td style={{ ...td, fontWeight: 700 }}>{r.student_name}</td>
                    <td style={{ ...td, fontFamily: 'monospace', color: '#6b7280' }}>{r.reg_num}</td>
                    <td style={td}>{r.attendance_status || '—'}</td>
                    <td style={td}><ResultPill status={r.assessment_status} /></td>
                    <td style={td}>{r.assessment_score != null ? `${r.assessment_score}/${r.assessment_total ?? '?'}` : '—'}</td>
                    <td style={td}><ConfirmPill status={r.confirm_status} /></td>
                    <td style={td}>
                      {passed ? (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button onClick={() => decide(r, true)} disabled={busyId === r.booking_id} style={btn('rgba(16,185,129,0.08)', C.green, 'rgba(5,150,105,0.4)')}>Approve</button>
                          <button onClick={() => decide(r, false)} disabled={busyId === r.booking_id} style={btn('rgba(239,68,68,0.08)', C.red, 'rgba(239,68,68,0.4)')}>Disapprove</button>
                        </div>
                      ) : (
                        <span style={{ fontSize: 11, color: C.gray }}>Passed only</span>
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
  return <div style={{ background: '#fff', border: '1px solid #e5e4eb', borderRadius: 14, padding: 32, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>{children}</div>
}

function Table({ cols, children }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e4eb', borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#faf9ff' }}>{cols.map((c, i) => <th key={i} style={th}>{c}</th>)}</tr></thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  )
}
