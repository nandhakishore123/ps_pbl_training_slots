import { useState, useEffect, useMemo, useCallback } from 'react'
import { adminService } from '../../../services/features/adminService'
import Header from '../layout/Header'

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
  const [venues, setVenues] = useState([])
  const [slots, setSlots] = useState([])

  const [venueId, setVenueId] = useState('')
  const [date, setDate] = useState('')
  const [slotId, setSlotId] = useState('')

  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

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
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1a1a2e', fontFamily: "'Outfit', sans-serif" }}>
            All Bookings
          </h1>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
            Every student booking across all labs — with attendance, assessment result, and CSV export.
          </p>
        </div>

        {/* Filter bar */}
        <div style={{ background: '#fff', border: '1px solid #e5e4eb', borderRadius: 16, padding: 16, marginBottom: 16 }}>
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
        <div style={{ background: '#fff', border: '1px solid #e5e4eb', borderRadius: 16, overflow: 'hidden' }}>
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
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(b => (
                    <tr key={b.booking_id}>
                      <td style={{ ...td, fontWeight: 700 }}>{b.student_name}</td>
                      <td style={{ ...td, fontFamily: 'monospace', color: '#6b7280' }}>{b.reg_num}</td>
                      <td style={td}>{b.venue_name}</td>
                      <td style={td}>{slotLabel(b)}</td>
                      <td style={td}>{b.booking_date}</td>
                      <td style={td}>{b.faculty_name || '—'}</td>
                      <td style={td}><StatusBadge status={b.booking_status} /></td>
                      <td style={td}><AttendanceBadge b={b} /></td>
                      <td style={td}><ResultBadge b={b} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
