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

// Admin: book a slot for a student. Pick date → slot → skill → (level) → student.
// Reuses existing admin read endpoints; the booking itself goes through the
// guarded POST /admin/bookings (atomic seat claim, all student guards enforced).
export default function BookForStudentModal({ onClose, onBooked }) {
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
  const [studentId, setStudentId] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Students load once.
  useEffect(() => {
    adminService.getStudents().then(r => setStudents(r.data || [])).catch(() => setStudents([]))
  }, [])

  // Slots reload on date change (active slots only); reset downstream selections.
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

  // Slot → that venue's active skills.
  useEffect(() => {
    setSkillId(''); setSkills([]); setLevels([]); setLevelId('')
    if (!selectedSlot) return
    let ignore = false
    adminService.getVenueSkills(selectedSlot.venue_id)
      .then(r => { if (!ignore) setSkills((r.data || []).filter(s => Number(s.is_active) === 1)) })
      .catch(() => { if (!ignore) setSkills([]) })
    return () => { ignore = true }
  }, [selectedSlot])

  // Skill → levels (auto-select when there's exactly one).
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
    const base = q
      ? students.filter(s => String(s.name || '').toLowerCase().includes(q) || String(s.reg_num || '').toLowerCase().includes(q))
      : students
    return base.slice(0, 100)
  }, [students, studentSearch])

  const needsLevel = levels.length > 0
  const canBook = !!studentId && !!venueSlotId && !!skillId && (!needsLevel || !!levelId) && !submitting

  const handleBook = async () => {
    setError('')
    if (!canBook) {
      if (needsLevel && !levelId) setError('Please select a level.')
      else setError('Please complete all fields.')
      return
    }
    setSubmitting(true)
    try {
      await adminService.bookForStudent({
        studentId,
        venueSlotId,
        trainingSkillId: skillId,
        levelId: levelId || null,
      })
      onBooked()
      onClose()
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to create booking.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', overflowY: 'auto', fontFamily: font }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 520, boxShadow: '0 24px 60px rgba(0,0,0,0.25)' }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1a1a2e', fontFamily: "'Outfit', sans-serif" }}>Book for a Student</h2>
            <p style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Admin booking — bypasses the daily open-time gate; all other rules still apply.</p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid #e5e4eb', background: '#fff', color: '#6b7280', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Date */}
          <div>
            <label style={labelStyle}>Session Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={fieldStyle} />
          </div>

          {/* Slot */}
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

          {/* Skill */}
          <div>
            <label style={labelStyle}>Skill</label>
            <select value={skillId} onChange={e => setSkillId(e.target.value)} style={fieldStyle} disabled={!selectedSlot}>
              <option value="">{!selectedSlot ? 'Pick a slot first' : (skills.length ? 'Select a skill…' : 'This venue offers no active skills')}</option>
              {skills.map(s => (
                <option key={s.training_skill_id} value={String(s.training_skill_id)}>
                  {s.skill_name} ({s.skill_type})
                </option>
              ))}
            </select>
          </div>

          {/* Level (only when the skill has levels) */}
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

          {/* Student */}
          <div>
            <label style={labelStyle}>Student</label>
            <input
              type="text"
              placeholder="Search by name or reg number…"
              value={studentSearch}
              onChange={e => setStudentSearch(e.target.value)}
              style={{ ...fieldStyle, marginBottom: 8 }}
            />
            <select value={studentId} onChange={e => setStudentId(e.target.value)} style={fieldStyle} size={1}>
              <option value="">Select a student…</option>
              {filteredStudents.map(s => (
                <option key={s.student_id} value={String(s.student_id)}>
                  {s.name} ({s.reg_num})
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 13, fontWeight: 600 }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={{ padding: '10px 18px', borderRadius: 10, border: '1.5px solid #e5e4eb', background: '#fff', color: '#6b7280', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: font }}>
            Cancel
          </button>
          <button
            onClick={handleBook}
            disabled={!canBook}
            style={{
              padding: '10px 22px', borderRadius: 10, border: 'none',
              background: canBook ? P : '#c7c3e6', color: '#fff', fontSize: 13, fontWeight: 800,
              cursor: canBook ? 'pointer' : 'not-allowed', fontFamily: font,
              boxShadow: canBook ? '0 2px 10px rgba(108,71,255,0.3)' : 'none',
            }}
          >
            {submitting ? 'Booking…' : 'Book Slot'}
          </button>
        </div>
      </div>
    </div>
  )
}
