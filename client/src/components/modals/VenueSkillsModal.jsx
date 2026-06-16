import { useEffect, useState } from 'react'
import styles from './VenueSkillsModal.module.css'
import { useData } from '../../pages/Admin/context/DataContext'
import { useApp } from '../../pages/Admin/context/AppContext'

export default function VenueSkillsModal({ isOpen, onClose, venue }) {
  const { getVenueSkills, addVenueSkill, removeVenueSkill, trainingSkills } = useData()
  const { showToast } = useApp()

  const [skills, setSkills] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedSkillId, setSelectedSkillId] = useState('')
  const [busy, setBusy] = useState(false)

  const load = async () => {
    if (!venue) return
    setLoading(true)
    const data = await getVenueSkills(venue.venue_id)
    setSkills(data)
    setLoading(false)
  }

  useEffect(() => {
    if (isOpen && venue) {
      setSelectedSkillId('')
      load()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, venue])

  if (!isOpen || !venue) return null

  const activeSkillIds = new Set(
    skills.filter((s) => Number(s.is_active) === 1).map((s) => Number(s.training_skill_id))
  )
  // Skills not already linked-and-active are available to add (re-adding a
  // soft-removed one re-activates it via the upsert).
  const addableSkills = (trainingSkills || []).filter(
    (ts) => !activeSkillIds.has(Number(ts.training_skill_id))
  )

  const handleAdd = async () => {
    if (!selectedSkillId) {
      showToast('Select a skill to add', true)
      return
    }
    setBusy(true)
    const ok = await addVenueSkill(venue.venue_id, selectedSkillId)
    setBusy(false)
    if (ok) {
      showToast('Skill linked to venue')
      setSelectedSkillId('')
      await load()
    }
  }

  const handleRemove = async (trainingSkillId) => {
    setBusy(true)
    const ok = await removeVenueSkill(venue.venue_id, trainingSkillId)
    setBusy(false)
    if (ok) {
      showToast('Skill removed from venue')
      await load()
    }
  }

  const activeSkills = skills.filter((s) => Number(s.is_active) === 1)

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Manage Skills — {venue.venue_name}</h2>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div className={styles.content}>
          <div className={styles.note}>
            Skills linked here make this venue bookable by students for that skill.
          </div>

          {/* ADD ROW */}
          <div className={styles.addRow}>
            <select
              className={styles.select}
              value={selectedSkillId}
              onChange={(e) => setSelectedSkillId(e.target.value)}
            >
              <option value="">Select a skill to add…</option>
              {addableSkills.map((ts) => (
                <option key={ts.training_skill_id} value={ts.training_skill_id}>
                  {ts.skill_name}{ts.skill_type ? ` (${ts.skill_type})` : ''}
                </option>
              ))}
            </select>
            <button className={styles.addBtn} onClick={handleAdd} disabled={busy || !selectedSkillId}>
              + Add
            </button>
          </div>

          {/* LIST */}
          <div className={styles.list}>
            {loading ? (
              <div className={styles.empty}>Loading skills…</div>
            ) : activeSkills.length > 0 ? (
              activeSkills.map((s) => (
                <div key={s.venue_alloted_skill_id} className={styles.row}>
                  <div>
                    <span className={styles.skillName}>{s.skill_name}</span>
                    {s.skill_type && <span className={styles.typeBadge}>{s.skill_type}</span>}
                  </div>
                  <button
                    className={styles.removeBtn}
                    title="Remove skill"
                    onClick={() => handleRemove(s.training_skill_id)}
                    disabled={busy}
                  >
                    ✕
                  </button>
                </div>
              ))
            ) : (
              <div className={styles.empty}>No skills linked yet. Add one above.</div>
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
