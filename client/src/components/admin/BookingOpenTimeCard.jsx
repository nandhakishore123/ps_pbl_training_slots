import { useState } from 'react'
import { useData } from '../../pages/Admin/context/DataContext'
import { useApp } from '../../pages/Admin/context/AppContext'

// 'HH:MM' or 'HH:MM:SS' → '7:45 PM'
const formatTime = (timeStr) => {
  if (!timeStr) return ''
  const [h, m] = String(timeStr).split(':')
  const hh = parseInt(h, 10)
  if (Number.isNaN(hh)) return String(timeStr)
  const ampm = hh >= 12 ? 'PM' : 'AM'
  const h12 = hh % 12 || 12
  return `${h12}:${m} ${ampm}`
}

const pad2 = (n) => String(n).padStart(2, '0')

// Shared "Booking Open Time" card — used by the Settings page and the
// Slot Scheduling page. Single source of truth for editing the admin-
// configurable booking-open time (app_config), with a confirm dialog.
export default function BookingOpenTimeCard({ className, style }) {
  const { showToast } = useApp()
  const { bookingWindow, updateBookingWindowConfig } = useData()

  const [editing, setEditing] = useState(false)
  const [windowTime, setWindowTime] = useState('')
  const [saving, setSaving] = useState(false)

  const windowHHMM = bookingWindow ? `${pad2(bookingWindow.openHour)}:${pad2(bookingWindow.openMinute)}` : null

  const startEdit = () => {
    setWindowTime(windowHHMM || '19:45')
    setEditing(true)
  }

  const cancelEdit = () => {
    setEditing(false)
    setWindowTime('')
  }

  const handleSave = async () => {
    if (!windowTime) {
      showToast('Please set a time', true)
      return
    }
    const [h, m] = windowTime.split(':').map(Number)
    if (Number.isNaN(h) || Number.isNaN(m)) {
      showToast('Invalid time', true)
      return
    }
    const curLabel = windowHHMM ? `${windowHHMM} (${formatTime(windowHHMM)})` : '—'
    const newLabel = `${windowTime} (${formatTime(windowTime)})`
    const ok = window.confirm(
      `This changes when booking opens for ALL students (currently ${curLabel} → new ${newLabel}).\n\nConfirm?`
    )
    if (!ok) return
    setSaving(true)
    const success = await updateBookingWindowConfig(h, m)
    setSaving(false)
    if (success) {
      showToast('Booking open time updated')
      setEditing(false)
    }
  }

  return (
    <div className={className} style={style}>
      <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text, #1a1a2e)', marginBottom: 4 }}>
        Booking Open Time
      </div>
      <p style={{ fontSize: 13, color: 'var(--text2, #6b7280)', margin: '0 0 14px' }}>
        Each day at this time (IST), the next working day&apos;s slots open for students. Sundays are skipped.
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        {!editing ? (
          <>
            <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--purple, #6c47ff)', fontFamily: "var(--font-head, 'Outfit', sans-serif)" }}>
              {windowHHMM || 'Loading…'}
              {windowHHMM && (
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2, #6b7280)', marginLeft: 8 }}>
                  ({formatTime(windowHHMM)})
                </span>
              )}
            </div>
            <button
              onClick={startEdit}
              disabled={!bookingWindow}
              style={btnStyle}
            >
              Edit
            </button>
          </>
        ) : (
          <>
            <input
              type="time"
              value={windowTime}
              onChange={(e) => setWindowTime(e.target.value)}
              style={inputStyle}
            />
            <button onClick={handleSave} disabled={saving} style={btnPrimaryStyle}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={cancelEdit} disabled={saving} style={btnStyle}>Cancel</button>
          </>
        )}
      </div>
    </div>
  )
}

const btnStyle = {
  padding: '8px 16px',
  borderRadius: 8,
  border: '1.5px solid var(--border, #e5e4eb)',
  background: 'var(--white, #fff)',
  color: 'var(--text2, #6b7280)',
  fontWeight: 700,
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: 'inherit',
}

const btnPrimaryStyle = {
  ...btnStyle,
  background: 'var(--purple, #6c47ff)',
  borderColor: 'var(--purple, #6c47ff)',
  color: '#fff',
}

const inputStyle = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1.5px solid var(--border, #e5e4eb)',
  background: 'var(--white, #fff)',
  color: 'var(--text, #1a1a2e)',
  fontWeight: 600,
  fontSize: 14,
  fontFamily: 'inherit',
}
