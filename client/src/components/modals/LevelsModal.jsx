import { useEffect, useState } from 'react'
import styles from './LevelsModal.module.css'
import { useData } from '../../pages/Admin/context/DataContext'
import { useApp } from '../../pages/Admin/context/AppContext'
import AssessmentModal from './AssessmentModal'

// Inline level list for one course/lab. Mirrors VenueDateSlotsModal:
// load on open, add via the top form, per-row inline edit + guard-delete.
export default function LevelsModal({ isOpen, onClose, skill }) {
  const { getLevels, createLevel, updateLevel, deleteLevel } = useData()
  const { showToast } = useApp()

  const [levels, setLevels] = useState([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)

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
    setLevels(Array.isArray(data) ? data : [])
    setLoading(false)
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
                        </div>
                        <div className={styles.rowActions}>
                          <button onClick={() => startEdit(lv)} disabled={busy}>Edit</button>
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
