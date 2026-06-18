import { useState, useEffect, useCallback } from 'react'
import Header from '../Header/Header'
import { useData } from '../context/DataContext'
import { useApp } from '../context/AppContext'

// Admin Activity-Points drill-down: courses → slot timings → pass/fail list.
// "Approve/Disapprove" sets a confirmation flag for the points export handoff —
// NO points are awarded. Admin may confirm BOTH passed and failed students and
// can export the slot's list as CSV.
const C = { green: '#10b981', red: '#ef4444', gold: '#f59e0b', purple: '#6c47ff', gray: '#9ca3af' }

function ResultPill({ status }) {
  const v = (status || '').toUpperCase()
  const map = {
    PASSED: ['rgba(16,185,129,0.12)', C.green, 'PASSED'],
    FAILED: ['rgba(239,68,68,0.12)', C.red, 'FAILED'],
  }
  const [bg, color, label] = map[v] || ['#f3f4f6', C.gray, 'Not taken']
  return <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: bg, color }}>{label}</span>
}

function ConfirmPill({ status }) {
  const v = (status || 'PENDING').toUpperCase()
  const map = {
    APPROVED: ['rgba(16,185,129,0.12)', C.green],
    REJECTED: ['rgba(239,68,68,0.12)', C.red],
    PENDING: ['rgba(245,158,11,0.12)', '#b45309'],
  }
  const [bg, color] = map[v] || ['#f3f4f6', C.gray]
  return <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: bg, color }}>{v}</span>
}

const cardStyle = { background: '#fff', border: '1.5px solid #e5e4eb', borderRadius: 14, padding: 18, cursor: 'pointer', transition: 'all .18s' }
const th = { textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 800, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.4, whiteSpace: 'nowrap' }
const td = { padding: '12px 14px', fontSize: 13, color: '#1a1a2e', borderTop: '1px solid #f0f2f8' }
const btn = (bg, color, border) => ({ padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${border}`, background: bg, color, fontSize: 12, fontWeight: 700, cursor: 'pointer' })

export default function ActivityPoints() {
  const {
    getActivityPointsCourses, getActivityPointsSlots, getActivityPointsSlotStudents,
    approveActivityPoint, disapproveActivityPoint, exportActivityPointsCsv,
  } = useData()
  const { showToast } = useApp()

  // view: 'courses' | 'slots' | 'students'
  const [view, setView] = useState('courses')
  const [course, setCourse] = useState(null)
  const [slot, setSlot] = useState(null)

  const [courses, setCourses] = useState([])
  const [slots, setSlots] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [exporting, setExporting] = useState(false)

  const loadCourses = useCallback(async () => {
    setLoading(true)
    setCourses(await getActivityPointsCourses())
    setLoading(false)
  }, [getActivityPointsCourses])

  useEffect(() => { loadCourses() }, [loadCourses])

  const openCourse = async (c) => {
    setCourse(c); setView('slots'); setLoading(true)
    setSlots(await getActivityPointsSlots(c.training_skill_id))
    setLoading(false)
  }

  const openSlot = async (s) => {
    setSlot(s); setView('students'); setLoading(true)
    setStudents(await getActivityPointsSlotStudents(s.venue_slot_id))
    setLoading(false)
  }

  const reloadStudents = async () => {
    setStudents(await getActivityPointsSlotStudents(slot.venue_slot_id))
  }

  const decide = async (row, approve) => {
    setBusyId(row.booking_id)
    const ok = approve ? await approveActivityPoint(row.booking_id) : await disapproveActivityPoint(row.booking_id)
    setBusyId(null)
    if (ok) { showToast(approve ? 'Result confirmed' : 'Confirmation revoked'); reloadStudents() }
  }

  const doExport = async () => {
    setExporting(true)
    await exportActivityPointsCsv(slot.venue_slot_id)
    setExporting(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f8' }}>
      <Header showBack />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 24px 48px' }}>

        {/* Breadcrumb */}
        <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ cursor: 'pointer', fontWeight: view === 'courses' ? 800 : 600, color: view === 'courses' ? '#1a1a2e' : C.purple }} onClick={() => setView('courses')}>Activity Points</span>
          {course && <><span>›</span><span style={{ cursor: 'pointer', fontWeight: view === 'slots' ? 800 : 600, color: view === 'slots' ? '#1a1a2e' : C.purple }} onClick={() => setView('slots')}>{course.skill_name}</span></>}
          {slot && view === 'students' && <><span>›</span><span style={{ fontWeight: 800, color: '#1a1a2e' }}>{slot.slot_date} · {slot.start_time?.slice(0, 5)}</span></>}
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1a1a2e', marginBottom: 4 }}>
          {view === 'courses' && 'Activity Points — Courses'}
          {view === 'slots' && `${course?.skill_name} — Slot Timings`}
          {view === 'students' && 'Pass / Fail List'}
        </h1>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 18 }}>
          {view === 'courses' && 'Pick a course to drill into its slot timings and confirm student results for the points handoff.'}
          {view === 'slots' && 'Slot timings that had students for this course.'}
          {view === 'students' && 'Confirm (approve) or revoke (disapprove) each result. Admin can confirm passed AND failed students. No points are awarded here.'}
        </p>

        {/* ── COURSES ── */}
        {view === 'courses' && (
          loading ? <Empty>Loading courses…</Empty> : courses.length === 0 ? <Empty>No courses found.</Empty> : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
              {courses.map((c) => (
                <div key={c.training_skill_id} style={cardStyle} onClick={() => openCourse(c)}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.purple }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e4eb' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: c.skill_type === 'PBL' ? 'rgba(108,71,255,0.1)' : 'rgba(16,185,129,0.1)', color: c.skill_type === 'PBL' ? C.purple : C.green }}>{c.skill_type || 'PS'}</span>
                    <span style={{ color: C.gray, fontSize: 18 }}>›</span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#1a1a2e' }}>{c.skill_name}</div>
                  <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{c.category_name || '—'}</div>
                </div>
              ))}
            </div>
          )
        )}

        {/* ── SLOTS ── */}
        {view === 'slots' && (
          <>
            <button onClick={() => setView('courses')} style={{ ...btn('#fff', '#6b7280', '#e5e4eb'), marginBottom: 14 }}>← Back to Courses</button>
            {loading ? <Empty>Loading slot timings…</Empty> : slots.length === 0 ? <Empty>No slots with students for this course.</Empty> : (
              <Table cols={['Date', 'Time', 'Venue', 'Students', 'Attended', '']}>
                {slots.map((s) => (
                  <tr key={s.venue_slot_id}>
                    <td style={td}><b>{s.slot_date}</b></td>
                    <td style={td}>{s.start_time?.slice(0, 5)}–{s.end_time?.slice(0, 5)}</td>
                    <td style={td}>{s.venue_name}</td>
                    <td style={td}>{s.student_count}</td>
                    <td style={td}>{s.attended_count}</td>
                    <td style={td}><button onClick={() => openSlot(s)} style={btn('rgba(108,71,255,0.08)', C.purple, C.purple)}>View list →</button></td>
                  </tr>
                ))}
              </Table>
            )}
          </>
        )}

        {/* ── STUDENTS (pass/fail) ── */}
        {view === 'students' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 10, flexWrap: 'wrap' }}>
              <button onClick={() => setView('slots')} style={btn('#fff', '#6b7280', '#e5e4eb')}>← Back to Slots</button>
              <button onClick={doExport} disabled={exporting || students.length === 0} style={btn(C.green, '#fff', C.green)}>
                {exporting ? 'Exporting…' : '⬇ Export CSV'}
              </button>
            </div>
            {loading ? <Empty>Loading students…</Empty> : students.length === 0 ? <Empty>No students for this slot.</Empty> : (
              <Table cols={['Student', 'Reg No', 'Attendance', 'Result', 'Score', 'Confirmation', 'Action']}>
                {students.map((r) => (
                  <tr key={r.booking_id}>
                    <td style={{ ...td, fontWeight: 700 }}>{r.student_name}</td>
                    <td style={{ ...td, fontFamily: 'monospace', color: '#6b7280' }}>{r.reg_num}</td>
                    <td style={td}>{r.attendance_status || '—'}</td>
                    <td style={td}><ResultPill status={r.assessment_status} /></td>
                    <td style={td}>{r.assessment_score != null ? `${r.assessment_score}/${r.assessment_total ?? '?'}` : '—'}</td>
                    <td style={td}><ConfirmPill status={r.confirm_status} /></td>
                    <td style={td}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button onClick={() => decide(r, true)} disabled={busyId === r.booking_id} style={btn('rgba(16,185,129,0.08)', C.green, 'rgba(5,150,105,0.4)')}>Approve</button>
                        <button onClick={() => decide(r, false)} disabled={busyId === r.booking_id} style={btn('rgba(239,68,68,0.08)', C.red, 'rgba(239,68,68,0.4)')}>Disapprove</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </Table>
            )}
          </>
        )}
      </div>
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
