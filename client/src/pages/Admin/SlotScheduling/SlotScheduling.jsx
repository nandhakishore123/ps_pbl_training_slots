import { useEffect, useState, useCallback } from 'react'
import styles from './SlotScheduling.module.css'
import Header from '../Header/Header'
import BookingOpenTimeCard from '../../../components/admin/BookingOpenTimeCard'
import { useData } from '../context/DataContext'
import { useApp } from '../context/AppContext'

// ── Date helpers (plain calendar dates via UTC accessors — no TZ drift) ──────
const WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MO = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December']
const MO_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const pad2 = (n) => String(n).padStart(2, '0')
const toYMD = (dt) => `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`
const parseYMD = (s) => {
  const [y, m, d] = String(s).split('-').map(Number)
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1))
}
const addDays = (dt, n) => new Date(dt.getTime() + n * 86400000)

// "Thursday, June 18"
const fmtPretty = (ymd) => {
  if (!ymd) return ''
  const dt = parseYMD(ymd)
  return `${WD[dt.getUTCDay()]}, ${MO[dt.getUTCMonth()]} ${dt.getUTCDate()}`
}

// "Jun 18"
const fmtShort = (ymd) => {
  if (!ymd) return ''
  const dt = parseYMD(ymd)
  return `${MO_SHORT[dt.getUTCMonth()]} ${dt.getUTCDate()}`
}

// Client fallback ONLY if the backend's nextBookingDate is unavailable: today+1,
// skip Sunday (mirrors the booking-window rule). The backend value is authoritative.
const nextBookingDayFallback = () => {
  const now = new Date()
  let dt = addDays(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())), 1)
  if (dt.getUTCDay() === 0) dt = addDays(dt, 1)
  return toYMD(dt)
}

// Client fallback for "today" if the backend's IST date isn't loaded yet. The
// backend's config.today (IST) is authoritative.
const clientTodayFallback = () => {
  const now = new Date()
  return toYMD(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())))
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

// ── Per-venue card ───────────────────────────────────────────────────────────
function VenueSlotCard({ venue, mappings, slots, date, onChanged }) {
  const { createVenueSlot, updateVenueSlot, setVenueSlotActive } = useData()
  const { showToast } = useApp()

  const [mappingId, setMappingId] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [busy, setBusy] = useState(false)

  const [editingId, setEditingId] = useState(null)
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')

  // One option per faculty (dedupe by faculty_id); value = that faculty's mapping_id.
  const facultyOptions = []
  const seenFaculty = new Set()
  for (const m of mappings) {
    const key = m.faculty_id ?? `m${m.mapping_id}`
    if (seenFaculty.has(key)) continue
    seenFaculty.add(key)
    const name = m.faculty_name || 'Unassigned'
    facultyOptions.push({
      mappingId: m.mapping_id,
      label: m.faculty_reg_num ? `${name} · ${m.faculty_reg_num}` : name,
    })
  }
  const hasMappings = facultyOptions.length > 0

  const facLabel = (s) => s.faculty_name || 'Unassigned'

  const handleAdd = async () => {
    if (!mappingId || !startTime || !endTime) {
      showToast('Pick a faculty, start and end time', true)
      return
    }
    if (startTime >= endTime) {
      showToast('End time must be after start time', true)
      return
    }
    setBusy(true)
    const ok = await createVenueSlot(venue.venue_id, {
      mappingId,
      slotDate: date,
      startTime: startTime + ':00',
      endTime: endTime + ':00',
    })
    setBusy(false)
    if (ok) {
      showToast('Slot added')
      setStartTime('')
      setEndTime('')
      onChanged()
    }
  }

  const startEdit = (s) => {
    setEditingId(s.venue_slot_id)
    setEditStart(toHHMM(s.start_time))
    setEditEnd(toHHMM(s.end_time))
  }

  const handleSaveEdit = async (s) => {
    if (!editStart || !editEnd) {
      showToast('Start and end are required', true)
      return
    }
    if (editStart >= editEnd) {
      showToast('End time must be after start time', true)
      return
    }
    setBusy(true)
    const ok = await updateVenueSlot(s.venue_slot_id, {
      slotDate: date,
      startTime: editStart + ':00',
      endTime: editEnd + ':00',
    })
    setBusy(false)
    if (ok) {
      showToast('Slot updated')
      setEditingId(null)
      onChanged()
    }
  }

  const handleToggle = async (s) => {
    const next = Number(s.is_active) === 1 ? false : true
    setBusy(true)
    const ok = await setVenueSlotActive(s.venue_slot_id, next)
    setBusy(false)
    if (ok) {
      showToast(next ? 'Slot opened' : 'Slot closed')
      onChanged()
    }
  }

  // Remove = Close (deactivate, recoverable). No delete endpoint.
  const handleRemove = async (s) => {
    if (Number(s.is_active) !== 1) return
    const ok = window.confirm('Remove this slot? It will be closed for students (recoverable via Open).')
    if (!ok) return
    setBusy(true)
    const done = await setVenueSlotActive(s.venue_slot_id, false)
    setBusy(false)
    if (done) {
      showToast('Slot removed (closed)')
      onChanged()
    }
  }

  return (
    <div className={styles.venueCard}>
      <div className={styles.venueHead}>
        <div>
          <div className={styles.venueName}>{venue.venue_name}</div>
          <div className={styles.venueMeta}>
            {venue.location || 'No location'} · Capacity {venue.capacity ?? '—'}
          </div>
        </div>
        <div className={styles.facChips}>
          {facultyOptions.length > 0
            ? facultyOptions.map((f) => (
                <span key={f.mappingId} className={styles.facChip}>{f.label}</span>
              ))
            : <span className={styles.facChip} style={{ background: 'rgba(245,158,11,0.12)', color: '#92400e', borderColor: 'rgba(245,158,11,0.3)' }}>No faculty</span>}
        </div>
      </div>

      <div className={styles.venueBody}>
        {!hasMappings ? (
          <div className={styles.warn}>
            Assign a faculty in Faculty Allocation first — then you can schedule slots for this lab.
          </div>
        ) : (
          <div className={styles.addRow}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Faculty</label>
              <select className={styles.select} value={mappingId} onChange={(e) => setMappingId(e.target.value)}>
                <option value="">Select faculty…</option>
                {facultyOptions.map((f) => (
                  <option key={f.mappingId} value={f.mappingId}>{f.label}</option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Start</label>
              <input type="time" className={styles.input} value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>End</label>
              <input type="time" className={styles.input} value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
            <button className={styles.addBtn} onClick={handleAdd} disabled={busy}>+ Add slot</button>
          </div>
        )}

        <div className={styles.slotList}>
          {slots.length > 0 ? (
            slots.map((s) => {
              const active = Number(s.is_active) === 1
              const editing = editingId === s.venue_slot_id
              return (
                <div key={s.venue_slot_id} className={styles.slotRow} style={active ? undefined : { opacity: 0.6 }}>
                  {editing ? (
                    <div className={styles.editRow}>
                      <input type="time" className={styles.input} value={editStart} onChange={(e) => setEditStart(e.target.value)} />
                      <input type="time" className={styles.input} value={editEnd} onChange={(e) => setEditEnd(e.target.value)} />
                      <button className={styles.smallBtn} onClick={() => handleSaveEdit(s)} disabled={busy}>Save</button>
                      <button className={styles.smallBtn} onClick={() => setEditingId(null)} disabled={busy}>Cancel</button>
                    </div>
                  ) : (
                    <>
                      <div className={styles.slotInfo}>
                        <span className={styles.slotTime}>{fmtShort(s.slot_date)} · {fmtTime(s.start_time)}–{fmtTime(s.end_time)}</span>
                        <span className={styles.slotFac}>{facLabel(s)}</span>
                        <span className={styles.seats}>{Number(s.current_bookings) || 0} booked</span>
                        <span className={active ? styles.badgeOpen : styles.badgeClosed}>{active ? 'Open' : 'Closed'}</span>
                      </div>
                      <div className={styles.rowActions}>
                        <button className={styles.smallBtn} onClick={() => startEdit(s)} disabled={busy}>Edit</button>
                        <button className={styles.smallBtn} onClick={() => handleToggle(s)} disabled={busy}>{active ? 'Close' : 'Open'}</button>
                        <button className={`${styles.smallBtn} ${styles.dangerBtn}`} onClick={() => handleRemove(s)} disabled={busy || !active}>Remove</button>
                      </div>
                    </>
                  )}
                </div>
              )
            })
          ) : (
            <div className={styles.empty}>No slots scheduled for this lab on {fmtPretty(date)}.</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function SlotScheduling() {
  const { venues, bookingWindow, getAllVenueSlots } = useData()

  // Admin-selectable session date. Defaults ONCE to Tomorrow (the backend's
  // nextBookingDate — same date students target) when config first loads, but the
  // admin can switch to Today or any date. Stage A: admin-side only; the student
  // read-path is unchanged (students still see the single next day until Stage B).
  const [date, setDate] = useState('')

  useEffect(() => {
    if (date) return
    if (bookingWindow) setDate(bookingWindow.nextBookingDate || nextBookingDayFallback())
  }, [bookingWindow, date])

  // Today / Tomorrow targets (IST today from the backend; calendar +1 for Tomorrow).
  const todayDate = bookingWindow?.today || clientTodayFallback()
  const tomorrowDate = toYMD(addDays(parseYMD(todayDate), 1))

  const [slots, setSlots] = useState([])
  const [mappings, setMappings] = useState([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!date) return
    setLoading(true)
    const data = await getAllVenueSlots(date)
    setSlots(Array.isArray(data.slots) ? data.slots : [])
    setMappings(Array.isArray(data.mappings) ? data.mappings : [])
    setLoading(false)
  }, [date, getAllVenueSlots])

  useEffect(() => {
    load()
  }, [load])

  // Group loaded data by venue_id for O(1) lookups per card.
  const slotsByVenue = new Map()
  for (const s of slots) {
    const k = s.venue_id
    if (!slotsByVenue.has(k)) slotsByVenue.set(k, [])
    slotsByVenue.get(k).push(s)
  }
  const mappingsByVenue = new Map()
  for (const m of mappings) {
    const k = m.venue_id
    if (!mappingsByVenue.has(k)) mappingsByVenue.set(k, [])
    mappingsByVenue.get(k).push(m)
  }

  // Day summary
  const labsCount = venues.length
  const slotsCount = slots.length
  const openCount = slots.filter((s) => Number(s.is_active) === 1).length
  const closedCount = slotsCount - openCount

  const bookingOpenLabel = bookingWindow
    ? fmtTime(`${pad2(bookingWindow.openHour)}:${pad2(bookingWindow.openMinute)}`)
    : '7:45 PM'

  return (
    <div className={styles.page}>
      <Header showBack />

      <div className={styles.content}>
        <div className={styles.pageTitle}>Slot Scheduling</div>
        <div className={styles.pageSub}>
          Pick a session date and set up its bookable slots — times, faculty &amp; booking-open, all in one place.
        </div>

        {/* TOP ROW */}
        <div className={styles.topRow}>
          <div className={`${styles.card} ${styles.dateBanner}`}>
            <div className={styles.cardLabel}>Setting up slots for</div>
            <div className={styles.dateBig}>{fmtPretty(date)}</div>
            <div className={styles.dateControls}>
              <button
                className={`${styles.quickBtn} ${date === todayDate ? styles.quickBtnActive : ''}`}
                onClick={() => setDate(todayDate)}
              >
                Today
              </button>
              <button
                className={`${styles.quickBtn} ${date === tomorrowDate ? styles.quickBtnActive : ''}`}
                onClick={() => setDate(tomorrowDate)}
              >
                Tomorrow
              </button>
              <input
                type="date"
                className={styles.dateInput}
                value={date}
                min={todayDate}
                onChange={(e) => e.target.value && setDate(e.target.value)}
              />
            </div>
            <div className={styles.statusLine}>
              These slots open for students at <strong>{bookingOpenLabel}</strong> and stay bookable until each
              slot&apos;s start time.
            </div>
          </div>

          <div className={styles.card}>
            <BookingOpenTimeCard />
          </div>
        </div>

        {/* DAY SUMMARY */}
        <div className={styles.summary}>
          <span className={styles.chip}><b>{labsCount}</b>&nbsp;labs</span>
          <span className={styles.chip}><b>{slotsCount}</b>&nbsp;slots scheduled</span>
          <span className={`${styles.chip} ${styles.chipOpen}`}><b>{openCount}</b>&nbsp;open</span>
          <span className={`${styles.chip} ${styles.chipClosed}`}><b>{closedCount}</b>&nbsp;closed</span>
        </div>

        {/* VENUE LIST */}
        {loading ? (
          <div className={styles.empty}>Loading slots…</div>
        ) : venues.length > 0 ? (
          <div className={styles.venueList}>
            {venues.map((v) => (
              <VenueSlotCard
                key={v.venue_id}
                venue={v}
                mappings={mappingsByVenue.get(v.venue_id) || []}
                slots={slotsByVenue.get(v.venue_id) || []}
                date={date}
                onChanged={load}
              />
            ))}
          </div>
        ) : (
          <div className={styles.empty}>No active venues. Create a venue in Venue Allocation first.</div>
        )}
      </div>
    </div>
  )
}
