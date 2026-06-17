import { useState, useEffect, useMemo, useCallback } from 'react'
import { adminService } from '../../../services/features/adminService'
import Header from '../layout/Header'
import { useApp } from '../context/AppContext'
import BookForStudentModal from './BookForStudentModal'
import BulkBookModal from './BulkBookModal'

const P = '#6c47ff'
const font = "'Plus Jakarta Sans', 'Outfit', system-ui, sans-serif"

// ── helpers ────────────────────────────────────────────────────
const formatTime = (t) => {
  if (!t) return ''
  const [h, m] = String(t).split(':')
  const hh = parseInt(h, 10)
  if (Number.isNaN(hh)) return String(t)
  return `${hh % 12 || 12}:${m} ${hh >= 12 ? 'PM' : 'AM'}`
}

const slotLabel = (b) => `${formatTime(b.start_time)} – ${formatTime(b.end_time)}`

const attendanceText = (b) =>
  b.attendance_status === 'PRESENT' ? 'Present'
    : b.attendance_status === 'ABSENT' ? 'Absent'
      : 'Unmarked'

const RESULT_LABELS = { PASSED: 'Pass', FAILED: 'Fail', ONGOING: 'In progress', COMPLETED: 'Completed' }

const resultText = (b) => {
  if (!b.assessment_status) return 'Not taken'
  const label = RESULT_LABELS[b.assessment_status] || b.assessment_status
  const hasScore = b.assessment_score != null && b.assessment_total != null
  return hasScore ? `${label} (${b.assessment_score}/${b.assessment_total})` : label
}

// ── small badge primitives ─────────────────────────────────────
function Pill({ text, bg, color }) {
  return (
    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: bg, color, whiteSpace: 'nowrap' }}>
      {text}
    </span>
  )
}

function StatusBadge({ status }) {
  const map = {
    ONGOING: ['rgba(108,71,255,0.1)', P],
    PASS: ['rgba(16,185,129,0.12)', '#059669'],
    COMPLETED: ['rgba(16,185,129,0.12)', '#059669'],
    FAIL: ['rgba(239,68,68,0.12)', '#ef4444'],
    MALPRACTICE: ['rgba(239,68,68,0.12)', '#ef4444'],
  }
  const [bg, color] = map[status] || ['#f3f4f6', '#6b7280']
  return <Pill text={status || '—'} bg={bg} color={color} />
}

function AttendanceBadge({ b }) {
  if (b.attendance_status === 'PRESENT') return <Pill text="✓ Present" bg="rgba(16,185,129,0.12)" color="#059669" />
  if (b.attendance_status === 'ABSENT') return <Pill text="✗ Absent" bg="rgba(239,68,68,0.12)" color="#ef4444" />
  return <Pill text="Unmarked" bg="#f3f4f6" color="#6b7280" />
}

function ResultBadge({ b }) {
  if (!b.assessment_status) return <Pill text="Not taken" bg="#f3f4f6" color="#6b7280" />
  const passed = b.assessment_status === 'PASSED' || b.assessment_status === 'COMPLETED'
  const failed = b.assessment_status === 'FAILED'
  const bg = passed ? 'rgba(16,185,129,0.12)' : failed ? 'rgba(239,68,68,0.12)' : 'rgba(108,71,255,0.1)'
  const color = passed ? '#059669' : failed ? '#ef4444' : P
  return <Pill text={resultText(b)} bg={bg} color={color} />
}

// ── CSV ────────────────────────────────────────────────────────
const CSV_HEADERS = ['Student', 'Reg No', 'Lab', 'Slot Time', 'Date', 'Faculty', 'Status', 'Attendance', 'Result']

const csvEscape = (v) => {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

const buildCsv = (rows) => {
  const lines = [CSV_HEADERS.join(',')]
  for (const b of rows) {
    lines.push([
      b.student_name,
      b.reg_num,
      b.venue_name,
      `${formatTime(b.start_time)} - ${formatTime(b.end_time)}`,
      b.booking_date,
      b.faculty_name || '',
      b.booking_status,
      attendanceText(b),
      resultText(b),
    ].map(csvEscape).join(','))
  }
  return lines.join('\n')
}

// ── Main Page ──────────────────────────────────────────────────
export default function AdminBookings() {
  const { showToast } = useApp()

  const [venues, setVenues] = useState([])
  const [slots, setSlots] = useState([])

  const [venueId, setVenueId] = useState('')
  const [date, setDate] = useState('')
  const [slotId, setSlotId] = useState('')

  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [cancellingId, setCancellingId] = useState(null)
  const [showBookModal, setShowBookModal] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)
  // Stage 6c — result override + admin malpractice
  const [busyId, setBusyId] = useState(null)
  const [overrideBooking, setOverrideBooking] = useState(null)

  // Filter dropdown sources (reuse existing admin endpoints)
  useEffect(() => {
    adminService.getVenues().then(res => setVenues(res.data || [])).catch(() => setVenues([]))
    adminService.getSlotTimings().then(res => setSlots(res.data || [])).catch(() => setSlots([]))
  }, [])

  const fetchBookings = useCallback(() => {
    setLoading(true)
    setError('')
    const params = {}
    if (venueId) params.venueId = venueId
    if (date) params.date = date
    if (slotId) params.slotId = slotId
    adminService.getAllBookings(params)
      .then(res => setBookings(res.data || []))
      .catch(() => { setError('Failed to load bookings.'); setBookings([]) })
      .finally(() => setLoading(false))
  }, [venueId, date, slotId])

  useEffect(() => { fetchBookings() }, [fetchBookings])

  // Cancel a booking — only ONGOING bookings can be cancelled (the seat is freed
  // server-side, decrementing venue_slots only because it was ONGOING).
  const handleCancel = async (b) => {
    if (b.booking_status !== 'ONGOING') return
    if (!window.confirm('Cancel this booking and free the seat?')) return
    setCancellingId(b.booking_id)
    try {
      await adminService.cancelBooking(b.booking_id)
      showToast('Booking cancelled — seat freed')
      fetchBookings()
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to cancel booking', true)
    } finally {
      setCancellingId(null)
    }
  }

  // Mark malpractice — only ONGOING. Server frees the seat (floored decrement).
  const handleMarkMal = async (b) => {
    if (b.booking_status !== 'ONGOING') return
    if (!window.confirm('Flag this booking as MALPRACTICE? This frees the held seat.')) return
    setBusyId(b.booking_id)
    try {
      await adminService.markMalpractice(b.booking_id)
      showToast('Malpractice flagged — seat freed')
      fetchBookings()
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to flag malpractice', true)
    } finally {
      setBusyId(null)
    }
  }

  // Revoke malpractice — only MALPRACTICE. Server re-claims a seat (guarded); if
  // the slot is full the revoke is rejected (409) and nothing changes.
  const handleRevokeMal = async (b) => {
    if (b.booking_status !== 'MALPRACTICE') return
    if (!window.confirm('Revoke malpractice? This re-claims a seat (blocked if the slot is full).')) return
    setBusyId(b.booking_id)
    try {
      await adminService.revokeMalpractice(b.booking_id)
      showToast('Malpractice revoked — booking is ongoing again')
      fetchBookings()
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to revoke malpractice', true)
    } finally {
      setBusyId(null)
    }
  }

  // Client-side name / reg-number search on top of the server-filtered set
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return bookings
    return bookings.filter(b =>
      String(b.student_name || '').toLowerCase().includes(q) ||
      String(b.reg_num || '').toLowerCase().includes(q)
    )
  }, [bookings, search])

  const clearFilters = () => { setVenueId(''); setDate(''); setSlotId(''); setSearch('') }
  const hasFilters = venueId || date || slotId || search

  const handleExport = () => {
    if (!filtered.length) return
    const csv = buildCsv(filtered)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bookings_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const selectStyle = {
    padding: '9px 12px', border: '1.5px solid #e5e4eb', borderRadius: 10,
    fontSize: 13, color: '#1a1a2e', outline: 'none', background: '#fff', fontFamily: font, minWidth: 150,
  }
  const th = { textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 800, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.4, whiteSpace: 'nowrap' }
  const td = { padding: '12px 14px', fontSize: 13, color: '#1a1a2e', borderTop: '1px solid #f0f2f8', whiteSpace: 'nowrap' }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f8', fontFamily: font }}>
      <Header showBack />

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 24px 48px' }}>
        {/* Title */}
        <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, flexShrink: 0, display: 'grid', placeItems: 'center', background: `linear-gradient(135deg, ${P}, #8b6dff)`, boxShadow: '0 6px 18px rgba(108,71,255,0.32)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1a1a2e', fontFamily: "'Outfit', sans-serif" }}>
              All Bookings
            </h1>
            <p style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
              Every student booking across all labs — with attendance, assessment result, and CSV export.
            </p>
          </div>
        </div>

        {/* Filter bar */}
        <div style={{ background: '#fff', border: '1px solid #e5e4eb', borderRadius: 16, padding: 16, marginBottom: 16, boxShadow: '0 1px 3px rgba(16,24,40,0.04)' }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={venueId} onChange={e => setVenueId(e.target.value)} style={selectStyle}>
              <option value="">All Labs</option>
              {venues.map(v => (
                <option key={v.venue_id} value={v.venue_id}>{v.venue_name}</option>
              ))}
            </select>

            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              style={{ ...selectStyle, minWidth: 160 }}
            />

            <select value={slotId} onChange={e => setSlotId(e.target.value)} style={selectStyle}>
              <option value="">All Slot Times</option>
              {slots.map(s => (
                <option key={s.slot_id} value={s.slot_id}>
                  {formatTime(s.start_time)} – {formatTime(s.end_time)}
                </option>
              ))}
            </select>

            {hasFilters && (
              <button
                onClick={clearFilters}
                style={{ padding: '9px 14px', border: '1.5px solid #e5e4eb', borderRadius: 10, background: '#fff', color: '#6b7280', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: font }}
              >
                Clear
              </button>
            )}

            <div style={{ flex: 1 }} />

            <button
              onClick={() => setShowBookModal(true)}
              style={{
                padding: '9px 18px', border: `1.5px solid ${P}`, borderRadius: 10,
                background: '#fff', color: P, fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: font,
              }}
            >
              ＋ Book for student
            </button>

            <button
              onClick={() => setShowBulkModal(true)}
              style={{
                padding: '9px 18px', border: `1.5px solid ${P}`, borderRadius: 10,
                background: '#fff', color: P, fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: font,
              }}
            >
              ☰ Bulk book
            </button>

            <button
              onClick={handleExport}
              disabled={!filtered.length}
              style={{
                padding: '9px 18px', border: 'none', borderRadius: 10,
                background: filtered.length ? P : '#c7c3e6', color: '#fff',
                fontSize: 13, fontWeight: 800, cursor: filtered.length ? 'pointer' : 'not-allowed',
                fontFamily: font, boxShadow: filtered.length ? '0 2px 10px rgba(108,71,255,0.3)' : 'none',
              }}
            >
              ⭳ Export CSV
            </button>
          </div>

          {/* Search + count */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 12, flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Search by student name or reg number..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ flex: 1, minWidth: 220, padding: '9px 14px', border: '1.5px solid #e5e4eb', borderRadius: 10, fontSize: 13, color: '#1a1a2e', outline: 'none', fontFamily: font }}
              onFocus={e => (e.target.style.borderColor = P)}
              onBlur={e => (e.target.style.borderColor = '#e5e4eb')}
            />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#6b7280' }}>
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Table */}
        <div style={{ background: '#fff', border: '1px solid #e5e4eb', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(16,24,40,0.04)' }}>
          {loading ? (
            <div style={{ padding: '48px 20px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Loading bookings...</div>
          ) : error ? (
            <div style={{ padding: '48px 20px', textAlign: 'center', color: '#ef4444', fontSize: 13 }}>{error}</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
              {bookings.length === 0 ? 'No bookings found for these filters.' : 'No bookings match your search.'}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#faf9ff' }}>
                    <th style={th}>Student</th>
                    <th style={th}>Reg No</th>
                    <th style={th}>Lab</th>
                    <th style={th}>Slot Time</th>
                    <th style={th}>Date</th>
                    <th style={th}>Faculty</th>
                    <th style={th}>Status</th>
                    <th style={th}>Attendance</th>
                    <th style={th}>Result</th>
                    <th style={th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((b, i) => (
                    <tr key={b.booking_id} style={{ background: i % 2 ? '#fbfaff' : '#fff' }}>
                      <td style={{ ...td, fontWeight: 700 }}>{b.student_name}</td>
                      <td style={{ ...td, fontFamily: 'monospace', color: '#6b7280' }}>{b.reg_num}</td>
                      <td style={td}>{b.venue_name}</td>
                      <td style={td}>{slotLabel(b)}</td>
                      <td style={td}>{b.booking_date}</td>
                      <td style={td}>{b.faculty_name || '—'}</td>
                      <td style={td}><StatusBadge status={b.booking_status} /></td>
                      <td style={td}><AttendanceBadge b={b} /></td>
                      <td style={td}><ResultBadge b={b} /></td>
                      <td style={td}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {b.booking_status === 'ONGOING' && (
                            <>
                              <button
                                onClick={() => handleCancel(b)}
                                disabled={cancellingId === b.booking_id}
                                style={{
                                  padding: '6px 12px', borderRadius: 8, border: '1.5px solid rgba(239,68,68,0.4)',
                                  background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: 12, fontWeight: 700,
                                  cursor: cancellingId === b.booking_id ? 'not-allowed' : 'pointer',
                                  opacity: cancellingId === b.booking_id ? 0.6 : 1, fontFamily: font, whiteSpace: 'nowrap',
                                }}
                              >
                                {cancellingId === b.booking_id ? 'Cancelling…' : 'Cancel'}
                              </button>
                              <button
                                onClick={() => handleMarkMal(b)}
                                disabled={busyId === b.booking_id}
                                title="Flag as malpractice (frees the seat)"
                                style={{
                                  padding: '6px 12px', borderRadius: 8, border: '1.5px solid rgba(239,68,68,0.4)',
                                  background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: 12, fontWeight: 700,
                                  cursor: busyId === b.booking_id ? 'not-allowed' : 'pointer',
                                  opacity: busyId === b.booking_id ? 0.6 : 1, fontFamily: font, whiteSpace: 'nowrap',
                                }}
                              >
                                Malpractice
                              </button>
                            </>
                          )}

                          {(b.booking_status === 'PASS' || b.booking_status === 'FAIL' || b.booking_status === 'COMPLETED') && (
                            <button
                              onClick={() => setOverrideBooking(b)}
                              title="Override the assessment result (does not change seat counts)"
                              style={{
                                padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${P}`,
                                background: 'rgba(108,71,255,0.08)', color: P, fontSize: 12, fontWeight: 700,
                                cursor: 'pointer', fontFamily: font, whiteSpace: 'nowrap',
                              }}
                            >
                              Override
                            </button>
                          )}

                          {b.booking_status === 'MALPRACTICE' && (
                            <button
                              onClick={() => handleRevokeMal(b)}
                              disabled={busyId === b.booking_id}
                              title="Revoke malpractice (re-claims a seat if available)"
                              style={{
                                padding: '6px 12px', borderRadius: 8, border: '1.5px solid rgba(5,150,105,0.4)',
                                background: 'rgba(16,185,129,0.08)', color: '#059669', fontSize: 12, fontWeight: 700,
                                cursor: busyId === b.booking_id ? 'not-allowed' : 'pointer',
                                opacity: busyId === b.booking_id ? 0.6 : 1, fontFamily: font, whiteSpace: 'nowrap',
                              }}
                            >
                              {busyId === b.booking_id ? 'Working…' : 'Revoke MP'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showBookModal && (
        <BookForStudentModal
          onClose={() => setShowBookModal(false)}
          onBooked={() => { showToast('Booking created'); fetchBookings() }}
        />
      )}

      {showBulkModal && (
        <BulkBookModal
          onClose={() => setShowBulkModal(false)}
          onBooked={() => fetchBookings()}
        />
      )}

      {overrideBooking && (
        <OverrideResultModal
          booking={overrideBooking}
          onClose={() => setOverrideBooking(null)}
          onSaved={() => fetchBookings()}
          showToast={showToast}
        />
      )}
    </div>
  )
}

// ── Override Result modal (Stage 6c) ────────────────────────────
// Admin picks the assessment outcome (Passed/Failed) + score for an already-
// submitted (terminal) booking. The booking status is re-derived server-side;
// seat counts are NOT affected by an override.
function OverrideResultModal({ booking, onClose, onSaved, showToast }) {
  const total = booking.assessment_total != null ? Number(booking.assessment_total) : null
  const [status, setStatus] = useState(booking.assessment_status === 'FAILED' ? 'FAILED' : 'PASSED')
  const [score, setScore] = useState(booking.assessment_score != null ? String(booking.assessment_score) : '')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    const s = Number(score)
    if (!Number.isInteger(s) || s < 0 || (total != null && s > total)) {
      showToast(`Score must be a whole number between 0 and ${total != null ? total : 'the total'}.`, true)
      return
    }
    setBusy(true)
    try {
      await adminService.overrideResult(booking.booking_id, { newStatus: status, newScore: s })
      showToast('Result overridden')
      onSaved()
      onClose()
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to override result', true)
    } finally {
      setBusy(false)
    }
  }

  const fieldLabel = { fontSize: 11, fontWeight: 800, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, display: 'block' }
  const inputStyle = { width: '100%', padding: '10px 12px', border: '1.5px solid #e5e4eb', borderRadius: 10, fontSize: 13, color: '#1a1a2e', outline: 'none', fontFamily: font, background: '#fff' }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(3px)' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 420, boxShadow: '0 24px 60px rgba(0,0,0,0.2)', fontFamily: font }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid #e5e4eb' }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: '#1a1a2e', margin: 0 }}>Override Result</h2>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid #e5e4eb', background: '#fff', color: '#9ca3af', fontSize: 16, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 13, color: '#4b5563' }}>
            <b>{booking.student_name}</b> · {booking.venue_name}
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
              Current: {RESULT_LABELS[booking.assessment_status] || booking.assessment_status || '—'} · booking {booking.booking_status}
            </div>
          </div>

          <div style={{ fontSize: 12, color: '#4b5563', background: 'rgba(108,71,255,0.06)', border: '1px solid rgba(108,71,255,0.18)', borderRadius: 10, padding: '10px 12px', lineHeight: 1.5 }}>
            The booking status is re-derived from the result. Seat counts are <b>not</b> affected by an override.
          </div>

          <div>
            <label style={fieldLabel}>New Result</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="PASSED">Passed</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>

          <div>
            <label style={fieldLabel}>Score{total != null ? ` (0–${total})` : ''}</label>
            <input type="number" min="0" max={total != null ? total : undefined} value={score} onChange={(e) => setScore(e.target.value)} style={inputStyle} />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 22px', borderTop: '1px solid #e5e4eb' }}>
          <button onClick={onClose} disabled={busy} style={{ padding: '10px 18px', borderRadius: 10, border: '1.5px solid #e5e4eb', background: '#fff', color: '#6b7280', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: font }}>Cancel</button>
          <button onClick={submit} disabled={busy} style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: P, color: '#fff', fontSize: 13, fontWeight: 800, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1, fontFamily: font }}>
            {busy ? 'Saving…' : 'Save Override'}
          </button>
        </div>
      </div>
    </div>
  )
}
