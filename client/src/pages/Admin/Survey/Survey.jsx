import { useEffect, useState, useCallback } from 'react'
import styles from './Survey.module.css'
import Header from '../Header/Header'
import SectionCard from '../../../components/ui/SectionCard'
import { useApp } from '../context/AppContext'
import { adminService } from '../../../services/features/adminService'

// Same canonical department codes used on the Announcements page / Points leaderboard.
const DEPTS = ['AGRI','AIDS','AIML','BIOMEDICAL','BT','CIVIL','CSBS','CSD','CSE','CT','EEE','ECE','EIE','FT','ISE','IT','MECH','MTRS']

const YEARS = [
  { value: '1', label: '1st Year' },
  { value: '2', label: '2nd Year' },
  { value: '3', label: '3rd Year' },
  { value: '4', label: '4th Year' },
]

function targetLabel(s) {
  const dept = s.target_course ? s.target_course : 'All Departments'
  const yr = s.target_year ? `${s.target_year}${['', 'st', 'nd', 'rd', 'th'][s.target_year] || 'th'} Year` : 'All Years'
  if (!s.target_course && !s.target_year) return 'All Students'
  return `${dept} · ${yr}`
}

function formatDate(ts) {
  if (!ts) return '—'
  try {
    const d = new Date(ts)
    return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return String(ts)
  }
}

// A fresh blank question for the builder.
const blankQuestion = () => ({ question_text: '', question_type: 'single', options: ['', ''] })

export default function Survey() {
  const { showToast, navigate } = useApp()

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dept, setDept] = useState('all')
  const [year, setYear] = useState('all')
  const [questions, setQuestions] = useState([blankQuestion()])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminService.getSurveys()
      setItems(res?.data?.items || [])
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to load surveys', true)
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => { load() }, [load])

  // ── Question builder mutators ──
  const updateQuestion = (qi, patch) => {
    setQuestions((prev) => prev.map((q, i) => (i === qi ? { ...q, ...patch } : q)))
  }

  const addQuestion = () => setQuestions((prev) => [...prev, blankQuestion()])

  const removeQuestion = (qi) => {
    setQuestions((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== qi)))
  }

  const updateOption = (qi, oi, value) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qi ? { ...q, options: q.options.map((o, j) => (j === oi ? value : o)) } : q
      )
    )
  }

  const addOption = (qi) => {
    setQuestions((prev) => prev.map((q, i) => (i === qi ? { ...q, options: [...q.options, ''] } : q)))
  }

  const removeOption = (qi, oi) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qi && q.options.length > 2
          ? { ...q, options: q.options.filter((_, j) => j !== oi) }
          : q
      )
    )
  }

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setDept('all')
    setYear('all')
    setQuestions([blankQuestion()])
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!title.trim()) { showToast('Title is required', true); return }

    // Build + validate the questions payload (server validates too).
    const cleanQuestions = []
    for (let i = 0; i < questions.length; i += 1) {
      const q = questions[i]
      const qText = q.question_text.trim()
      if (!qText) { showToast(`Question ${i + 1}: text is required`, true); return }
      const opts = q.options.map((o) => o.trim()).filter(Boolean)
      if (opts.length < 2) { showToast(`Question ${i + 1}: at least 2 options are required`, true); return }
      cleanQuestions.push({ question_text: qText, question_type: q.question_type, options: opts })
    }
    if (cleanQuestions.length === 0) { showToast('At least one question is required', true); return }

    setSubmitting(true)
    try {
      await adminService.createSurvey({
        title: title.trim(),
        description: description.trim() || null,
        target_course: dept === 'all' ? null : dept,
        target_year: year === 'all' ? null : Number(year),
        questions: cleanQuestions,
      })
      showToast('Survey created')
      resetForm()
      load()
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to create survey', true)
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleStatus = async (s) => {
    const next = s.status === 'active' ? 'closed' : 'active'
    try {
      await adminService.setSurveyStatus(s.survey_id, next)
      showToast(next === 'closed' ? 'Survey closed' : 'Survey reopened')
      load()
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to update', true)
    }
  }

  const handleDelete = async (s) => {
    if (!window.confirm(`Delete "${s.title}"? This removes the survey and all its responses permanently.`)) return
    try {
      await adminService.deleteSurvey(s.survey_id)
      showToast('Survey deleted')
      load()
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to delete', true)
    }
  }

  const handleViewResponses = (s) => {
    // Responses page is built in a later stage; route placeholder for now.
    navigate(`/survey-responses/${s.survey_id}`)
  }

  return (
    <div className={styles.page}>
      <Header showBack />

      <div className={styles.content}>
        <div className={styles.pageTitle}>Surveys</div>
        <div className={styles.pageSub}>
          Create surveys with single/multiple choice questions, targeted by department and/or year
        </div>

        <div className={styles.grid}>
          {/* CREATE FORM */}
          <SectionCard>
            <form className={styles.form} onSubmit={handleCreate}>
              <div className={styles.formTitle}>New Survey</div>

              <label className={styles.field}>
                <span className={styles.label}>Title</span>
                <input
                  className={styles.input}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Training Feedback Survey"
                  maxLength={255}
                />
              </label>

              <label className={styles.field}>
                <span className={styles.label}>Description (optional)</span>
                <textarea
                  className={styles.textarea}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short context students will see before answering…"
                  rows={3}
                />
              </label>

              <div className={styles.targetRow}>
                <label className={styles.field}>
                  <span className={styles.label}>Department</span>
                  <select className={styles.select} value={dept} onChange={(e) => setDept(e.target.value)}>
                    <option value="all">All Departments</option>
                    {DEPTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </label>

                <label className={styles.field}>
                  <span className={styles.label}>Year</span>
                  <select className={styles.select} value={year} onChange={(e) => setYear(e.target.value)}>
                    <option value="all">All Years</option>
                    {YEARS.map((y) => (
                      <option key={y.value} value={y.value}>{y.label}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className={styles.targetHint}>
                Target: <b>{(dept === 'all' && year === 'all')
                  ? 'All Students'
                  : `${dept === 'all' ? 'All Departments' : dept} · ${year === 'all' ? 'All Years' : YEARS.find((y) => y.value === year)?.label}`}</b>
              </div>

              {/* QUESTIONS BUILDER */}
              <div className={styles.questionsHead}>
                <span className={styles.label}>Questions</span>
                <span className={styles.questionNum}>{questions.length}</span>
              </div>

              {questions.map((q, qi) => (
                <div key={qi} className={styles.questionCard}>
                  <div className={styles.questionCardTop}>
                    <span className={styles.questionNum}>Question {qi + 1}</span>
                    <button
                      type="button"
                      className={styles.removeQBtn}
                      onClick={() => removeQuestion(qi)}
                      disabled={questions.length <= 1}
                    >
                      Remove
                    </button>
                  </div>

                  <input
                    className={styles.input}
                    value={q.question_text}
                    onChange={(e) => updateQuestion(qi, { question_text: e.target.value })}
                    placeholder="Question text"
                  />

                  <label className={styles.field}>
                    <span className={styles.label}>Type</span>
                    <select
                      className={styles.select}
                      value={q.question_type}
                      onChange={(e) => updateQuestion(qi, { question_type: e.target.value })}
                    >
                      <option value="single">Single choice</option>
                      <option value="multi">Multiple choice</option>
                    </select>
                  </label>

                  <span className={styles.optionsLabel}>Options</span>
                  {q.options.map((opt, oi) => (
                    <div key={oi} className={styles.optionRow}>
                      <input
                        className={styles.input}
                        value={opt}
                        onChange={(e) => updateOption(qi, oi, e.target.value)}
                        placeholder={`Option ${oi + 1}`}
                      />
                      <button
                        type="button"
                        className={styles.iconBtn}
                        onClick={() => removeOption(qi, oi)}
                        disabled={q.options.length <= 2}
                        title="Remove option"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button type="button" className={styles.linkBtn} onClick={() => addOption(qi)}>
                    + Add option
                  </button>
                </div>
              ))}

              <button type="button" className={styles.addQuestionBtn} onClick={addQuestion}>
                + Add Question
              </button>

              <button type="submit" className={styles.submitBtn} disabled={submitting}>
                {submitting ? 'Creating…' : 'Create Survey'}
              </button>
            </form>
          </SectionCard>

          {/* LIST */}
          <SectionCard noPadding>
            <div className={styles.listHead}>
              <span>Surveys</span>
              <span className={styles.count}>{loading ? '…' : `${items.length}`}</span>
            </div>
            <div className={styles.list}>
              {loading ? (
                <div className={styles.empty}>Loading…</div>
              ) : items.length === 0 ? (
                <div className={styles.empty}>No surveys yet</div>
              ) : (
                items.map((s) => {
                  const closed = s.status === 'closed'
                  const count = Number(s.response_count || 0)
                  return (
                    <div key={s.survey_id} className={`${styles.item} ${closed ? styles.itemInactive : ''}`}>
                      <div className={styles.itemTop}>
                        <div className={styles.itemTitle}>{s.title}</div>
                        <span className={`${styles.status} ${closed ? styles.statusOff : styles.statusOn}`}>
                          {closed ? 'Closed' : 'Active'}
                        </span>
                      </div>
                      {s.description && <div className={styles.itemBody}>{s.description}</div>}
                      <div className={styles.itemMeta}>
                        <span className={styles.targetChip}>{targetLabel(s)}</span>
                        <span className={styles.responseChip}>{count} {count === 1 ? 'response' : 'responses'}</span>
                        <span className={styles.date}>{formatDate(s.created_at)}</span>
                      </div>
                      <div className={styles.actions}>
                        <button className={styles.actionBtn} onClick={() => handleToggleStatus(s)}>
                          {closed ? 'Reopen' : 'Close'}
                        </button>
                        <button className={styles.actionBtn} onClick={() => handleViewResponses(s)}>
                          View Responses
                        </button>
                        <button
                          className={`${styles.actionBtn} ${styles.deleteBtn}`}
                          onClick={() => handleDelete(s)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
