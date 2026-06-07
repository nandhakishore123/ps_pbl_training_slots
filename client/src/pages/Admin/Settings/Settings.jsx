import { useState } from 'react'
import styles from './Settings.module.css'
import Header from '../Header/Header'
import { useData } from '../context/DataContext'
import { useApp } from '../context/AppContext'

export default function Settings() {
  const { showToast } = useApp()
  const { slotTimings, addSlotTiming, deleteSlotTiming, trainingSkills, loading } = useData()

  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

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

  const handleDeleteSlot = async (slotId) => {
    if (window.confirm('Are you sure you want to delete this slot timing?')) {
      const success = await deleteSlotTiming(slotId)
      if (success) {
        showToast('Slot timing deleted successfully')
      }
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
                  <th style={{ width: '20%' }}>Slot ID</th>
                  <th style={{ width: '30%' }}>Start Time</th>
                  <th style={{ width: '30%' }}>End Time</th>
                  <th style={{ width: '20%' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className={styles.empty}>Loading slots...</td>
                  </tr>
                ) : slotTimings && slotTimings.length > 0 ? (
                  slotTimings.map((st) => (
                    <tr key={st.slot_id}>
                      <td><b>#{st.slot_id}</b></td>
                      <td>{formatTime(st.start_time)}</td>
                      <td>{formatTime(st.end_time)}</td>
                      <td>
                        <button
                          className={styles.deleteBtn}
                          onClick={() => handleDeleteSlot(st.slot_id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4}>
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

