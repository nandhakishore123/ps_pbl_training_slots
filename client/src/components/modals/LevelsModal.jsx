import { useEffect, useState } from 'react'
import styles from './LevelsModal.module.css'
import { useData } from '../../pages/Admin/context/DataContext'
import { useApp } from '../../pages/Admin/context/AppContext'
import AssessmentModal from './AssessmentModal'

// Inline level list for one course/lab. Mirrors VenueDateSlotsModal:
// load on open, add via the top form, per-row inline edit + guard-delete.
export default function LevelsModal({ isOpen, onClose, skill }) {
  const { getLevels, createLevel, updateLevel, deleteLevel, getSkillPoints, setSkillPoints } = useData()
  const { showToast } = useApp()

  const [levels, setLevels] = useState([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)

  // Points per level (skill_points) — DISPLAY config only (no awarding).
  // pointsMap: { [level_id]: { reward_points, activity_points } }
  const [pointsMap, setPointsMap] = useState({})
  const [editingPointsId, setEditingPointsId] = useState(null)
  const [ptActivity, setPtActivity] = useState('')
  const [ptReward, setPtReward] = useState('')

  // new-level form
  const [levelName, setLevelName] = useState('')
  const [coreConcept, setCoreConcept] = useState('')
  const [maxAttempts, setMaxAttempts] = useState('')

  // inline edit
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editConcept, setEditConcept] = useState('')
  const [editAttempts, setEditAttempts] = useState('')

  // assessment management (Stage 5c-i)
  const [assessmentOpen, setAssessmentOpen] = useState(false)
  const [assessmentLevel, setAssessmentLevel] = useState(null)
  const openAssessment = (lv) => { setAssessmentLevel(lv); setAssessmentOpen(true) }

  const load = async () => {
    if (!skill) return
    setLoading(true)
    const data = await getLevels(skill.training_skill_id)
    const list = Array.isArray(data) ? data : []
    setLevels(list)
    // Load the per-level display points (skill_points) in parallel.
    const entries = await Promise.all(
      list.map((lv) =>
        getSkillPoints(skill.training_skill_id, lv.level_id).then((p) => [lv.level_id, p])
      )
    )
    setPointsMap(Object.fromEntries(entries))
    setLoading(false)
  }

  const startEditPoints = (lv) => {
    const p = pointsMap[lv.level_id] || { reward_points: 0, activity_points: 0 }
    setEditingPointsId(lv.level_id)
    setPtActivity(String(p.activity_points ?? 0))
    setPtReward(String(p.reward_points ?? 0))
  }

  const cancelEditPoints = () => setEditingPointsId(null)

  const savePoints = async (lv) => {
    const act = Number(ptActivity)
    const rew = Number(ptReward)
    if (!Number.isFinite(act) || act < 0 || !Number.isFinite(rew) || rew < 0) {
      showToast('Points must be numbers ≥ 0', true)
      return
    }
    setBusy(true)
    const ok1 = await setSkillPoints(skill.training_skill_id, lv.level_id, 'ACTIVITY_POINTS', Math.trunc(act))
    const ok2 = await setSkillPoints(skill.training_skill_id, lv.level_id, 'REWARD_POINTS', Math.trunc(rew))
    setBusy(false)
    if (ok1 && ok2) {
      showToast('Level points saved')
      setPointsMap((m) => ({ ...m, [lv.level_id]: { activity_points: Math.trunc(act), reward_points: Math.trunc(rew) } }))
      setEditingPointsId(null)
    }
  }

  useEffect(() => {
    if (isOpen && skill) {
      setLevelName('')
      setCoreConcept('')
      setMaxAttempts('')
      setEditingId(null)
      load()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, skill])

  if (!isOpen || !skill) return null

  const handleAdd = async () => {
    if (!levelName.trim()) {
      showToast('Level name is required', true)
      return
    }
    setBusy(true)
    const ok = await createLevel(skill.training_skill_id, {
      level_name: levelName.trim(),
      core_concept: coreConcept.trim() || null,
      max_attempts: maxAttempts === '' ? null : Number(maxAttempts),
    })
    setBusy(false)
    if (ok) {
      showToast('Level added')
      setLevelName('')
      setCoreConcept('')
      setMaxAttempts('')
      await load()
    }
  }

  const startEdit = (lv) => {
    setEditingId(lv.level_id)
    setEditName(lv.level_name || '')
    setEditConcept(lv.core_concept || '')
    setEditAttempts(lv.max_attempts != null ? String(lv.max_attempts) : '')
  }

  const cancelEdit = () => setEditingId(null)

  const handleSaveEdit = async (levelId) => {
    if (!editName.trim()) {
      showToast('Level name is required', true)
      return
    }
    setBusy(true)
    const ok = await updateLevel(levelId, {
      level_name: editName.trim(),
      core_concept: editConcept.trim() || null,
      max_attempts: editAttempts === '' ? null : Number(editAttempts),
    })
    setBusy(false)
    if (ok) {
      showToast('Level updated')
      setEditingId(null)
      await load()
    }
  }

  // Guard-delete: server blocks (409) if the level is in use or not empty; the
  // block reason is surfaced via toast by the DataContext action.
  const handleDelete = async (lv) => {
    if (!window.confirm(`Delete level "${lv.level_name}"? This cannot be undone.`)) return
    setBusy(true)
    const ok = await deleteLevel(lv.level_id)
    setBusy(false)
    if (ok) {
      showToast('Level deleted')
      await load()
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Manage Levels — {skill.skill_name}</h2>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div className={styles.content}>
          <div className={styles.note}>
            Levels within this course/lab. A level can only be deleted while it is unused
            and empty (no bookings, assessment attempts, syllabus, points or assessments).
          </div>

          {/* ADD FORM */}
          <div className={styles.formGrid}>
            <div className={`${styles.field} ${styles.grow}`}>
              <label>Level Name</label>
              <input className={styles.input} value={levelName} onChange={(e) => setLevelName(e.target.value)} placeholder="e.g. 1" />
            </div>
            <div className={`${styles.field} ${styles.grow}`}>
              <label>Core Concept</label>
              <input className={styles.input} value={coreConcept} onChange={(e) => setCoreConcept(e.target.value)} placeholder="e.g. if/else conditions" />
            </div>
            <div className={styles.field}>
              <label>Max Attempts</label>
              <input className={styles.input} type="number" min="0" style={{ width: 110 }} value={maxAttempts} onChange={(e) => setMaxAttempts(e.target.value)} placeholder="e.g. 3" />
            </div>
            <button className={styles.addBtn} onClick={handleAdd} disabled={busy}>+ Add Level</button>
          </div>

          {/* LIST */}
          <div className={styles.list}>
            {loading ? (
              <div className={styles.empty}>Loading levels…</div>
            ) : levels.length > 0 ? (
              levels.map((lv) => {
                const editing = editingId === lv.level_id
                return (
                  <div key={lv.level_id} className={styles.row}>
                    {editing ? (
                      <div className={styles.editRow}>
                        <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Level name" />
                        <input type="text" value={editConcept} onChange={(e) => setEditConcept(e.target.value)} placeholder="Core concept" />
                        <input type="number" min="0" style={{ width: 100 }} value={editAttempts} onChange={(e) => setEditAttempts(e.target.value)} placeholder="Attempts" />
                        <button onClick={() => handleSaveEdit(lv.level_id)} disabled={busy}>Save</button>
                        <button onClick={cancelEdit} disabled={busy}>Cancel</button>
                      </div>
                    ) : (
                      <>
                        <div className={styles.rowInfo}>
                          <span className={styles.nameTxt}>Level {lv.level_name}</span>
                          <span className={styles.conceptTxt}>{lv.core_concept || '—'}</span>
                          <span className={styles.attemptsTxt}>
                            {lv.max_attempts != null ? `${lv.max_attempts} attempt(s)` : 'Unlimited attempts'}
                          </span>
                          {/* Points per level (skill_points) — DISPLAY config only */}
                          {editingPointsId === lv.level_id ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                              <label style={{ fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                                Activity
                                <input type="number" min="0" style={{ width: 80, padding: '4px 8px', border: '1.5px solid #e5e4eb', borderRadius: 8 }}
                                  value={ptActivity} onChange={(e) => setPtActivity(e.target.value)} />
                              </label>
                              <label style={{ fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                                Reward
                                <input type="number" min="0" style={{ width: 80, padding: '4px 8px', border: '1.5px solid #e5e4eb', borderRadius: 8 }}
                                  value={ptReward} onChange={(e) => setPtReward(e.target.value)} />
                              </label>
                              <button onClick={() => savePoints(lv)} disabled={busy}>Save Points</button>
                              <button onClick={cancelEditPoints} disabled={busy}>Cancel</button>
                            </span>
                          ) : (
                            <span style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                              Activity Points: <b style={{ color: '#1a1a2e' }}>{pointsMap[lv.level_id]?.activity_points ?? 0}</b>
                              {'  ·  '}
                              Reward Points: <b style={{ color: '#1a1a2e' }}>{pointsMap[lv.level_id]?.reward_points ?? 0}</b>
                            </span>
                          )}
                        </div>
                        <div className={styles.rowActions}>
                          <button onClick={() => startEdit(lv)} disabled={busy}>Edit</button>
                          <button onClick={() => startEditPoints(lv)} disabled={busy}>Set Points</button>
                          <button onClick={() => openAssessment(lv)} disabled={busy}>Manage Assessment</button>
                          <button className={styles.delBtn} onClick={() => handleDelete(lv)} disabled={busy}>Delete</button>
                        </div>
                      </>
                    )}
                  </div>
                )
              })
            ) : (
              <div className={styles.empty}>No levels yet for this course/lab.</div>
            )}
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.btnCancel} onClick={onClose}>Done</button>
        </div>
      </div>

      {assessmentOpen && assessmentLevel && (
        <AssessmentModal
          isOpen={assessmentOpen}
          onClose={() => setAssessmentOpen(false)}
          skill={skill}
          level={assessmentLevel}
        />
      )}
    </div>
  )
}
