import { useState } from 'react'
import styles from './Settings.module.css'
import Header from '../Header/Header'
import { useData } from '../context/DataContext'
import { useApp } from '../context/AppContext'
import BookingOpenTimeCard from '../../../components/admin/BookingOpenTimeCard'
import SkillFormModal from '../../../components/modals/SkillFormModal'
import LevelsModal from '../../../components/modals/LevelsModal'

export default function Settings() {
  const { showToast } = useApp()
  const {
    allSlotTimings, addSlotTiming, updateSlotTiming, setSlotActive,
    trainingSkills, allTrainingSkills, setTrainingSkillActive, loading,
  } = useData()

  // Training skill (Course/Lab) management — Stage 5a
  const [showInactiveSkills, setShowInactiveSkills] = useState(false)
  const [skillFormOpen, setSkillFormOpen] = useState(false)
  const [editingSkill, setEditingSkill] = useState(null)
  const [levelsOpen, setLevelsOpen] = useState(false)
  const [levelsSkill, setLevelsSkill] = useState(null)

  const openCreateSkill = () => { setEditingSkill(null); setSkillFormOpen(true) }
  const openEditSkill = (ts) => { setEditingSkill(ts); setSkillFormOpen(true) }
  const openLevels = (ts) => { setLevelsSkill(ts); setLevelsOpen(true) }

  const handleDeactivateSkill = async (ts) => {
    if (!window.confirm(`Deactivate "${ts.skill_name}"? It will be hidden from students and booking. Existing bookings keep working.`)) return
    let res = await setTrainingSkillActive(ts.training_skill_id, false, false)
    if (res && res.requiresConfirmation) {
      if (window.confirm(`${res.message}\n\nProceed?`)) {
        res = await setTrainingSkillActive(ts.training_skill_id, false, true)
        if (res === true) showToast('Course/Lab deactivated')
      }
      return
    }
    if (res === true) showToast('Course/Lab deactivated')
  }

  const handleReactivateSkill = async (ts) => {
    const res = await setTrainingSkillActive(ts.training_skill_id, true)
    if (res === true) showToast('Course/Lab reactivated')
  }

  // Drive the management table off allTrainingSkills (it carries is_active +
  // image_url + category_id needed for editing); active-only `trainingSkills`
  // is the fallback until that list loads. Filter inactive unless toggled.
  const sourceSkills = (allTrainingSkills && allTrainingSkills.length) ? allTrainingSkills : trainingSkills
  const visibleSkills = sourceSkills.filter((ts) => showInactiveSkills || Number(ts.is_active) !== 0)

  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Inline slot edit + open/close
  const [editingSlotId, setEditingSlotId] = useState(null)
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')
  const [rowBusy, setRowBusy] = useState(false)

  const toHHMM = (t) => (t ? String(t).slice(0, 5) : '')

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

        {/* POINT RULES / TRAINING SKILLS (Courses & Labs) — Stage 5a CRUD */}
        <div className={styles.sectionCard}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div className={styles.sectionTitle} style={{ margin: 0 }}>Courses & Labs</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--text2, #6b7280)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={showInactiveSkills}
                  onChange={(e) => setShowInactiveSkills(e.target.checked)}
                />
                Show inactive
              </label>
              <button
                style={{ background: '#6c47ff', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontWeight: 700, cursor: 'pointer' }}
                onClick={openCreateSkill}
              >
                ＋ Add Course/Lab
              </button>
            </div>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '22%' }}>Skill Name</th>
                  <th style={{ width: '15%' }}>Category</th>
                  <th style={{ width: '10%' }}>Type</th>
                  <th style={{ width: '11%' }}>Levels</th>
                  <th style={{ width: '11%' }}>Max Reward Pts</th>
                  <th style={{ width: '11%' }}>Max Activity Pts</th>
                  <th style={{ width: '10%' }}>Status</th>
                  <th style={{ width: '10%' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className={styles.empty}>Loading skills...</td>
                  </tr>
                ) : visibleSkills && visibleSkills.length > 0 ? (
                  visibleSkills.map((ts) => {
                    const inactive = Number(ts.is_active) === 0
                    return (
                    <tr key={ts.training_skill_id} style={inactive ? { opacity: 0.6 } : undefined}>
                      <td><b>{ts.skill_name}</b></td>
                      <td>{ts.category_name || '—'}</td>
                      <td>{ts.skill_type}</td>
                      <td>{ts.levels_count} Level{ts.levels_count !== 1 ? 's' : ''}</td>
                      <td>{Number(ts.max_reward_points) || 0}</td>
                      <td>{Number(ts.max_activity_points) || 0}</td>
                      <td>
                        <span style={{
                          display: 'inline-block', padding: '3px 10px', borderRadius: 20,
                          fontSize: 11, fontWeight: 700,
                          color: inactive ? '#6b7280' : '#059669',
                          background: inactive ? 'rgba(107,114,128,0.15)' : 'rgba(16,185,129,0.12)',
                        }}>
                          {inactive ? 'Inactive' : 'Active'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button onClick={() => openEditSkill(ts)}>Edit</button>
                          <button onClick={() => openLevels(ts)}>Manage Levels</button>
                          {inactive ? (
                            <button style={{ color: '#059669' }} onClick={() => handleReactivateSkill(ts)}>Reactivate</button>
                          ) : (
                            <button style={{ color: '#ef4444' }} onClick={() => handleDeactivateSkill(ts)}>Deactivate</button>
                          )}
                        </div>
                      </td>
                    </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className={styles.empty}>No courses/labs found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* BOOKING OPEN TIME (shared component — also used on Slot Scheduling) */}
        <div className={styles.sectionCard}>
          <BookingOpenTimeCard />
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

      <SkillFormModal
        isOpen={skillFormOpen}
        onClose={() => setSkillFormOpen(false)}
        skill={editingSkill}
      />

      {levelsOpen && levelsSkill && (
        <LevelsModal
          isOpen={levelsOpen}
          onClose={() => setLevelsOpen(false)}
          skill={levelsSkill}
        />
      )}
    </div>
  )
}

