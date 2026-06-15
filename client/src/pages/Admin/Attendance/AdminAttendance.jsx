import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminService } from '../../../services/features/adminService'
import Header from '../layout/Header'

const P = '#6c47ff'

const formatTime = (t) => {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hh = parseInt(h, 10)
  return `${hh % 12 || 12}:${m} ${hh >= 12 ? 'PM' : 'AM'}`
}

const getInitials = (name) =>
  String(name || '').split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?'

// ── Toast ──────────────────────────────────────────────────────
function Toast({ message, type, onClose }) {
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 999,
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '12px 20px', borderRadius: 12,
      background: type === 'error' ? '#ef4444' : '#10b981',
      color: '#fff', fontSize: 13, fontWeight: 600,
      boxShadow: '0 8px 30px rgba(0,0,0,0.18)',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }}>
      {message}
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', opacity: 0.7, fontSize: 16, lineHeight: 1 }}>&times;</button>
    </div>
  )
}

// ── Venue Card (left sidebar) ──────────────────────────────────
function VenueCard({ mapping, selected, onClick }) {
  const isActive = selected?.mapping_id === mapping.mapping_id
  return (
    <button
      onClick={() => onClick(mapping)}
      style={{
        width: '100%', textAlign: 'left', padding: '14px 16px',
        background: isActive ? 'rgba(108,71,255,0.08)' : '#fff',
        border: `1.5px solid ${isActive ? 'rgba(108,71,255,0.4)' : '#e5e4eb'}`,
        borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s',
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e', marginBottom: 2 }}>
        {mapping.venue_name}
      </div>
      <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 500 }}>
        {mapping.location || 'No location'} · Cap: {mapping.capacity}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
        <span style={{
          padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700,
          background: 'rgba(108,71,255,0.1)', color: P
        }}>
          {formatTime(mapping.start_time)} – {formatTime(mapping.end_time)}
        </span>
        {mapping.faculty_name && (
          <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600 }}>
            {mapping.faculty_name}
          </span>
        )}
      </div>
    </button>
  )
}

// ── Student Row ────────────────────────────────────────────────
function StudentRow({ student, onMark, loading }) {
  const avatarBg = ['#dbeafe', '#d1fae5', '#ede9fe', '#fce7f3', '#ffedd5'][student._idx % 5]
  const avatarColor = ['#1d4ed8', '#059669', '#7c3aed', '#db2777', '#ea580c'][student._idx % 5]

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '12px 16px', background: '#fff',
      border: '1px solid #e5e4eb', borderRadius: 12,
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }}>
      {/* Avatar */}
      <div style={{
        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 700, background: avatarBg, color: avatarColor
      }}>
        {getInitials(student.name)}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {student.name}
        </div>
        <div style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>
          {student.reg_num} · {student.course || '—'}
        </div>
      </div>

      {/* Status badge */}
      <div style={{ flexShrink: 0 }}>
        {student.status === 'MALPRACTICE' ? (
          <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
            Malpractice
          </span>
        ) : student.attendance_status === 'PRESENT' ? (
          <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: 'rgba(16,185,129,0.12)', color: '#059669' }}>
            ✓ Present
          </span>
        ) : student.attendance_status === 'ABSENT' ? (
          <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
            ✗ Absent
          </span>
        ) : (
          <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: '#f3f4f6', color: '#6b7280' }}>
            Unmarked
          </span>
        )}
      </div>

      {/* Buttons */}
      {student.status !== 'MALPRACTICE' && (
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button
            disabled={loading}
            onClick={() => onMark(student, 'PRESENT')}
            style={{
              padding: '6px 14px', borderRadius: 8, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 11, fontWeight: 700, transition: 'all 0.15s',
              background: student.attendance_status === 'PRESENT' ? '#059669' : 'rgba(16,185,129,0.12)',
              color: student.attendance_status === 'PRESENT' ? '#fff' : '#059669',
              fontFamily: "'Plus Jakarta Sans', sans-serif"
            }}
          >
            Present
          </button>
          <button
            disabled={loading}
            onClick={() => onMark(student, 'ABSENT')}
            style={{
              padding: '6px 14px', borderRadius: 8, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 11, fontWeight: 700, transition: 'all 0.15s',
              background: student.attendance_status === 'ABSENT' ? '#ef4444' : 'rgba(239,68,68,0.1)',
              color: student.attendance_status === 'ABSENT' ? '#fff' : '#ef4444',
              fontFamily: "'Plus Jakarta Sans', sans-serif"
            }}
          >
            Absent
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────
export default function AdminAttendance() {
  const navigate = useNavigate()
  const [mappings, setMappings] = useState([])
  const [selected, setSelected] = useState(null)
  const [students, setStudents] = useState([])
  const [loadingMappings, setLoadingMappings] = useState(true)
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [markingId, setMarkingId] = useState(null)
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Fetch all mappings
  useEffect(() => {
    adminService.getAttendanceMappings()
      .then(res => {
        setMappings(res.data || [])
      })
      .catch(() => showToast('Failed to load venue mappings.', 'error'))
      .finally(() => setLoadingMappings(false))
  }, [])

  // Fetch students when mapping selected
  useEffect(() => {
    if (!selected) { setStudents([]); return }
    setLoadingStudents(true)
    adminService.getAttendanceStudents(selected.mapping_id)
      .then(res => setStudents(res.data || []))
      .catch(() => showToast('Failed to load students.', 'error'))
      .finally(() => setLoadingStudents(false))
  }, [selected?.mapping_id])

  const handleMark = async (student, status) => {
    setMarkingId(student.booking_id)
    try {
      await adminService.markAttendance(student.booking_id, status)
      const isPresent = status === 'PRESENT' ? 1 : 0
      setStudents(prev => prev.map(s =>
        s.booking_id === student.booking_id
          ? { ...s, is_present: isPresent, attendance_status: status }
          : s
      ))
      showToast(`${student.name} marked as ${status.toLowerCase()}.`)
    } catch {
      showToast('Failed to mark attendance.', 'error')
    }
    setMarkingId(null)
  }

  const filteredStudents = students.filter(s => {
    const q = search.toLowerCase()
    return s.name.toLowerCase().includes(q) || (s.reg_num || '').toLowerCase().includes(q)
  })

  const presentCount = students.filter(s => s.attendance_status === 'PRESENT').length
  const absentCount = students.filter(s => s.attendance_status === 'ABSENT').length
  const unmarkedCount = students.filter(s => !s.attendance_status && s.status !== 'MALPRACTICE').length

  const font = "'Plus Jakarta Sans', 'Outfit', system-ui, sans-serif"

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f8', fontFamily: font }}>
      <Header showBack />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 24px 48px' }}>
        {/* Title */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1a1a2e', fontFamily: "'Outfit', sans-serif" }}>
            Attendance Management
          </h1>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
            View any lab/slot and mark student attendance as Present or Absent.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
          {/* Left — Venue list */}
          <div style={{
            width: 320, flexShrink: 0, background: '#fff', border: '1px solid #e5e4eb',
            borderRadius: 16, padding: 16, maxHeight: 'calc(100vh - 160px)', overflowY: 'auto'
          }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#1a1a2e', marginBottom: 12 }}>
              Venues & Slots
            </div>

            {loadingMappings ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Loading...</div>
            ) : mappings.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                No venue mappings found.<br />
                <span style={{ fontSize: 11 }}>Create venue mappings first.</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {mappings.map(m => (
                  <VenueCard key={m.mapping_id} mapping={m} selected={selected} onClick={setSelected} />
                ))}
              </div>
            )}
          </div>

          {/* Right — Students */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {!selected ? (
              <div style={{
                background: '#fff', border: '1px solid #e5e4eb', borderRadius: 16,
                padding: '60px 20px', textAlign: 'center', color: '#9ca3af'
              }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 }}>Select a Venue</div>
                <div style={{ fontSize: 13 }}>Pick a venue/slot from the left to view booked students.</div>
              </div>
            ) : (
              <>
                {/* Selected venue header */}
                <div style={{
                  background: '#fff', border: '1px solid #e5e4eb', borderRadius: 16,
                  padding: '16px 20px', marginBottom: 14
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#1a1a2e' }}>{selected.venue_name}</div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                        {formatTime(selected.start_time)} – {formatTime(selected.end_time)}
                        {selected.faculty_name ? ` · ${selected.faculty_name}` : ''}
                        {` · ${students.length} students`}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      {[
                        { label: 'Present', val: presentCount, bg: 'rgba(16,185,129,0.1)', color: '#059669' },
                        { label: 'Absent', val: absentCount, bg: 'rgba(239,68,68,0.1)', color: '#ef4444' },
                        { label: 'Unmarked', val: unmarkedCount, bg: '#f3f4f6', color: '#6b7280' },
                      ].map(s => (
                        <div key={s.label} style={{
                          padding: '6px 14px', borderRadius: 10, background: s.bg,
                          fontSize: 11, fontWeight: 700, color: s.color, textAlign: 'center'
                        }}>
                          {s.val} {s.label}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Search */}
                  <input
                    type="text"
                    placeholder="Search students by name or reg number..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{
                      width: '100%', marginTop: 12, padding: '9px 14px',
                      border: '1.5px solid #e5e4eb', borderRadius: 10,
                      fontSize: 13, color: '#1a1a2e', outline: 'none',
                      fontFamily: font
                    }}
                    onFocus={e => e.target.style.borderColor = P}
                    onBlur={e => e.target.style.borderColor = '#e5e4eb'}
                  />
                </div>

                {/* Student list */}
                {loadingStudents ? (
                  <div style={{
                    background: '#fff', border: '1px solid #e5e4eb', borderRadius: 16,
                    padding: '40px 20px', textAlign: 'center', color: '#9ca3af', fontSize: 13
                  }}>
                    Loading students...
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div style={{
                    background: '#fff', border: '1px solid #e5e4eb', borderRadius: 16,
                    padding: '40px 20px', textAlign: 'center', color: '#9ca3af', fontSize: 13
                  }}>
                    {students.length === 0 ? 'No students booked for this slot.' : 'No students match your search.'}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {filteredStudents.map((s, i) => (
                      <StudentRow
                        key={s.booking_id}
                        student={{ ...s, _idx: i }}
                        onMark={handleMark}
                        loading={markingId === s.booking_id}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
