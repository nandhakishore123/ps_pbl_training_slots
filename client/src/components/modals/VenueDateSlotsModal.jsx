import { useEffect, useState } from 'react'
import styles from './VenueDateSlotsModal.module.css'
import { useData } from '../../pages/Admin/context/DataContext'
import { useApp } from '../../pages/Admin/context/AppContext'

const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// 'YYYY-MM-DD' → 'Wed Jun 18' (parsed as a plain calendar date; no tz drift)
const fmtDate = (d) => {
  if (!d) return ''
  const [y, m, day] = String(d).split('-').map(Number)
  if (!y || !m || !day) return String(d)
  const dt = new Date(Date.UTC(y, m - 1, day))
  return `${WD[dt.getUTCDay()]} ${MO[m - 1]} ${day}`
}

// 'HH:MM[:SS]' → '8:30 AM'
const fmtTime = (t) => {
  if (!t) return ''
  const [h, m] = String(t).split(':')
  const hh = parseInt(h, 10)
  if (Number.isNaN(hh)) return String(t)
  return `${hh % 12 || 12}:${m} ${hh >= 12 ? 'PM' : 'AM'}`
}

const toHHMM = (t) => (t ? String(t).slice(0, 5) : '')

export default function VenueDateSlotsModal({ isOpen, onClose, venue }) {
  const { getVenueSlots, createVenueSlot, updateVenueSlot, setVenueSlotActive } = useData()
  const { showToast } = useApp()

  const [slots, setSlots] = useState([])
  const [mappings, setMappings] = useState([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)

  // new-slot form
  const [mappingId, setMappingId] = useState('')
  const [slotDate, setSlotDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')

  // inline edit
  const [editingId, setEditingId] = useState(null)
  const [editDate, setEditDate] = useState('')
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')

  const load = async () => {
    if (!venue) return
    setLoading(true)
    const data = await getVenueSlots(venue.venue_id)
    setSlots(Array.isArray(data.slots) ? data.slots : [])
    setMappings(Array.isArray(data.mappings) ? data.mappings : [])
    setLoading(false)
  }

  useEffect(() => {
    if (isOpen && venue) {
      setMappingId('')
      setSlotDate('')
      setStartTime('')
      setEndTime('')
      setEditingId(null)
      load()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, venue])

  if (!isOpen || !venue) return null

  const mappingLabel = (m) => {
    const fac = m.faculty_name || 'Unassigned'
    const time = m.start_time ? ` · ${fmtTime(m.start_time)}–${fmtTime(m.end_time)}` : ''
    return `${fac}${time}`
  }

  const handleAdd = async () => {
    if (!mappingId || !slotDate || !startTime || !endTime) {
      showToast('Pick a faculty, date, start and end time', true)
      return
    }
    if (startTime >= endTime) {
      showToast('End time must be after start time', true)
      return
    }
    setBusy(true)
    const ok = await createVenueSlot(venue.venue_id, {
      mappingId,
      slotDate,
      startTime: startTime + ':00',
      endTime: endTime + ':00',
    })
    setBusy(false)
    if (ok) {
      showToast('Slot added')
      setStartTime('')
      setEndTime('')
      await load()
    }
  }

  const startEdit = (s) => {
    setEditingId(s.venue_slot_id)
    setEditDate(s.slot_date)
    setEditStart(toHHMM(s.start_time))
    setEditEnd(toHHMM(s.end_time))
  }

  const cancelEdit = () => setEditingId(null)

  const handleSaveEdit = async (venueSlotId) => {
    if (!editDate || !editStart || !editEnd) {
      showToast('Date, start and end are required', true)
      return
    }
    if (editStart >= editEnd) {
      showToast('End time must be after start time', true)
      return
    }
    setBusy(true)
    const ok = await updateVenueSlot(venueSlotId, {
      slotDate: editDate,
      startTime: editStart + ':00',
      endTime: editEnd + ':00',
    })
    setBusy(false)
    if (ok) {
      showToast('Slot updated')
      setEditingId(null)
      await load()
    }
  }

  const handleToggle = async (s) => {
    const next = Number(s.is_active) === 1 ? false : true
    setBusy(true)
    const ok = await setVenueSlotActive(s.venue_slot_id, next)
    setBusy(false)
    if (ok) {
      showToast(next ? 'Slot opened' : 'Slot closed')
      await load()
    }
  }

  const hasMappings = mappings.length > 0

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Manage Slots — {venue.venue_name}</h2>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div className={styles.content}>
          <div className={styles.note}>
            Per-date slots for this lab. (Stage 3a: admin-authored — these do not affect student booking yet.)
          </div>

          {!hasMappings ? (
            <div className={styles.warn}>
              This venue has no faculty assigned. Assign a faculty to this venue (Faculty Allocation)
              before adding dated slots.
            </div>
          ) : (
            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label>Faculty (mapping)</label>
                <select className={styles.select} value={mappingId} onChange={(e) => setMappingId(e.target.value)}>
                  <option value="">Select faculty…</option>
                  {mappings.map((m) => (
                    <option key={m.mapping_id} value={m.mapping_id}>{mappingLabel(m)}</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label>Date</label>
                <input type="date" className={styles.input} value={slotDate} onChange={(e) => setSlotDate(e.target.value)} />
              </div>
              <div className={styles.field}>
                <label>Start</label>
                <input type="time" className={styles.input} value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div className={styles.field}>
                <label>End</label>
                <input type="time" className={styles.input} value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
              <button className={styles.addBtn} onClick={handleAdd} disabled={busy}>+ Add Slot</button>
            </div>
          )}

          {/* LIST */}
          <div className={styles.list}>
            {loading ? (
              <div className={styles.empty}>Loading slots…</div>
            ) : slots.length > 0 ? (
              slots.map((s) => {
                const active = Number(s.is_active) === 1
                const editing = editingId === s.venue_slot_id
                return (
                  <div key={s.venue_slot_id} className={styles.row} style={active ? undefined : { opacity: 0.6 }}>
                    {editing ? (
                      <div className={styles.editRow}>
                        <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
                        <input type="time" value={editStart} onChange={(e) => setEditStart(e.target.value)} />
                        <input type="time" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} />
                        <button onClick={() => handleSaveEdit(s.venue_slot_id)} disabled={busy}>Save</button>
                        <button onClick={cancelEdit} disabled={busy}>Cancel</button>
                      </div>
                    ) : (
                      <>
                        <div className={styles.rowInfo}>
                          <span className={styles.dateTxt}>{fmtDate(s.slot_date)}</span>
                          <span className={styles.timeTxt}>{fmtTime(s.start_time)}–{fmtTime(s.end_time)}</span>
                          <span className={styles.facTxt}>{s.faculty_name || 'Unassigned'}</span>
                          <span className={active ? styles.badgeOpen : styles.badgeClosed}>
                            {active ? 'Open' : 'Closed'}
                          </span>
                        </div>
                        <div className={styles.rowActions}>
                          <button onClick={() => startEdit(s)} disabled={busy}>Edit</button>
                          <button onClick={() => handleToggle(s)} disabled={busy}>{active ? 'Close' : 'Open'}</button>
                        </div>
                      </>
                    )}
                  </div>
                )
              })
            ) : (
              <div className={styles.empty}>No dated slots yet for this lab.</div>
            )}
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.btnCancel} onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}
