import { useState, useEffect, useMemo } from 'react'
import { adminService } from '../../../services/features/adminService'

const P = '#6c47ff'
const font = "'Plus Jakarta Sans', 'Outfit', system-ui, sans-serif"

const fmtTime = (t) => {
  if (!t) return ''
  const [h, m] = String(t).split(':')
  const hh = parseInt(h, 10)
  if (Number.isNaN(hh)) return String(t)
  return `${hh % 12 || 12}:${m} ${hh >= 12 ? 'PM' : 'AM'}`
}

const todayStr = () => {
  const n = new Date()
  const p = (x) => String(x).padStart(2, '0')
  return `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())}`
}

const labelStyle = { fontSize: 11, fontWeight: 800, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6, display: 'block' }
const fieldStyle = { width: '100%', padding: '10px 12px', border: '1.5px solid #e5e4eb', borderRadius: 10, fontSize: 13, color: '#1a1a2e', outline: 'none', background: '#fff', fontFamily: font }

const OUTCOME = {
  booked: { icon: '✅', bg: 'rgba(16,185,129,0.1)', color: '#059669' },
  skipped: { icon: '⚠️', bg: 'rgba(245,158,11,0.12)', color: '#b45309' },
  failed: { icon: '❌', bg: 'rgba(239,68,68,0.1)', color: '#ef4444' },
}

// Admin: bulk-book many students into ONE slot. Per-student transactions on the
// server — one student's failure never affects the others; the atomic guarded
// seat increment prevents oversell mid-batch.
export default function BulkBookModal({ onClose, onBooked }) {
  const [date, setDate] = useState(todayStr())
  const [slots, setSlots] = useState([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [venueSlotId, setVenueSlotId] = useState('')

  const [skills, setSkills] = useState([])
  const [skillId, setSkillId] = useState('')

  const [levels, setLevels] = useState([])
  const [levelId, setLevelId] = useState('')

  const [students, setStudents] = useState([])
  const [studentSearch, setStudentSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState(() => new Set())

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState(null)

  useEffect(() => {
    adminService.getStudents().then(r => setStudents(r.data || [])).catch(() => setStudents([]))
  }, [])

  useEffect(() => {
    setVenueSlotId(''); setSkills([]); setSkillId(''); setLevels([]); setLevelId(''); setError('')
    if (!date) { setSlots([]); return }
    let ignore = false
    setSlotsLoading(true)
    adminService.getAllVenueSlotsByDate(date)
      .then(r => { if (!ignore) setSlots((r.data?.slots || []).filter(s => Number(s.is_active) === 1)) })
      .catch(() => { if (!ignore) setSlots([]) })
      .finally(() => { if (!ignore) setSlotsLoading(false) })
    return () => { ignore = true }
  }, [date])

  const selectedSlot = useMemo(
    () => slots.find(s => String(s.venue_slot_id) === String(venueSlotId)) || null,
    [slots, venueSlotId]
  )

  useEffect(() => {
    setSkillId(''); setSkills([]); setLevels([]); setLevelId('')
    if (!selectedSlot) return
    let ignore = false
    adminService.getVenueSkills(selectedSlot.venue_id)
      .then(r => { if (!ignore) setSkills((r.data || []).filter(s => Number(s.is_active) === 1)) })
      .catch(() => { if (!ignore) setSkills([]) })
    return () => { ignore = true }
  }, [selectedSlot])

  useEffect(() => {
    setLevelId(''); setLevels([])
    if (!skillId) return
    let ignore = false
    adminService.getSkillLevels(skillId)
      .then(r => {
        if (ignore) return
        const lv = r.data || []
        setLevels(lv)
        if (lv.length === 1) setLevelId(String(lv[0].level_id))
      })
      .catch(() => { if (!ignore) setLevels([]) })
    return () => { ignore = true }
  }, [skillId])

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase()
    if (!q) return students
    return students.filter(s =>
      String(s.name || '').toLowerCase().includes(q) || String(s.reg_num || '').toLowerCase().includes(q)
    )
  }, [students, studentSearch])

  const toggle = (id) => {
    const key = String(id)
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  const allFilteredSelected = filteredStudents.length > 0 && filteredStudents.every(s => selectedIds.has(String(s.student_id)))
  const toggleSelectAll = () => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (allFilteredSelected) filteredStudents.forEach(s => next.delete(String(s.student_id)))
      else filteredStudents.forEach(s => next.add(String(s.student_id)))
      return next
    })
  }

  const needsLevel = levels.length > 0
  const canSubmit = selectedIds.size > 0 && !!venueSlotId && !!skillId && (!needsLevel || !!levelId) && !submitting

  const handleSubmit = async () => {
    setError('')
    if (!canSubmit) {
      if (needsLevel && !levelId) setError('Please select a level.')
      else if (selectedIds.size === 0) setError('Select at least one student.')
      else setError('Please complete all fields.')
      return
    }
    setSubmitting(true)
    try {
      const res = await adminService.bulkBook({
        studentIds: [...selectedIds].map(Number),
        venueSlotId,
        trainingSkillId: skillId,
        levelId: levelId || null,
      })
      setResults(res.data || { summary: { booked: 0, skipped: 0, failed: 0 }, results: [] })
      onBooked() // refresh the bookings table in the background
    } catch (err) {
      setError(err?.response?.data?.message || 'Bulk booking failed.')
    } finally {
      setSubmitting(false)
    }
  }

  const summary = results?.summary || { booked: 0, skipped: 0, failed: 0 }

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', overflowY: 'auto', fontFamily: font }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 560, boxShadow: '0 24px 60px rgba(0,0,0,0.25)' }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1a1a2e', fontFamily: "'Outfit', sans-serif" }}>Bulk Book Students</h2>
            <p style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Book many students into one slot — each is processed independently.</p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid #e5e4eb', background: '#fff', color: '#6b7280', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        {/* Body */}
        {!results ? (
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={labelStyle}>Session Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={fieldStyle} />
            </div>

            <div>
              <label style={labelStyle}>Slot</label>
              <select value={venueSlotId} onChange={e => setVenueSlotId(e.target.value)} style={fieldStyle} disabled={slotsLoading}>
                <option value="">{slotsLoading ? 'Loading slots…' : (slots.length ? 'Select a slot…' : 'No active slots for this date')}</option>
                {slots.map(s => {
                  const seats = Math.max(0, Number(s.capacity || 0) - Number(s.current_bookings || 0))
                  return (
                    <option key={s.venue_slot_id} value={String(s.venue_slot_id)}>
                      {s.venue_name} · {fmtTime(s.start_time)}–{fmtTime(s.end_time)} · {seats} seat{seats !== 1 ? 's' : ''} left
                    </option>
                  )
                })}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Skill</label>
              <select value={skillId} onChange={e => setSkillId(e.target.value)} style={fieldStyle} disabled={!selectedSlot}>
                <option value="">{!selectedSlot ? 'Pick a slot first' : (skills.length ? 'Select a skill…' : 'This venue offers no active skills')}</option>
                {skills.map(s => (
                  <option key={s.training_skill_id} value={String(s.training_skill_id)}>{s.skill_name} ({s.skill_type})</option>
                ))}
              </select>
            </div>

            {needsLevel && (
              <div>
                <label style={labelStyle}>Level</label>
                <select value={levelId} onChange={e => setLevelId(e.target.value)} style={fieldStyle}>
                  <option value="">Select a level…</option>
                  {levels.map(l => (
                    <option key={l.level_id} value={String(l.level_id)}>
                      {l.level_name}{l.core_concept ? ` — ${l.core_concept}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Multi-select students */}
            <div>
              <label style={labelStyle}>Students ({selectedIds.size} selected)</label>
              <input
                type="text"
                placeholder="Search by name or reg number…"
                value={studentSearch}
                onChange={e => setStudentSearch(e.target.value)}
                style={{ ...fieldStyle, marginBottom: 8 }}
              />
              <div style={{ border: '1.5px solid #e5e4eb', borderRadius: 10, maxHeight: 220, overflowY: 'auto' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: '1px solid #f0f2f8', cursor: 'pointer', fontSize: 12, fontWeight: 800, color: P, background: '#faf9ff' }}>
                  <input type="checkbox" checked={allFilteredSelected} onChange={toggleSelectAll} />
                  Select all{studentSearch ? ' (filtered)' : ''} ({filteredStudents.length})
                </label>
                {filteredStudents.length === 0 ? (
                  <div style={{ padding: 12, fontSize: 13, color: '#9ca3af', textAlign: 'center' }}>No students.</div>
                ) : filteredStudents.map(s => (
                  <label key={s.student_id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: '1px solid #f6f6fb', cursor: 'pointer', fontSize: 13 }}>
                    <input type="checkbox" checked={selectedIds.has(String(s.student_id))} onChange={() => toggle(s.student_id)} />
                    <span style={{ fontWeight: 700, color: '#1a1a2e' }}>{s.name}</span>
                    <span style={{ fontFamily: 'monospace', color: '#6b7280', fontSize: 12 }}>{s.reg_num}</span>
                  </label>
                ))}
              </div>
            </div>

            {error && (
              <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 13, fontWeight: 600 }}>
                {error}
              </div>
            )}
          </div>
        ) : (
          /* Result panel */
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ ...OUTCOME.booked, padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 800 }}>✅ {summary.booked} booked</span>
              <span style={{ ...OUTCOME.skipped, padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 800 }}>⚠️ {summary.skipped} skipped</span>
              <span style={{ ...OUTCOME.failed, padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 800 }}>❌ {summary.failed} failed</span>
            </div>
            <div style={{ border: '1.5px solid #e5e4eb', borderRadius: 10, maxHeight: 320, overflowY: 'auto' }}>
              {(results.results || []).map((r, i) => {
                const o = OUTCOME[r.outcome] || OUTCOME.failed
                return (
                  <div key={r.studentId ?? i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderBottom: '1px solid #f6f6fb' }}>
                    <span style={{ fontSize: 14 }}>{o.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e' }}>
                        {r.name || `Student #${r.studentId}`} {r.regNum ? <span style={{ fontFamily: 'monospace', color: '#6b7280', fontWeight: 500 }}>{r.regNum}</span> : null}
                      </div>
                      {r.reason && <div style={{ fontSize: 12, color: o.color }}>{r.reason}</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          {!results ? (
            <>
              <button onClick={onClose} style={{ padding: '10px 18px', borderRadius: 10, border: '1.5px solid #e5e4eb', background: '#fff', color: '#6b7280', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: font }}>
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                style={{
                  padding: '10px 22px', borderRadius: 10, border: 'none',
                  background: canSubmit ? P : '#c7c3e6', color: '#fff', fontSize: 13, fontWeight: 800,
                  cursor: canSubmit ? 'pointer' : 'not-allowed', fontFamily: font,
                  boxShadow: canSubmit ? '0 2px 10px rgba(108,71,255,0.3)' : 'none',
                }}
              >
                {submitting ? 'Booking…' : `Book ${selectedIds.size || ''} student${selectedIds.size === 1 ? '' : 's'}`}
              </button>
            </>
          ) : (
            <button onClick={onClose} style={{ padding: '10px 22px', borderRadius: 10, border: 'none', background: P, color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: font }}>
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
