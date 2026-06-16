import { useEffect, useState } from 'react'
import styles from './VenueFormModal.module.css'
import { useData } from '../../pages/Admin/context/DataContext'
import { useApp } from '../../pages/Admin/context/AppContext'

// venue = null → create mode; venue object → edit mode.
export default function VenueFormModal({ isOpen, onClose, venue = null }) {
  const { createVenue, updateVenue } = useData()
  const { showToast } = useApp()

  const isEdit = !!venue
  const [venueName, setVenueName] = useState('')
  const [location, setLocation] = useState('')
  const [capacity, setCapacity] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setVenueName(venue?.venue_name || '')
      setLocation(venue?.location || '')
      setCapacity(venue?.capacity != null ? String(venue.capacity) : '')
      setIsSubmitting(false)
    }
  }, [isOpen, venue])

  if (!isOpen) return null

  const handleSubmit = async () => {
    if (!venueName.trim()) {
      showToast('Venue name is required', true)
      return
    }
    const payload = {
      venueName: venueName.trim(),
      location: location.trim() || null,
      capacity: capacity === '' ? null : Number(capacity),
    }
    setIsSubmitting(true)
    const ok = isEdit
      ? await updateVenue(venue.venue_id, payload)
      : await createVenue(payload)
    setIsSubmitting(false)
    if (ok) {
      showToast(isEdit ? 'Venue updated successfully' : 'Venue created successfully')
      onClose()
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>{isEdit ? 'Edit Venue' : 'Create Venue'}</h2>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div className={styles.content}>
          <div className={styles.field}>
            <label>Venue Name *</label>
            <input
              className={styles.input}
              value={venueName}
              onChange={(e) => setVenueName(e.target.value)}
              placeholder="e.g. Lab A-101"
            />
          </div>
          <div className={styles.field}>
            <label>Location</label>
            <input
              className={styles.input}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Block A, 1st Floor"
            />
          </div>
          <div className={styles.field}>
            <label>Capacity</label>
            <input
              className={styles.input}
              type="number"
              min="0"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder="e.g. 30"
            />
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.btnCancel} onClick={onClose} disabled={isSubmitting}>Cancel</button>
          <button
            className={styles.btnSubmit}
            onClick={handleSubmit}
            disabled={isSubmitting || !venueName.trim()}
          >
            {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Venue'}
          </button>
        </div>
      </div>
    </div>
  )
}
