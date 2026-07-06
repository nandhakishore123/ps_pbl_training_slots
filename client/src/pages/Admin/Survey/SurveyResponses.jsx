import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import styles from './Survey.module.css'
import Header from '../Header/Header'
import SectionCard from '../../../components/ui/SectionCard'
import { useApp } from '../context/AppContext'
import { adminService } from '../../../services/features/adminService'

function formatDate(ts) {
  if (!ts) return '—'
  try {
    const d = new Date(ts)
    return d.toLocaleString(undefined, {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return String(ts)
  }
}

function yearLabel(y) {
  if (!y) return ''
  return `${y}${['', 'st', 'nd', 'rd', 'th'][y] || 'th'} Year`
}

export default function SurveyResponses() {
  const { id } = useParams()
  const { showToast, navigate } = useApp()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminService.getSurveyResponses(id)
      setData(res?.data || null)
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to load responses', true)
      // If the survey no longer exists, send the admin back to the list.
      if (err?.response?.status === 404) navigate('/survey')
    } finally {
      setLoading(false)
    }
  }, [id, showToast, navigate])

  useEffect(() => { load() }, [load])

  // Blob download — cloned from the activity-points CSV export pattern.
  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await adminService.exportSurveyResponsesCsv(id)
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `survey-${id}-responses.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to export CSV', true)
    } finally {
      setExporting(false)
    }
  }

  const summary = data?.summary
  const questions = data?.questions || []
  const respondents = data?.respondents || []
  const total = Number(summary?.total_respondents || 0)

  return (
    <div className={styles.page}>
      <Header showBack />

      <div className={styles.content}>
        <div className={styles.resHeadRow}>
          <div>
            <div className={styles.pageTitle}>{summary?.title || 'Survey Responses'}</div>
            <div className={styles.pageSub}>
              {loading ? 'Loading…' : `${total} ${total === 1 ? 'respondent' : 'respondents'}`}
            </div>
          </div>
          <button
            className={styles.exportBtn}
            onClick={handleExport}
            disabled={exporting || loading || total === 0}
          >
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>

        {loading ? (
          <SectionCard><div className={styles.empty}>Loading…</div></SectionCard>
        ) : (
          <>
            {/* PER-QUESTION BREAKDOWN */}
            <SectionCard>
              <div className={styles.formTitle}>Question Breakdown</div>
              {questions.length === 0 ? (
                <div className={styles.empty}>This survey has no questions</div>
              ) : (
                questions.map((q, qi) => (
                  <div key={q.question_id} className={styles.qBlock}>
                    <div className={styles.qTitle}>
                      {qi + 1}. {q.question_text}
                      <span className={styles.qType}>
                        {q.question_type === 'multi' ? '(multiple choice)' : '(single choice)'}
                      </span>
                    </div>
                    {q.options.map((opt) => {
                      const cnt = Number(opt.count || 0)
                      const pct = total > 0 ? Math.round((cnt / total) * 100) : 0
                      return (
                        <div key={opt.option_id} className={styles.optRow}>
                          <div className={styles.optRowTop}>
                            <span>{opt.option_text}</span>
                            <span className={styles.optCount}>{cnt} ({pct}%)</span>
                          </div>
                          <div className={styles.bar}>
                            <div className={styles.barFill} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))
              )}
            </SectionCard>

            {/* RESPONDENTS */}
            <SectionCard noPadding>
              <div className={styles.listHead}>
                <span>Respondents</span>
                <span className={styles.count}>{respondents.length}</span>
              </div>
              {respondents.length === 0 ? (
                <div className={styles.empty}>No responses yet</div>
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.respTable}>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Reg No</th>
                        <th>Course · Year</th>
                        <th>Submitted</th>
                        <th>Answers</th>
                      </tr>
                    </thead>
                    <tbody>
                      {respondents.map((r) => (
                        <tr key={r.student_id}>
                          <td className={styles.respName}>{r.name || '—'}</td>
                          <td>{r.reg_num || '—'}</td>
                          <td>{[r.course, yearLabel(r.year_of_study)].filter(Boolean).join(' · ') || '—'}</td>
                          <td>{formatDate(r.submitted_at)}</td>
                          <td className={styles.respAns}>
                            {r.answers.length === 0 ? '—' : r.answers.map((a) => {
                              const q = questions.find((x) => Number(x.question_id) === Number(a.question_id))
                              return (
                                <div key={a.question_id}>
                                  <span className={styles.respAnsQ}>{q ? q.question_text : `Q${a.question_id}`}:</span>{' '}
                                  {a.option_texts.join('; ')}
                                </div>
                              )
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          </>
        )}
      </div>
    </div>
  )
}
