import { useEffect, useState } from 'react'
import styles from './QuestionsModal.module.css'
import { useData } from '../../pages/Admin/context/DataContext'
import { useApp } from '../../pages/Admin/context/AppContext'

const OPTIONS = ['A', 'B', 'C', 'D']
const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD']
const EMPTY_FORM = {
  question_text: '', option_a: '', option_b: '', option_c: '', option_d: '',
  correct_option: 'A', mcq_type_id: '', difficulty: 'EASY', marks: '1',
}

// Question Bank for one assessment (Stage 5c-ii). Add/edit MCQ questions; retire
// (soft-delete) / restore. Shows per-type coverage vs the assessment's
// mcq_type_config so the admin sees if enough active questions exist per type.
export default function QuestionsModal({ isOpen, onClose, assessment, mcqTypes = [] }) {
  const { getQuestions, createQuestion, updateQuestion, setQuestionActive, getMcqTypeConfig } = useData()
  const { showToast } = useApp()

  const [questions, setQuestions] = useState([])
  const [config, setConfig] = useState([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const load = async () => {
    if (!assessment) return
    setLoading(true)
    const [qs, cfg] = await Promise.all([
      getQuestions(assessment.assessment_id),
      getMcqTypeConfig(assessment.assessment_id),
    ])
    setQuestions(Array.isArray(qs) ? qs : [])
    setConfig(Array.isArray(cfg) ? cfg : [])
    setLoading(false)
  }

  useEffect(() => {
    if (isOpen && assessment) {
      setShowForm(false)
      setEditingId(null)
      setForm(EMPTY_FORM)
      load()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, assessment])

  if (!isOpen || !assessment) return null

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const openCreateForm = () => {
    setEditingId(null)
    setForm({ ...EMPTY_FORM, mcq_type_id: mcqTypes[0]?.mcq_type_id ? String(mcqTypes[0].mcq_type_id) : '' })
    setShowForm(true)
  }

  const openEditForm = (q) => {
    setEditingId(q.mcq_question_id)
    setForm({
      question_text: q.question_text || '',
      option_a: q.option_a || '', option_b: q.option_b || '',
      option_c: q.option_c || '', option_d: q.option_d || '',
      correct_option: q.correct_option || 'A',
      mcq_type_id: q.mcq_type_id != null ? String(q.mcq_type_id) : '',
      difficulty: q.difficulty || 'EASY',
      marks: q.marks != null ? String(q.marks) : '1',
    })
    setShowForm(true)
  }

  // Mirrors server validation: 4 options non-empty, correct ∈ {A,B,C,D},
  // marks > 0, type required.
  const validateForm = () => {
    if (!form.question_text.trim()) return 'Question text is required'
    for (const o of OPTIONS) {
      if (!form[`option_${o.toLowerCase()}`].trim()) return `Option ${o} is required`
    }
    if (!OPTIONS.includes(form.correct_option)) return 'Correct option must be A, B, C or D'
    if (!form.mcq_type_id) return 'MCQ type is required'
    if (!(Number(form.marks) > 0)) return 'Marks must be greater than 0'
    return null
  }

  const handleSaveForm = async () => {
    const err = validateForm()
    if (err) { showToast(err, true); return }
    const payload = {
      question_text: form.question_text.trim(),
      option_a: form.option_a.trim(), option_b: form.option_b.trim(),
      option_c: form.option_c.trim(), option_d: form.option_d.trim(),
      correct_option: form.correct_option,
      mcq_type_id: Number(form.mcq_type_id),
      difficulty: form.difficulty || null,
      marks: Number(form.marks),
    }
    setBusy(true)
    const ok = editingId
      ? await updateQuestion(editingId, payload)
      : await createQuestion(assessment.assessment_id, payload)
    setBusy(false)
    if (ok) {
      showToast(editingId ? 'Question updated' : 'Question added')
      setShowForm(false)
      setEditingId(null)
      setForm(EMPTY_FORM)
      await load()
    }
  }

  // Retire = soft-delete (is_active=0); restore = is_active=1. Warn if the
  // question already has student answers (history is preserved either way).
  const handleToggleActive = async (q) => {
    const active = Number(q.is_active) === 1
    if (active) {
      const ans = Number(q.answer_count) || 0
      const note = ans > 0
        ? `\n\nThis question has ${ans} student answer(s). Retiring keeps that history; it just won't be served in new attempts.`
        : ''
      if (!window.confirm(`Retire this question? It will stop appearing in new attempts.${note}`)) return
    }
    setBusy(true)
    const ok = await setQuestionActive(q.mcq_question_id, !active)
    setBusy(false)
    if (ok) { showToast(active ? 'Question retired' : 'Question restored'); await load() }
  }

  // ── Per-type coverage (active questions vs config need) ──────
  const activeByType = {}
  for (const q of questions) {
    if (Number(q.is_active) === 1) {
      activeByType[q.mcq_type_id] = (activeByType[q.mcq_type_id] || 0) + 1
    }
  }
  // Union of configured types and types that have questions.
  const typeIds = new Set([
    ...config.map((c) => c.mcq_type_id),
    ...questions.map((q) => q.mcq_type_id),
  ])
  const typeName = (id) =>
    config.find((c) => c.mcq_type_id === id)?.mcq_type_name
    || mcqTypes.find((t) => t.mcq_type_id === id)?.mcq_type_name
    || `Type #${id}`
  const coverage = Array.from(typeIds).map((id) => {
    const have = activeByType[id] || 0
    const need = config.find((c) => c.mcq_type_id === id)?.question_count ?? 0
    return { id, name: typeName(id), have, need, short: need > 0 && have < need }
  })

  return (
    <div className={styles.overlay} onClick={(e) => { e.stopPropagation(); onClose() }}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Manage Questions — {assessment.assessment_title}</h2>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div className={styles.content}>
          {/* COVERAGE SUMMARY */}
          {coverage.length > 0 && (
            <div className={styles.summary}>
              {coverage.map((c) => (
                <span
                  key={c.id}
                  className={`${styles.chip} ${c.need > 0 ? (c.short ? styles.chipWarn : styles.chipOk) : ''}`}
                  title={c.need > 0 ? `Config needs ${c.need}; ${c.have} active` : 'No config count set'}
                >
                  {c.name}: {c.have} active{c.need > 0 ? ` / needs ${c.need}` : ''}
                </span>
              ))}
            </div>
          )}

          <div className={styles.sectionTitle}>
            <h3>Questions</h3>
            {!showForm && (
              <button className={styles.primaryBtn} onClick={openCreateForm}>+ Add Question</button>
            )}
          </div>

          {/* ADD / EDIT FORM */}
          {showForm && (
            <div className={styles.formCard}>
              <div className={styles.field}>
                <label>Question Text</label>
                <textarea className={styles.textarea} value={form.question_text} onChange={(e) => setField('question_text', e.target.value)} placeholder="Enter the question…" />
              </div>
              <div className={styles.optionsGrid}>
                {OPTIONS.map((o) => (
                  <div className={styles.field} key={o}>
                    <label>Option {o}</label>
                    <input className={styles.input} value={form[`option_${o.toLowerCase()}`]} onChange={(e) => setField(`option_${o.toLowerCase()}`, e.target.value)} />
                  </div>
                ))}
              </div>
              <div className={styles.metaRow}>
                <div className={styles.field}>
                  <label>Correct Option</label>
                  <select className={styles.select} value={form.correct_option} onChange={(e) => setField('correct_option', e.target.value)}>
                    {OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div className={styles.field}>
                  <label>MCQ Type</label>
                  <select className={styles.select} value={form.mcq_type_id} onChange={(e) => setField('mcq_type_id', e.target.value)}>
                    <option value="">Select type…</option>
                    {mcqTypes.map((t) => <option key={t.mcq_type_id} value={t.mcq_type_id}>{t.mcq_type_name}</option>)}
                  </select>
                </div>
                <div className={styles.field}>
                  <label>Difficulty</label>
                  <select className={styles.select} value={form.difficulty} onChange={(e) => setField('difficulty', e.target.value)}>
                    {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className={styles.field}>
                  <label>Marks</label>
                  <input className={`${styles.input} ${styles.num}`} type="number" min="1" value={form.marks} onChange={(e) => setField('marks', e.target.value)} />
                </div>
              </div>
              <div className={styles.formActions}>
                <button className={styles.btnCancel} onClick={() => { setShowForm(false); setEditingId(null) }} disabled={busy}>Cancel</button>
                <button className={styles.primaryBtn} onClick={handleSaveForm} disabled={busy}>{editingId ? 'Save' : 'Add'}</button>
              </div>
            </div>
          )}

          {/* LIST */}
          <div className={styles.list}>
            {loading ? (
              <div className={styles.empty}>Loading questions…</div>
            ) : questions.length > 0 ? (
              questions.map((q) => {
                const active = Number(q.is_active) === 1
                return (
                  <div key={q.mcq_question_id} className={styles.row} style={active ? undefined : { opacity: 0.65 }}>
                    <div style={{ flex: '1 1 320px', minWidth: 0 }}>
                      <div className={styles.qText}>{q.question_text}</div>
                      <div className={styles.qMeta}>
                        <span>{q.mcq_type_name || `Type #${q.mcq_type_id}`}</span>
                        <span>Correct: {q.correct_option}</span>
                        <span>{q.difficulty || '—'}</span>
                        <span>{q.marks} mark(s)</span>
                        {Number(q.answer_count) > 0 && <span>{q.answer_count} answer(s)</span>}
                        <span className={active ? styles.badgeActive : styles.badgeRetired}>{active ? 'Active' : 'Retired'}</span>
                      </div>
                    </div>
                    <div className={styles.rowActions}>
                      <button onClick={() => openEditForm(q)} disabled={busy}>Edit</button>
                      <button className={active ? styles.delBtn : undefined} onClick={() => handleToggleActive(q)} disabled={busy}>
                        {active ? 'Retire' : 'Restore'}
                      </button>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className={styles.empty}>No questions yet. Add the first one.</div>
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
