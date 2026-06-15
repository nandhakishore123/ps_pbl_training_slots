import { useState, useEffect } from 'react'
import styles from './FacultyActionModal.module.css'
import { adminService } from '../../services/features/adminService'
import { useData } from '../../pages/Admin/context/DataContext'
import { useApp } from '../../pages/Admin/context/AppContext'

export default function FacultyActionModal({ isOpen, onClose, context }) {
  const { addVenueToFaculty, transferAllVenues, transferIndividualVenue, venues, slotTimings } = useData()
  const { showToast } = useApp()

  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [selectedItem, setSelectedItem] = useState(null)
  const [reason, setReason] = useState('')
  const [skillType, setSkillType] = useState('PBL')
  const [slotId, setSlotId] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { type, faculty, mapping } = context || {}

  useEffect(() => {
    if (isOpen) {
      setSearch('')
      setResults([])
      setSelectedItem(null)
      setReason('')
      setSkillType('PBL')
      setSlotId(slotTimings?.length > 0 ? slotTimings[0].slot_id : '')
      
      if (type === 'transfer_all' || type === 'transfer_individual') {
        fetchFaculty('')
      }
    }
  }, [isOpen, type, slotTimings])

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (isOpen && (type === 'transfer_all' || type === 'transfer_individual')) {
        fetchFaculty(search)
      }
    }, 300)

    return () => clearTimeout(delayDebounceFn)
  }, [search, isOpen, type])

  const fetchFaculty = async (q) => {
    setLoading(true)
    try {
      const res = await adminService.searchFaculty(q, 1, 50)
      // Filter out the current faculty
      setResults(res.data.filter(f => f.faculty_id !== faculty?.id))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    let success = false

    if (type === 'add_venue') {
      if (!selectedItem || !slotId) {
        showToast('Please select a venue and a slot', true)
        setIsSubmitting(false)
        return
      }
      success = await addVenueToFaculty(faculty.id, selectedItem.venue_id, skillType, slotId)
      if (success) showToast('Venue added successfully')
    } 
    else if (type === 'transfer_all') {
      if (!selectedItem || !reason.trim()) {
        showToast('Please select a faculty and provide a reason', true)
        setIsSubmitting(false)
        return
      }
      success = await transferAllVenues(faculty.id, selectedItem.faculty_id, reason)
      if (success) showToast('All venues transferred successfully')
    }
    else if (type === 'transfer_individual') {
      if (!selectedItem || !reason.trim()) {
        showToast('Please select a faculty and provide a reason', true)
        setIsSubmitting(false)
        return
      }
      success = await transferIndividualVenue(mapping.mapping_id, selectedItem.faculty_id, reason)
      if (success) showToast('Venue transferred successfully')
    }

    setIsSubmitting(false)
    if (success) onClose()
  }

  if (!isOpen || !context) return null

  // Filter venues for adding: show venues that are not already occupied by any faculty (optional) 
  // or just show all active venues. We'll show all active venues.
  const filteredVenues = venues.filter(v => 
    v.venue_name.toLowerCase().includes(search.toLowerCase()) || 
    (v.location || '').toLowerCase().includes(search.toLowerCase())
  )

  const formatTime = (timeStr) => {
    if (!timeStr) return ''
    const [h, m] = timeStr.split(':')
    const hh = parseInt(h, 10)
    const ampm = hh >= 12 ? 'PM' : 'AM'
    const h12 = hh % 12 || 12
    return `${h12}:${m} ${ampm}`
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>
            {type === 'add_venue' && 'Add Venue to Faculty'}
            {type === 'transfer_all' && 'Transfer All Venues'}
            {type === 'transfer_individual' && 'Transfer Individual Venue'}
          </h2>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div className={styles.content}>
          <div className={styles.infoBox}>
            <p><strong>Faculty:</strong> {faculty.name} ({faculty.reg_num})</p>
            {type === 'transfer_individual' && mapping && (
              <p><strong>Venue to Transfer:</strong> {mapping.venue_name} ({mapping.skill_type})</p>
            )}
            {type === 'transfer_all' && (
              <p><strong>Total Venues:</strong> {faculty.mappings.length}</p>
            )}
          </div>

          <div className={styles.searchSection}>
            <label>
              {type === 'add_venue' ? 'Search Venue' : 'Search Target Faculty'}
            </label>
            <input
              type="text"
              placeholder={type === 'add_venue' ? "Search by venue name..." : "Search by name or reg num..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.input}
            />
          </div>

          <div className={styles.resultsList}>
            {type === 'add_venue' ? (
              filteredVenues.length > 0 ? (
                filteredVenues.map((v) => (
                  <div
                    key={v.venue_id}
                    className={`${styles.listItem} ${selectedItem?.venue_id === v.venue_id ? styles.selected : ''}`}
                    onClick={() => setSelectedItem(v)}
                  >
                    <div className={styles.itemName}>{v.venue_name}</div>
                    <div className={styles.itemSub}>{v.location || 'No location'} • Cap: {v.capacity}</div>
                  </div>
                ))
              ) : (
                <div className={styles.emptyText}>No venues found.</div>
              )
            ) : (
              loading ? (
                <div className={styles.emptyText}>Loading...</div>
              ) : results.length > 0 ? (
                results.map((fac) => (
                  <div
                    key={fac.faculty_id}
                    className={`${styles.listItem} ${selectedItem?.faculty_id === fac.faculty_id ? styles.selected : ''}`}
                    onClick={() => setSelectedItem(fac)}
                  >
                    <div className={styles.itemName}>{fac.name}</div>
                    <div className={styles.itemSub}>{fac.reg_num} • {fac.department}</div>
                  </div>
                ))
              ) : (
                <div className={styles.emptyText}>No faculty found.</div>
              )
            )}
          </div>

          {type === 'add_venue' && (
            <div className={styles.extraFields}>
              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label>Skill Type</label>
                  <select 
                    className={styles.select} 
                    value={skillType} 
                    onChange={(e) => setSkillType(e.target.value)}
                  >
                    <option value="PBL">PBL</option>
                    <option value="PS">PS</option>
                  </select>
                </div>
                <div className={styles.fieldGroup}>
                  <label>Slot Timing</label>
                  <select 
                    className={styles.select} 
                    value={slotId} 
                    onChange={(e) => setSlotId(e.target.value)}
                  >
                    <option value="">Select Slot</option>
                    {slotTimings?.map(st => (
                      <option key={st.slot_id} value={st.slot_id}>
                        {formatTime(st.start_time)} - {formatTime(st.end_time)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Fixed Reason & Footer */}
        <div className={styles.footerWrap}>
          {(type === 'transfer_all' || type === 'transfer_individual') && (
            <div className={styles.reasonBox}>
              <label>Reason for Transfer</label>
              <textarea
                className={styles.textarea}
                placeholder="Enter reason for transfer..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
              />
            </div>
          )}
          <div className={styles.footer}>
            <button className={styles.btnCancel} onClick={onClose} disabled={isSubmitting}>Cancel</button>
            <button 
              className={styles.btnSubmit} 
              onClick={handleSubmit} 
              disabled={
                isSubmitting || 
                !selectedItem || 
                (type === 'add_venue' && !slotId) ||
                ((type === 'transfer_all' || type === 'transfer_individual') && !reason.trim())
              }
            >
              {isSubmitting ? 'Processing...' : 'Confirm Action'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
