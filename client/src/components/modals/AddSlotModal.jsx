import { useState } from 'react'
import styles from './AddSlotModal.module.css'
import { useApp } from '../../pages/Admin/context/AppContext'
import { useData } from '../../pages/Admin/context/DataContext'

export default function AddSlotModal({ isOpen, onClose, type = 'PS' }) {
  const { showToast } = useApp()
  const { venues, faculty, addPsSlot, addPblSlot } = useData()

  const [day, setDay] = useState('Monday')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [venue, setVenue] = useState('')
  const [facultyId, setFacultyId] = useState('')

  if (!isOpen) return null

  const fmtTime = (t) => {
    if (!t) return ''
    const [h, m] = t.split(':')
    const hr = parseInt(h)
    return (
      (hr > 12 ? hr - 12 : hr || 12) +
      ':' +
      (m || '00') +
      ' ' +
      (hr >= 12 ? 'PM' : 'AM')
    )
  }

  const handleConfirm = () => {
    if (!startTime || !endTime) {
      showToast('Please enter times', true)
      return
    }
    if (startTime >= endTime) {
      showToast('End must be after start', true)
      return
    }
    if (!venue) {
      showToast('Please select a venue', true)
      return
    }
    if (!facultyId) {
      showToast('Please select a faculty', true)
      return
    }

    const timeStr = fmtTime(startTime) + ' – ' + fmtTime(endTime)
    const slot = { day, time: timeStr, venue, faculty: facultyId }

    if (type === 'PS') {
      addPsSlot(slot)
      showToast('PS Slot added!', false)
    } else {
      addPblSlot(slot)
      showToast('PBL Slot added!', false)
    }
    handleClose()
  }

  const handleClose = () => {
    setDay('Monday')
    setStartTime('')
    setEndTime('')
    setVenue('')
    setFacultyId('')
    onClose()
  }

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.box} onClick={(e) => e.stopPropagation()}>

        {/* HEADER */}
        <div className={styles.boxHeader}>
          <div className={styles.title}>Add New {type} Slot</div>
          <div className={styles.sub}>
            {type === 'PS' ? 'Problem Solving Slot' : 'Project Based Learning Slot'}
          </div>
        </div>

        {/* BODY */}
        <div className={styles.boxScroll}>
          <div className={styles.fields}>

            {/* DAY */}
            <div className={styles.fieldGroup}>
              <div className={styles.label}>Day</div>
              <select
                className={styles.select}
                value={day}
                onChange={(e) => setDay(e.target.value)}
              >
                {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* TIME ROW */}
            <div className={styles.timeRow}>
              <div className={styles.fieldGroup}>
                <div className={styles.label}>Start Time</div>
                <input
                  className={styles.input}
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className={styles.fieldGroup}>
                <div className={styles.label}>End Time</div>
                <input
                  className={styles.input}
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>

            {/* VENUE */}
            <div className={styles.fieldGroup}>
              <div className={styles.label}>Venue</div>
              <select
                className={styles.select}
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
              >
                <option value="">Select venue…</option>
                {venues.map((v) => (
                  <option key={v.id} value={v.name}>{v.name}</option>
                ))}
              </select>
            </div>

            {/* FACULTY */}
            <div className={styles.fieldGroup}>
              <div className={styles.label}>Faculty Incharge</div>
              <select
                className={styles.select}
                value={facultyId}
                onChange={(e) => setFacultyId(e.target.value)}
              >
                <option value="">Select faculty…</option>
                {faculty.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.dept})
                  </option>
                ))}
              </select>
            </div>

          </div>

          {/* FOOTER BTNS */}
          <div className={styles.footerBtns}>
            <button className={styles.cancelBtn} onClick={handleClose}>
              Cancel
            </button>
            <button className={styles.confirmBtn} onClick={handleConfirm}>
              Add Slot
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
