import { useEffect, useState } from 'react'
import styles from './AssessmentModal.module.css'
import { useData } from '../../pages/Admin/context/DataContext'
import { useApp } from '../../pages/Admin/context/AppContext'
import QuestionsModal from './QuestionsModal'

const EMPTY_FORM = { assessment_title: '', assessment_type: 'MCQ', total_marks: '', passing_marks: '', duration_minutes: '' }

// Assessment container for one skill+level (Stage 5c-i). Lists/creates/edits the
// level's assessments, (de)activates them, and manages each one's MCQ-type config.
// Questions hang off this in 5c-ii.
export default function AssessmentModal({ isOpen, onClose, skill, level }) {
  const {
    getAssessments, createAssessment, updateAssessment, setAssessmentActive,
    getMcqTypes, getMcqTypeConfig, upsertMcqTypeConfig, deleteMcqTypeConfig,
  } = useData()
  const { showToast } = useApp()

  const [assessments, setAssessments] = useState([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)

  // assessment create/edit form
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)

  // MCQ type config panel
  const [mcqTypes, setMcqTypes] = useState([])
  const [selected, setSelected] = useState(null) // selected assessment object
  const [config, setConfig] = useState([])
  const [configLoading, setConfigLoading] = useState(false)
  const [cfgTypeId, setCfgTypeId] = useState('')
  const [cfgCount, setCfgCount] = useState('')

  // questions bank (Stage 5c-ii)
  const [questionsOpen, setQuestionsOpen] = useState(false)
  const [questionsAssessment, setQuestionsAssessment] = useState(null)
  const openQuestions = (a) => { setQuestionsAssessment(a); setQuestionsOpen(true) }

  const loadAssessments = async () => {
    if (!skill || !level) return
    setLoading(true)
    const data = await getAssessments(skill.training_skill_id, level.level_id)
    setAssessments(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => {
    if (isOpen && skill && level) {
      setShowForm(false)
      setEditingId(null)
      setForm(EMPTY_FORM)
      setSelected(null)
      setConfig([])
      setCfgTypeId('')
      setCfgCount('')
      loadAssessments()
      getMcqTypes().then((t) => setMcqTypes(Array.isArray(t) ? t : []))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, skill, level])

  if (!isOpen || !skill || !level) return null

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const openCreateForm = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  const openEditForm = (a) => {
    setEditingId(a.assessment_id)
    setForm({
      assessment_title: a.assessment_title || '',
      assessment_type: a.assessment_type || 'MCQ',
      total_marks: a.total_marks != null ? String(a.total_marks) : '',
      passing_marks: a.passing_marks != null ? String(a.passing_marks) : '',
      duration_minutes: a.duration_minutes != null ? String(a.duration_minutes) : '',
    })
    setShowForm(true)
  }

  // Mirrors the server validation: marks > 0, passing ≤ total, duration > 0.
  const validateForm = () => {
    if (!form.assessment_title.trim()) return 'Assessment title is required'
    const total = Number(form.total_marks)
    const passing = Number(form.passing_marks)
    const duration = Number(form.duration_minutes)
    if (!(total > 0)) return 'Total marks must be greater than 0'
    if (!(passing > 0)) return 'Passing marks must be greater than 0'
    if (passing > total) return 'Passing marks cannot exceed total marks'
    if (!(duration > 0)) return 'Duration must be greater than 0'
    return null
  }

  const handleSaveForm = async () => {
    const err = validateForm()
    if (err) { showToast(err, true); return }
    const payload = {
      assessment_title: form.assessment_title.trim(),
      assessment_type: form.assessment_type,
      total_marks: Number(form.total_marks),
      passing_marks: Number(form.passing_marks),
      duration_minutes: Number(form.duration_minutes),
    }
    setBusy(true)
    const ok = editingId
      ? await updateAssessment(editingId, payload)
      : await createAssessment(skill.training_skill_id, level.level_id, payload)
    setBusy(false)
    if (ok) {
      showToast(editingId ? 'Assessment updated' : 'Assessment created')
      setShowForm(false)
      setEditingId(null)
      setForm(EMPTY_FORM)
      await loadAssessments()
    }
  }

  const handleToggleActive = async (a) => {
    const next = Number(a.is_active) === 1 ? false : true
    setBusy(true)
    const ok = await setAssessmentActive(a.assessment_id, next)
    setBusy(false)
    if (ok) {
      showToast(next ? 'Assessment activated' : 'Assessment deactivated')
      await loadAssessments()
    }
  }

  // ── MCQ type config ──────────────────────────────────────────
  const loadConfig = async (assessment) => {
    setConfigLoading(true)
    const data = await getMcqTypeConfig(assessment.assessment_id)
    setConfig(Array.isArray(data) ? data : [])
    setConfigLoading(false)
  }

  const openConfig = async (a) => {
    setSelected(a)
    setCfgTypeId('')
    setCfgCount('')
    await loadConfig(a)
  }

  const handleAddConfig = async () => {
    if (!cfgTypeId) { showToast('Pick an MCQ type', true); return }
    const count = Number(cfgCount)
    if (!Number.isInteger(count) || count < 0) { showToast('Question count must be a whole number ≥ 0', true); return }
    setBusy(true)
    const ok = await upsertMcqTypeConfig(selected.assessment_id, Number(cfgTypeId), count)
    setBusy(false)
    if (ok) {
      showToast('Type count saved')
      setCfgTypeId('')
      setCfgCount('')
      await loadConfig(selected)
    }
  }

  // Inline count edit re-upserts the same (assessment, type) pair.
  const handleSaveCount = async (cfg, newCount) => {
    const count = Number(newCount)
    if (!Number.isInteger(count) || count < 0) { showToast('Question count must be a whole number ≥ 0', true); return }
    setBusy(true)
    const ok = await upsertMcqTypeConfig(selected.assessment_id, cfg.mcq_type_id, count)
    setBusy(false)
    if (ok) { showToast('Type count updated'); await loadConfig(selected) }
  }

  const handleRemoveConfig = async (cfg) => {
    if (!window.confirm(`Remove "${cfg.mcq_type_name || 'this type'}" from this assessment's config?`)) return
    setBusy(true)
    const ok = await deleteMcqTypeConfig(cfg.config_id)
    setBusy(false)
    if (ok) { showToast('Type removed'); await loadConfig(selected) }
  }

  const fmtMeta = (a) =>
    `${a.assessment_type} · ${a.total_marks} marks · pass ${a.passing_marks} · ${a.duration_minutes} min`

  return (
    <div className={styles.overlay} onClick={(e) => { e.stopPropagation(); onClose() }}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Manage Assessment — {skill.skill_name} · Level {level.level_name}</h2>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div className={styles.content}>
          {/* ASSESSMENTS */}
          <div className={styles.sectionTitle}>
            <h3>Assessments</h3>
            {!showForm && (
              <button className={styles.primaryBtn} onClick={openCreateForm}>+ Add Assessment</button>
            )}
          </div>

          {showForm && (
            <div className={styles.formGrid}>
              <div className={`${styles.field} ${styles.grow}`}>
                <label>Title</label>
                <input className={styles.input} value={form.assessment_title} onChange={(e) => setField('assessment_title', e.target.value)} placeholder="e.g. Level 1 MCQ Test" />
              </div>
              <div className={styles.field}>
                <label>Type</label>
                <select className={styles.select} value={form.assessment_type} onChange={(e) => setField('assessment_type', e.target.value)}>
                  <option value="MCQ">MCQ</option>
                  <option value="CODING">CODING</option>
                </select>
              </div>
              <div className={styles.field}>
                <label>Total Marks</label>
                <input className={`${styles.input} ${styles.num}`} type="number" min="1" value={form.total_marks} onChange={(e) => setField('total_marks', e.target.value)} />
              </div>
              <div className={styles.field}>
                <label>Passing Marks</label>
                <input className={`${styles.input} ${styles.num}`} type="number" min="1" value={form.passing_marks} onChange={(e) => setField('passing_marks', e.target.value)} />
              </div>
              <div className={styles.field}>
                <label>Duration (min)</label>
                <input className={`${styles.input} ${styles.num}`} type="number" min="1" value={form.duration_minutes} onChange={(e) => setField('duration_minutes', e.target.value)} />
              </div>
              <button className={styles.primaryBtn} onClick={handleSaveForm} disabled={busy}>
                {editingId ? 'Save' : 'Create'}
              </button>
              <button className={styles.btnCancel} onClick={() => { setShowForm(false); setEditingId(null) }} disabled={busy}>Cancel</button>
            </div>
          )}

          <div className={styles.list}>
            {loading ? (
              <div className={styles.empty}>Loading assessments…</div>
            ) : assessments.length > 0 ? (
              assessments.map((a) => {
                const active = Number(a.is_active) === 1
                const isSel = selected && selected.assessment_id === a.assessment_id
                return (
                  <div key={a.assessment_id} className={`${styles.row} ${isSel ? styles.rowSelected : ''}`} style={active ? undefined : { opacity: 0.7 }}>
                    <div className={styles.rowInfo}>
                      <span className={styles.nameTxt}>{a.assessment_title}</span>
                      <span className={styles.metaTxt}>{fmtMeta(a)}</span>
                      <span className={active ? styles.badgeActive : styles.badgeInactive}>{active ? 'Active' : 'Inactive'}</span>
                    </div>
                    <div className={styles.rowActions}>
                      <button onClick={() => openEditForm(a)} disabled={busy}>Edit</button>
                      {a.assessment_type === 'MCQ' && (
                        <>
                          <button onClick={() => openConfig(a)} disabled={busy}>MCQ Config</button>
                          <button onClick={() => openQuestions(a)} disabled={busy}>Manage Questions</button>
                        </>
                      )}
                      <button onClick={() => handleToggleActive(a)} disabled={busy}>{active ? 'Deactivate' : 'Activate'}</button>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className={styles.empty}>No assessments yet for this level.</div>
            )}
          </div>

          {/* MCQ TYPE CONFIG (for the selected MCQ assessment) */}
          {selected && (
            <>
              <hr className={styles.divider} />
              <div className={styles.configCard}>
                <div className={styles.sectionTitle}>
                  <h3>MCQ Type Config — {selected.assessment_title}</h3>
                  <button className={styles.btnCancel} onClick={() => setSelected(null)}>Close config</button>
                </div>
                <div className={styles.note}>
                  How many questions to pull per MCQ type when a student starts this assessment.
                  (Whether enough questions exist per type is checked once questions are added in 5c-ii.)
                </div>

                <div className={styles.formGrid}>
                  <div className={`${styles.field} ${styles.grow}`}>
                    <label>MCQ Type</label>
                    <select className={styles.select} value={cfgTypeId} onChange={(e) => setCfgTypeId(e.target.value)}>
                      <option value="">Select type…</option>
                      {mcqTypes.map((t) => (
                        <option key={t.mcq_type_id} value={t.mcq_type_id}>{t.mcq_type_name}</option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label>Question Count</label>
                    <input className={`${styles.input} ${styles.num}`} type="number" min="0" value={cfgCount} onChange={(e) => setCfgCount(e.target.value)} />
                  </div>
                  <button className={styles.primaryBtn} onClick={handleAddConfig} disabled={busy}>+ Add / Update</button>
                </div>

                <div className={styles.list}>
                  {configLoading ? (
                    <div className={styles.empty}>Loading config…</div>
                  ) : config.length > 0 ? (
                    config.map((c) => (
                      <ConfigRow
                        key={c.config_id}
                        cfg={c}
                        busy={busy}
                        onSave={(val) => handleSaveCount(c, val)}
                        onRemove={() => handleRemoveConfig(c)}
                      />
                    ))
                  ) : (
                    <div className={styles.empty}>No type counts configured yet.</div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className={styles.footer}>
          <button className={styles.btnCancel} onClick={onClose}>Done</button>
        </div>
      </div>

      {questionsOpen && questionsAssessment && (
        <QuestionsModal
          isOpen={questionsOpen}
          onClose={() => setQuestionsOpen(false)}
          assessment={questionsAssessment}
          mcqTypes={mcqTypes}
        />
      )}
    </div>
  )
}

// One config row with an inline-editable count.
function ConfigRow({ cfg, busy, onSave, onRemove }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(String(cfg.question_count))

  return (
    <div className={styles.row}>
      <div className={styles.rowInfo}>
        <span className={styles.nameTxt}>{cfg.mcq_type_name || `Type #${cfg.mcq_type_id}`}</span>
        {editing ? (
          <input className={`${styles.input} ${styles.num}`} type="number" min="0" value={val} onChange={(e) => setVal(e.target.value)} />
        ) : (
          <span className={styles.metaTxt}>{cfg.question_count} question(s)</span>
        )}
      </div>
      <div className={styles.rowActions}>
        {editing ? (
          <>
            <button onClick={() => { onSave(val); setEditing(false) }} disabled={busy}>Save</button>
            <button onClick={() => { setVal(String(cfg.question_count)); setEditing(false) }} disabled={busy}>Cancel</button>
          </>
        ) : (
          <>
            <button onClick={() => setEditing(true)} disabled={busy}>Edit</button>
            <button className={styles.delBtn} onClick={onRemove} disabled={busy}>Remove</button>
          </>
        )}
      </div>
    </div>
  )
}
