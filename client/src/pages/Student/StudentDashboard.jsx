// FrontPage.jsx — Complete Standalone File
// Extracted 100% from index_working.html
// CSS included inside — no external imports needed
// Usage: import FrontPage from './FrontPage.jsx'
//        <FrontPage onSelectPoints={() => {}} onSelectTraining={() => {}} />

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../../services/features/authService'
import { trainingService } from '../../services/features/trainingService'
import { useAuthStore } from '../../store/authStore'
import UserProfileBadge from '../../components/UserProfileBadge'
import { useStore } from '../../store/useStore'
// Dashboard styles moved from an injected <style> tag to a real stylesheet so
// Vite links them before first paint (no unstyled flash). CSS text unchanged.
import './StudentDashboard.css'
// ===== WELCOME INTRO (removable: delete this block + the WelcomeIntro import + the showIntro state) =====
import WelcomeIntro from '../../components/WelcomeIntro'
// ===== END WELCOME INTRO =====

function formatAnnDate(ts) {
  if (!ts) return ''
  try {
    return new Date(ts).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return String(ts)
  }
}

function UserIdentity({ user }) {
  if (!user) return null

  const name = user?.name || 'User'
  const initials = String(name).trim()?.charAt(0)?.toUpperCase() || 'U'

  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'4px 14px 4px 4px', background:'var(--white)', border:'1.5px solid var(--border)', borderRadius:50 }}>
      <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--purple-dim)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:800, color:'var(--purple)', overflow:'hidden' }}>
        {initials}
      </div>
      <div style={{ fontSize:13, fontWeight:800, color:'var(--text)', maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</div>
    </div>
  )
}

// Compact pill for mobile: avatar initial + truncated name
function UserIdentityMobile({ user }) {
  if (!user) return null

  const name = user?.name || 'User'
  const initials = String(name).trim()?.charAt(0)?.toUpperCase() || 'U'

  return (
    <div style={{ display:'flex', alignItems:'center', gap:7, padding:'3px 10px 3px 3px', background:'var(--white)', border:'1.5px solid var(--border)', borderRadius:50, maxWidth:130 }}>
      <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--purple-dim)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, color:'var(--purple)', flexShrink:0 }}>
        {initials}
      </div>
      <div style={{ fontSize:12, fontWeight:700, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</div>
    </div>
  )
}

// ── CSS — extracted from index_working.html ───────────────────
// Dashboard CSS now lives in ./StudentDashboard.css (imported above) so Vite
// links it before first paint. Moved verbatim; the Google Fonts @import that
// was at the top of this block now loads via a <link> in client/index.html.

// ── Main FrontPage Component ──────────────────────────────────
export default function FrontPage({ onSelectPoints, onSelectTraining }) {
  const [activeBox, setActiveBox] = useState(null)
  const [darkMode,  setDarkMode]  = useState(() => localStorage.getItem('pt-dark') === '1')
  const { user } = useAuthStore()

  // ===== WELCOME INTRO (removable: delete this block + the WelcomeIntro import + the render block) =====
  // Show the intro ONLY right after a real login. Login.jsx sets 'pt_show_intro'
  // on a successful sign-in; we read it once, then clear it immediately so a
  // refresh / re-navigation / fresh tab never replays it (until the next login).
  const [showIntro, setShowIntro] = useState(() => sessionStorage.getItem('pt_show_intro') === '1')
  const introFirstName = String(user?.name || '').trim().split(/\s+/)[0] || ''
  useEffect(() => { sessionStorage.removeItem('pt_show_intro') }, [])
  const handleIntroDone = () => {
    sessionStorage.removeItem('pt_show_intro')
    setShowIntro(false)
  }
  // ===== END WELCOME INTRO =====

  // ── Announcements: bell dropdown + one-time login popup ──
  const [announcements, setAnnouncements] = useState([])
  const [bellOpen, setBellOpen] = useState(false)
  const [popup, setPopup] = useState(null)

  const unreadCount = announcements.filter((a) => !a.read_at).length

  // ── Surveys: bell dropdown + take-survey modal ──
  const [surveys, setSurveys] = useState([])
  const [surveyBellOpen, setSurveyBellOpen] = useState(false)
  const [activeSurvey, setActiveSurvey] = useState(null)   // full detail loaded in the modal
  const [surveyAnswers, setSurveyAnswers] = useState({})   // question_id -> array of option_ids
  const [surveyLoading, setSurveyLoading] = useState(false)
  const [surveySubmitting, setSurveySubmitting] = useState(false)

  // Badge = surveys not yet submitted by this student.
  const pendingSurveyCount = surveys.filter((s) => !s.submitted).length

  // ── Feedback: modal + form ──
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedbackText, setFeedbackText] = useState('')
  const [fbSubmitting, setFbSubmitting] = useState(false)

  const store = useStore()
  const showToast = store?.showToast

  const navigate = useNavigate();

  const submitFeedback = async () => {
    const msg = feedbackText.trim()
    if (!msg) { showToast?.('Please write your feedback first', true); return }
    setFbSubmitting(true)
    try {
      await trainingService.submitFeedback(msg)
      showToast?.('Thank you! Feedback submitted')
      setFeedbackText('')
      setFeedbackOpen(false)
    } catch (err) {
      showToast?.(err?.response?.data?.message || 'Failed to submit feedback', true)
    } finally {
      setFbSubmitting(false)
    }
  }

  const handleLogout = async () => {
    try {
      await authService.logout()
    } finally {
      navigate('/auth/login', { replace: true })
    }
  }

  // Dashboard CSS is now imported from ./StudentDashboard.css (see top of file),
  // so it is present before first paint — no runtime <style> injection needed.

  // Dark mode
  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode)
    localStorage.setItem('pt-dark', darkMode ? '1' : '0')
  }, [darkMode])

  // Fetch this student's announcements on mount; auto-pop the newest unseen one.
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await trainingService.getStudentAnnouncements()
        if (!alive) return
        const items = res?.data?.items || []
        setAnnouncements(items)
        // Server returns newest-first; show the first one never shown as a popup.
        const unseen = items.find((a) => !a.seen_at)
        if (unseen) setPopup(unseen)
      } catch {
        /* silent — announcements are non-critical */
      }
    })()
    return () => { alive = false }
  }, [])

  // Close the one-time popup and persist seen_at so it never auto-pops again.
  const closePopup = async () => {
    const a = popup
    setPopup(null)
    if (!a) return
    setAnnouncements((prev) =>
      prev.map((x) => (x.announcement_id === a.announcement_id ? { ...x, seen_at: new Date().toISOString() } : x))
    )
    try { await trainingService.markAnnouncementSeen(a.announcement_id) } catch { /* ignore */ }
  }

  // Open an announcement from the bell → mark read (decrements unread count).
  const openAnnouncement = async (a) => {
    if (a.read_at) return
    setAnnouncements((prev) =>
      prev.map((x) => (x.announcement_id === a.announcement_id ? { ...x, read_at: new Date().toISOString() } : x))
    )
    try { await trainingService.markAnnouncementRead(a.announcement_id) } catch { /* ignore */ }
  }

  // Fetch this student's targeted surveys on mount (non-critical, silent on error).
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await trainingService.getStudentSurveys()
        if (!alive) return
        setSurveys(res?.data?.items || [])
      } catch {
        /* silent — surveys are non-critical */
      }
    })()
    return () => { alive = false }
  }, [])

  // Open a survey from the bell → load full detail into the modal. Seed selections
  // from any prior submission (selected_option_ids) so submitted surveys render read-only.
  const openSurvey = async (s) => {
    setSurveyBellOpen(false)
    setSurveyLoading(true)
    setActiveSurvey({ survey_id: s.survey_id, title: s.title, description: s.description, submitted: s.submitted, questions: null })
    try {
      const res = await trainingService.getStudentSurvey(s.survey_id)
      const detail = res?.data
      if (!detail) throw new Error('empty')
      const seeded = {}
      for (const q of detail.questions || []) {
        seeded[q.question_id] = Array.isArray(q.selected_option_ids) ? [...q.selected_option_ids] : []
      }
      setSurveyAnswers(seeded)
      setActiveSurvey(detail)
    } catch {
      showToast?.('Failed to load survey', true)
      setActiveSurvey(null)
    } finally {
      setSurveyLoading(false)
    }
  }

  const closeSurveyModal = () => {
    if (surveySubmitting) return
    setActiveSurvey(null)
    setSurveyAnswers({})
  }

  // Toggle an option. single → replace with the single choice; multi → add/remove.
  const toggleSurveyOption = (question, optionId) => {
    if (activeSurvey?.submitted) return
    setSurveyAnswers((prev) => {
      const current = prev[question.question_id] || []
      if (question.question_type === 'single') {
        return { ...prev, [question.question_id]: [optionId] }
      }
      const has = current.includes(optionId)
      return {
        ...prev,
        [question.question_id]: has ? current.filter((id) => id !== optionId) : [...current, optionId],
      }
    })
  }

  // Required-all: every question must have at least one selected option.
  const allSurveyAnswered =
    Array.isArray(activeSurvey?.questions) &&
    activeSurvey.questions.length > 0 &&
    activeSurvey.questions.every((q) => (surveyAnswers[q.question_id] || []).length > 0)

  const submitSurvey = async () => {
    if (!activeSurvey || !Array.isArray(activeSurvey.questions)) return
    if (!allSurveyAnswered) { showToast?.('Please answer every question', true); return }
    const surveyId = activeSurvey.survey_id
    const answers = activeSurvey.questions.map((q) => ({
      question_id: q.question_id,
      option_ids: [...(surveyAnswers[q.question_id] || [])],
    }))
    setSurveySubmitting(true)
    try {
      await trainingService.submitStudentSurvey(surveyId, answers)
      showToast?.('Survey submitted. Thank you!')
      // Optimistic: flip this survey to submitted so the badge decrements.
      setSurveys((prev) =>
        prev.map((s) => (s.survey_id === surveyId ? { ...s, submitted: true, submitted_at: new Date().toISOString() } : s))
      )
      setActiveSurvey(null)
      setSurveyAnswers({})
    } catch (err) {
      if (err?.response?.status === 409) {
        showToast?.('You have already submitted this survey', true)
        setSurveys((prev) =>
          prev.map((s) => (s.survey_id === surveyId ? { ...s, submitted: true } : s))
        )
        setActiveSurvey(null)
        setSurveyAnswers({})
      } else {
        showToast?.(err?.response?.data?.message || 'Failed to submit survey', true)
      }
    } finally {
      setSurveySubmitting(false)
    }
  }

  // selectBox — extracted from selectBox() in original
  function selectBox(box) {
    setActiveBox(box)
    if (box === 'points')  onSelectPoints?.()
    else                   onSelectTraining?.()
  }

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }}>

      {/* ===== WELCOME INTRO (removable: delete this block + the WelcomeIntro import + the showIntro state) ===== */}
      {showIntro && <WelcomeIntro name={introFirstName} onDone={handleIntroDone} />}
      {/* ===== END WELCOME INTRO ===== */}

      {/* ── Header ── */}
      <div className="pt-header">

        {/* Left: icon + title */}
        <div className="pt-header-left" style={{ display:'flex', alignItems:'center', gap:10, minWidth:0, flex:1 }}>
          <div className="pt-header-icon">🏅</div>
          <div style={{ minWidth:0 }}>
            <div className="pt-header-title">Points &amp; Training</div>
            <div className="pt-header-sub">Reward Points, Activity Points &amp; Training Slots</div>
          </div>
        </div>

        {/* Right: desktop (UserIdentity + bell + dark toggle + logout) */}
        <div className="pt-header-right-desktop" style={{ alignItems:'center', gap:10 }}>
          <UserProfileBadge user={user} variant="desktop" />
          <button
            type="button"
            className="pt-icon-btn"
            onClick={() => setBellOpen((o) => !o)}
            aria-label="Announcements"
            title="Announcements"
            style={{ position:'relative' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unreadCount > 0 && <span className="pt-bell-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </button>
          <button
            type="button"
            className="pt-icon-btn"
            onClick={() => setSurveyBellOpen((o) => !o)}
            aria-label="Surveys"
            title="Surveys"
            style={{ position:'relative' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 2h6a1 1 0 0 1 1 1v1h1a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1V3a1 1 0 0 1 1-1z" />
              <path d="M9 12h6" />
              <path d="M9 16h6" />
            </svg>
            {pendingSurveyCount > 0 && <span className="pt-bell-badge">{pendingSurveyCount > 9 ? '9+' : pendingSurveyCount}</span>}
          </button>
          <button className="pt-dark-toggle" onClick={() => setDarkMode(d => !d)}>
            {darkMode ? '☀ Light' : '🌙 Dark'}
          </button>
          <button
            type="button"
            className="pt-icon-btn"
            onClick={handleLogout}
            aria-label="Logout"
            title="Logout"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M10 7V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M15 12H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 9l-3 3 3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Right: mobile (user pill + bell + dark toggle) */}
        <div className="pt-header-right-mobile">
          <UserProfileBadge user={user} variant="mobile" />
          <button
            type="button"
            className="pt-icon-btn"
            onClick={() => setBellOpen((o) => !o)}
            aria-label="Announcements"
            title="Announcements"
            style={{ position:'relative' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unreadCount > 0 && <span className="pt-bell-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </button>
          <button
            type="button"
            className="pt-icon-btn"
            onClick={() => setSurveyBellOpen((o) => !o)}
            aria-label="Surveys"
            title="Surveys"
            style={{ position:'relative' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 2h6a1 1 0 0 1 1 1v1h1a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1V3a1 1 0 0 1 1-1z" />
              <path d="M9 12h6" />
              <path d="M9 16h6" />
            </svg>
            {pendingSurveyCount > 0 && <span className="pt-bell-badge">{pendingSurveyCount > 9 ? '9+' : pendingSurveyCount}</span>}
          </button>
          <button className="pt-dark-toggle" onClick={() => setDarkMode(d => !d)}>
            {darkMode ? '☀ Light' : 'Dark'}
          </button>
          <button
            type="button"
            className="pt-icon-btn"
            onClick={handleLogout}
            aria-label="Logout"
            title="Logout"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M10 7V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M15 12H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 9l-3 3 3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

      </div>

      {/* ── Bell dropdown panel ── */}
      {bellOpen && (
        <>
          <div className="pt-bell-backdrop" onClick={() => setBellOpen(false)} />
          <div className="pt-bell-panel">
            <div className="pt-bell-panel-head">
              <span>Announcements</span>
              {unreadCount > 0 && <span className="pt-bell-panel-count">{unreadCount} unread</span>}
            </div>
            {announcements.length === 0 ? (
              <div className="pt-bell-empty">No announcements</div>
            ) : (
              announcements.map((a) => (
                <div
                  key={a.announcement_id}
                  className={`pt-bell-item${!a.read_at ? ' unread' : ''}`}
                  onClick={() => openAnnouncement(a)}
                >
                  <div className="pt-bell-item-top">
                    {!a.read_at && <span className="pt-bell-dot" />}
                    <span className="pt-bell-item-title">{a.title}</span>
                  </div>
                  <div className="pt-bell-item-body">{a.body}</div>
                  <div className="pt-bell-item-date">{formatAnnDate(a.created_at)}</div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* ── Survey dropdown panel ── */}
      {surveyBellOpen && (
        <>
          <div className="pt-bell-backdrop" onClick={() => setSurveyBellOpen(false)} />
          <div className="pt-bell-panel">
            <div className="pt-bell-panel-head">
              <span>Surveys</span>
              {pendingSurveyCount > 0 && <span className="pt-bell-panel-count">{pendingSurveyCount} pending</span>}
            </div>
            {surveys.length === 0 ? (
              <div className="pt-bell-empty">No surveys</div>
            ) : (
              surveys.map((s) => (
                <div
                  key={s.survey_id}
                  className={`pt-bell-item${!s.submitted ? ' unread' : ''}`}
                  onClick={() => openSurvey(s)}
                >
                  <div className="pt-bell-item-top">
                    {!s.submitted && <span className="pt-bell-dot" />}
                    <span className="pt-bell-item-title">{s.title}</span>
                  </div>
                  {s.description && <div className="pt-bell-item-body">{s.description}</div>}
                  <div className="pt-bell-item-date">{s.submitted ? '✓ Submitted' : 'Not answered'}</div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* ── Take-survey modal ── */}
      {activeSurvey && (
        <div className="pt-pop-overlay" onClick={closeSurveyModal}>
          <div className="pt-pop-card" onClick={(e) => e.stopPropagation()}>
            <div className="pt-pop-badge">📋 Survey</div>
            <div className="pt-pop-title">{activeSurvey.title}</div>
            {activeSurvey.description && (
              <div className="pt-pop-body" style={{ marginTop: 8 }}>{activeSurvey.description}</div>
            )}

            {surveyLoading || !Array.isArray(activeSurvey.questions) ? (
              <div className="pt-bell-empty">Loading…</div>
            ) : (
              <>
                {activeSurvey.submitted && (
                  <div className="pt-pop-date" style={{ marginTop: 14, color: 'var(--green)' }}>
                    ✓ You have already submitted this survey
                  </div>
                )}

                <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {activeSurvey.questions.map((q, qi) => {
                    const selected = surveyAnswers[q.question_id] || []
                    const isMulti = q.question_type === 'multi'
                    return (
                      <div key={q.question_id}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                          {qi + 1}. {q.question_text}
                          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginLeft: 6 }}>
                            {isMulti ? '(select all that apply)' : '(select one)'}
                          </span>
                        </div>
                        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {q.options.map((opt) => {
                            const checked = selected.includes(opt.option_id)
                            return (
                              <label
                                key={opt.option_id}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 10,
                                  padding: '10px 12px',
                                  border: `1.5px solid ${checked ? 'var(--purple)' : 'var(--border)'}`,
                                  borderRadius: 10,
                                  background: checked ? 'var(--purple-dim)' : 'var(--bg)',
                                  cursor: activeSurvey.submitted ? 'default' : 'pointer',
                                  fontSize: 13, color: 'var(--text)',
                                }}
                              >
                                <input
                                  type={isMulti ? 'checkbox' : 'radio'}
                                  name={`survey-q-${q.question_id}`}
                                  checked={checked}
                                  disabled={activeSurvey.submitted}
                                  onChange={() => toggleSurveyOption(q, opt.option_id)}
                                  style={{ accentColor: 'var(--purple)', width: 16, height: 16, flexShrink: 0 }}
                                />
                                <span>{opt.option_text}</span>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="pt-fb-actions">
                  <button className="pt-fb-cancel" onClick={closeSurveyModal} disabled={surveySubmitting}>
                    {activeSurvey.submitted ? 'Close' : 'Cancel'}
                  </button>
                  {!activeSurvey.submitted && (
                    <button
                      className="pt-pop-btn"
                      style={{ marginTop: 0, flex: 1 }}
                      onClick={submitSurvey}
                      disabled={surveySubmitting || !allSurveyAnswered}
                    >
                      {surveySubmitting ? 'Submitting…' : 'Submit'}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── One-time announcement popup ── */}
      {popup && (
        <div className="pt-pop-overlay" onClick={closePopup}>
          <div className="pt-pop-card" onClick={(e) => e.stopPropagation()}>
            <div className="pt-pop-badge">📢 Announcement</div>
            <div className="pt-pop-title">{popup.title}</div>
            <div className="pt-pop-body">{popup.body}</div>
            <div className="pt-pop-date">{formatAnnDate(popup.created_at)}</div>
            <button className="pt-pop-btn" onClick={closePopup}>Got it</button>
          </div>
        </div>
      )}

      {/* ── Feedback modal ── */}
      {feedbackOpen && (
        <div className="pt-pop-overlay" onClick={() => !fbSubmitting && setFeedbackOpen(false)}>
          <div className="pt-pop-card" onClick={(e) => e.stopPropagation()}>
            <div className="pt-pop-badge">💬 Feedback</div>
            <div className="pt-pop-title">Share your feedback</div>
            <div className="pt-pop-body" style={{ marginTop: 8 }}>
              Tell us what's working, what's not, or what you'd like to see.
            </div>
            <textarea
              className="pt-fb-textarea"
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Type your feedback here…"
              rows={5}
              maxLength={2000}
            />
            <div className="pt-fb-devs">
              <div className="pt-fb-devs-head" style={{ fontWeight: 600, lineHeight: 1.6, marginBottom: 0 }}>
                Feel free to share your feedback. Your suggestions will be recorded and reviewed by the management. Every response helps us improve the portal.
              </div>
            </div>
            <div className="pt-fb-actions">
              <button
                className="pt-fb-cancel"
                onClick={() => setFeedbackOpen(false)}
                disabled={fbSubmitting}
              >
                Cancel
              </button>
              <button
                className="pt-pop-btn"
                style={{ marginTop: 0, flex: 1 }}
                onClick={submitFeedback}
                disabled={fbSubmitting}
              >
                {fbSubmitting ? 'Submitting…' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Two Boxes ── */}
      <div className="pt-boxes-col">

        {/* Points Dashboard box */}
        <div
          className={`pt-box${activeBox === 'points' ? ' active' : ''}`}
          onClick={() => {selectBox('points'),navigate("/points-page")}}
        >
          <div className="pt-box-icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="18" y="3"  width="4" height="18" />
              <rect x="10" y="8"  width="4" height="13" />
              <rect x="2"  y="13" width="4" height="8"  />
            </svg>
          </div>
          <div className="pt-box-info">
            <div className="pt-box-label">Points Dashboard</div>
            <div className="pt-box-desc">Reward &amp; Activity Points Rankings</div>
          </div>
          <span className="pt-box-arrow">›</span>
        </div>

        {/* HIDDEN: Training Slots card - delete this comment line and the two comment markers below to restore. The /training-slots route still works if visited directly. */}
        {/*
        <div
          className={`pt-box${activeBox === 'slots' ? ' active' : ''}`}
          onClick={() => {selectBox('/slots'), navigate("/training-slots")}}
        >
          <div className="pt-box-icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2"  x2="16" y2="6"  />
              <line x1="8"  y1="2"  x2="8"  y2="6"  />
              <line x1="3"  y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div className="pt-box-info">
            <div className="pt-box-label">Training Slots</div>
            <div className="pt-box-desc">PS &amp; PBL Lab Booking</div>
          </div>
          <span className="pt-box-arrow">›</span>
        </div>
        */}

        {/* Feedback box */}
        <div
          className="pt-box"
          onClick={() => setFeedbackOpen(true)}
        >
          <div className="pt-box-icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div className="pt-box-info">
            <div className="pt-box-label">Feedback</div>
            <div className="pt-box-desc">Share suggestions with the developers</div>
          </div>
          <span className="pt-box-arrow">›</span>
        </div>

        {/* Inventory Request box */}
        <div
          className="pt-box"
          onClick={() => navigate('/inventory-request')}
        >
          <div className="pt-box-icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 7l-8-4-8 4 8 4 8-4z" />
              <path d="M4 7v10l8 4 8-4V7" />
              <path d="M12 11v10" />
            </svg>
          </div>
          <div className="pt-box-info">
            <div className="pt-box-label">Inventory Request</div>
            <div className="pt-box-desc">Request lab items &amp; track approvals</div>
          </div>
          <span className="pt-box-arrow">›</span>
        </div>

      </div>
    </div>
  )
}