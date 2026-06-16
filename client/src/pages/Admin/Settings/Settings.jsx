import { useState } from 'react'
import styles from './Settings.module.css'
import Header from '../Header/Header'
import { useData } from '../context/DataContext'
import { useApp } from '../context/AppContext'

export default function Settings() {
  const { showToast } = useApp()
  const { allSlotTimings, addSlotTiming, updateSlotTiming, setSlotActive, trainingSkills, loading,
          bookingWindow, updateBookingWindowConfig } = useData()

  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Inline slot edit + open/close
  const [editingSlotId, setEditingSlotId] = useState(null)
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')
  const [rowBusy, setRowBusy] = useState(false)

  // Booking-open time
  const [editingWindow, setEditingWindow] = useState(false)
  const [windowTime, setWindowTime] = useState('')
  const [windowSaving, setWindowSaving] = useState(false)

  const toHHMM = (t) => (t ? String(t).slice(0, 5) : '')
  const pad2 = (n) => String(n).padStart(2, '0')
  const windowHHMM = bookingWindow ? `${pad2(bookingWindow.openHour)}:${pad2(bookingWindow.openMinute)}` : null

  const handleAddSlot = async () => {
    if (!startTime || !endTime) {
      showToast('Please select both start and end times', true)
      return
    }
    if (startTime >= endTime) {
      showToast('End time must be after start time', true)
      return
    }

    setIsSubmitting(true)
    const success = await addSlotTiming(startTime + ':00', endTime + ':00')
    setIsSubmitting(false)

    if (success) {
      showToast('Slot timing added successfully')
      setStartTime('')
      setEndTime('')
    }
  }

  const startEdit = (st) => {
    setEditingSlotId(st.slot_id)
    setEditStart(toHHMM(st.start_time))
    setEditEnd(toHHMM(st.end_time))
  }

  const cancelEdit = () => {
    setEditingSlotId(null)
    setEditStart('')
    setEditEnd('')
  }

  const handleSaveEdit = async (slotId) => {
    if (!editStart || !editEnd) {
      showToast('Please set both start and end times', true)
      return
    }
    if (editStart >= editEnd) {
      showToast('End time must be after start time', true)
      return
    }
    setRowBusy(true)
    let res = await updateSlotTiming(slotId, editStart + ':00', editEnd + ':00')
    // Slot has existing bookings → backend asks for confirmation; retry with force.
    if (res && res.requiresConfirmation) {
      setRowBusy(false)
      if (window.confirm(`${res.message}\n\nProceed?`)) {
        setRowBusy(true)
        res = await updateSlotTiming(slotId, editStart + ':00', editEnd + ':00', true)
        setRowBusy(false)
        if (res === true) { showToast('Slot timing updated'); cancelEdit() }
      }
      return
    }
    setRowBusy(false)
    if (res === true) { showToast('Slot timing updated'); cancelEdit() }
  }

  const handleToggleActive = async (st) => {
    const next = Number(st.is_active) === 1 ? false : true
    setRowBusy(true)
    const ok = await setSlotActive(st.slot_id, next)
    setRowBusy(false)
    if (ok) showToast(next ? 'Slot opened' : 'Slot closed')
  }

  // ── Booking open time ───────────────────────────────────────
  const startEditWindow = () => {
    setWindowTime(windowHHMM || '19:45')
    setEditingWindow(true)
  }

  const cancelEditWindow = () => {
    setEditingWindow(false)
    setWindowTime('')
  }

  const handleSaveWindow = async () => {
    if (!windowTime) {
      showToast('Please set a time', true)
      return
    }
    const [h, m] = windowTime.split(':').map(Number)
    if (Number.isNaN(h) || Number.isNaN(m)) {
      showToast('Invalid time', true)
      return
    }
    const curLabel = windowHHMM ? `${windowHHMM} (${formatTime(`${windowHHMM}:00`)})` : '—'
    const newLabel = `${windowTime} (${formatTime(`${windowTime}:00`)})`
    const ok = window.confirm(
      `This changes when booking opens for ALL students (currently ${curLabel} → new ${newLabel}).\n\nConfirm?`
    )
    if (!ok) return
    setWindowSaving(true)
    const success = await updateBookingWindowConfig(h, m)
    setWindowSaving(false)
    if (success) {
      showToast('Booking open time updated')
      setEditingWindow(false)
    }
  }

  const formatTime = (timeStr) => {
    if (!timeStr) return ''
    const [h, m] = timeStr.split(':')
    const hh = parseInt(h, 10)
    const ampm = hh >= 12 ? 'PM' : 'AM'
    const h12 = hh % 12 || 12
    return `${h12}:${m} ${ampm}`
  }

  return (
    <div className={styles.page}>
      <Header showBack />

      <div className={styles.content}>
        <div className={styles.pageTitle}>Points Details & Slot Timings</div>
        <div className={styles.pageSub}>
          View training skills points and manage slot timings
        </div>

        {/* POINT RULES / TRAINING SKILLS */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionTitle}>Training Skills & Points</div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '25%' }}>Skill Name</th>
                  <th style={{ width: '20%' }}>Category</th>
                  <th style={{ width: '15%' }}>Type</th>
                  <th style={{ width: '15%' }}>Levels</th>
                  <th style={{ width: '12%' }}>Max Reward Pts</th>
                  <th style={{ width: '13%' }}>Max Activity Pts</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className={styles.empty}>Loading skills...</td>
                  </tr>
                ) : trainingSkills && trainingSkills.length > 0 ? (
                  trainingSkills.map((ts) => (
                    <tr key={ts.training_skill_id}>
                      <td><b>{ts.skill_name}</b></td>
                      <td>{ts.category_name || '—'}</td>
                      <td>{ts.skill_type}</td>
                      <td>{ts.levels_count} Level{ts.levels_count !== 1 ? 's' : ''}</td>
                      <td>{Number(ts.max_reward_points) || 0}</td>
                      <td>{Number(ts.max_activity_points) || 0}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className={styles.empty}>No training skills found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* BOOKING OPEN TIME */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionTitle}>Booking Open Time</div>
          <p style={{ fontSize: 13, color: 'var(--text2, #6b7280)', margin: '4px 0 14px' }}>
            Each day at this time (IST), the next working day&apos;s slots open for students. Sundays are skipped.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            {!editingWindow ? (
              <>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text, #1a1a2e)' }}>
                  {windowHHMM || 'Loading…'}
                  {windowHHMM && (
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2, #6b7280)', marginLeft: 8 }}>
                      ({formatTime(`${windowHHMM}:00`)})
                    </span>
                  )}
                </div>
                <button onClick={startEditWindow} disabled={!bookingWindow}>Edit</button>
              </>
            ) : (
              <>
                <input
                  type="time"
                  value={windowTime}
                  onChange={(e) => setWindowTime(e.target.value)}
                />
                <button onClick={handleSaveWindow} disabled={windowSaving}>
                  {windowSaving ? 'Saving…' : 'Save'}
                </button>
                <button onClick={cancelEditWindow} disabled={windowSaving}>Cancel</button>
              </>
            )}
          </div>
        </div>

        {/* SLOT TIMINGS MANAGEMENT */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionTitle}>Training Slot Timings</div>

          {/* Add slot timing inline form */}
          <div className={styles.addSlotRow}>
            <div>
              <label style={{ fontSize: 12, marginRight: 8, fontWeight: 700, color: 'var(--text2)' }}>Start Time:</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, marginRight: 8, fontWeight: 700, color: 'var(--text2)' }}>End Time:</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
            <button onClick={handleAddSlot} disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : '+ Add Slot'}
            </button>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '12%' }}>Slot ID</th>
                  <th style={{ width: '26%' }}>Start Time</th>
                  <th style={{ width: '26%' }}>End Time</th>
                  <th style={{ width: '14%' }}>Status</th>
                  <th style={{ width: '22%' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className={styles.empty}>Loading slots...</td>
                  </tr>
                ) : allSlotTimings && allSlotTimings.length > 0 ? (
                  allSlotTimings.map((st) => {
                    const active = Number(st.is_active) === 1
                    const editing = editingSlotId === st.slot_id
                    return (
                      <tr key={st.slot_id}>
                        <td><b>#{st.slot_id}</b></td>
                        <td>
                          {editing ? (
                            <input type="time" value={editStart} onChange={(e) => setEditStart(e.target.value)} />
                          ) : formatTime(st.start_time)}
                        </td>
                        <td>
                          {editing ? (
                            <input type="time" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} />
                          ) : formatTime(st.end_time)}
                        </td>
                        <td>
                          <span style={{
                            display: 'inline-block', padding: '3px 10px', borderRadius: 20,
                            fontSize: 11, fontWeight: 700,
                            color: active ? '#059669' : '#ef4444',
                            background: active ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                          }}>
                            {active ? 'Open' : 'Closed'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {editing ? (
                              <>
                                <button onClick={() => handleSaveEdit(st.slot_id)} disabled={rowBusy}>
                                  {rowBusy ? 'Saving…' : 'Save'}
                                </button>
                                <button onClick={cancelEdit} disabled={rowBusy}>Cancel</button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => startEdit(st)}>Edit</button>
                                <button onClick={() => handleToggleActive(st)} disabled={rowBusy}>
                                  {active ? 'Close' : 'Open'}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={5}>
                      <div className={styles.empty}>
                        No slot timings configured.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}

