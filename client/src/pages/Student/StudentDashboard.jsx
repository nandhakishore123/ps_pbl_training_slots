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
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Outfit:wght@600;700;800;900&display=swap');

  :root {
    --purple:      #6c47ff;
    --purple-dim:  rgba(108,71,255,0.1);
    --purple-glow: rgba(108,71,255,0.3);
    --bg:          #f0f2f8;
    --white:       #fff;
    --border:      #e5e4eb;
    --text:        #1a1a2e;
    --text2:       #6b7280;
    --text3:       #9ca3af;
    --green:       #10b981;
    --red:         #ef4444;
    --gold:        #f59e0b;
    --font-head:   'Outfit', sans-serif;
    --font-body:   'Plus Jakarta Sans', sans-serif;
  }

  body.dark-mode {
    --bg:     #0f0f1a;
    --white:  #1a1a2e;
    --border: #2d2d4e;
    --text:   #e8e6f0;
    --text2:  #a89ec9;
    --text3:  #6b6b8a;
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { min-height: 100vh; width: 100%; }
  body { background: var(--bg); font-family: var(--font-body); color: var(--text); -webkit-font-smoothing: antialiased; }

  /* ── HEADER ── */
  .pt-header {
    background: var(--white);
    border-bottom: 1px solid var(--border);
    padding: 16px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    position: sticky;
    top: 0;
    z-index: 100;
    box-shadow: 0 1px 8px rgba(0,0,0,0.05);
  }
  .pt-header-icon {
    width: 36px; height: 36px;
    border-radius: 10px;
    background: var(--purple-dim);
    display: flex; align-items: center; justify-content: center;
    font-size: 18px;
    flex-shrink: 0;
  }
  .pt-header-title {
    font-size: 18px; font-weight: 800;
    color: var(--text);
    font-family: var(--font-head);
  }
  .pt-header-sub {
    font-size: 12px;
    color: var(--text3);
    margin-top: 1px;
  }

  /* ── DARK TOGGLE ── */
  .pt-dark-toggle {
    background: none;
    border: 1.5px solid var(--border);
    border-radius: 20px;
    padding: 5px 11px;
    cursor: pointer;
    font-size: 13px;
    color: var(--text2);
    display: flex; align-items: center; gap: 5px;
    transition: all 0.2s;
    font-family: var(--font-body);
    font-weight: 600;
    white-space: nowrap;
  }
  .pt-dark-toggle:hover { border-color: var(--purple); color: var(--purple); }
  body.dark-mode .pt-dark-toggle { background: #1f1f3a; border-color: #2d2d4e; color: #a89ec9; }
  body.dark-mode .pt-dark-toggle:hover { border-color: var(--purple); color: var(--purple); }

  .pt-icon-btn {
    width: 36px; height: 36px;
    border-radius: 10px;
    background: none;
    border: 1.5px solid var(--border);
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    color: var(--text2);
    transition: all 0.2s;
  }
  .pt-icon-btn:hover { border-color: var(--purple); color: var(--purple); background: var(--purple-dim); }

  /* ── BOXES ── */
  .pt-boxes-col {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 20px 24px 0;
  }
  .pt-box {
    background: var(--white);
    border: 1.5px solid var(--border);
    border-radius: 14px;
    padding: 18px 20px;
    cursor: pointer;
    transition: all 0.22s;
    display: flex;
    align-items: center;
    gap: 14px;
    position: relative;
  }
  .pt-box:hover {
    border-color: var(--purple);
    box-shadow: 0 4px 16px rgba(108,71,255,0.1);
  }
  .pt-box.active {
    border-color: var(--purple);
    background: rgba(108,71,255,0.04);
  }
  .pt-box-icon-wrap {
    width: 44px; height: 44px;
    border-radius: 12px;
    background: var(--purple-dim);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .pt-box-icon-wrap svg { width: 22px; height: 22px; color: var(--purple); }
  .pt-box-info { flex: 1; }
  .pt-box-label { font-size: 15px; font-weight: 700; color: var(--text); }
  .pt-box-desc  { font-size: 12px; color: var(--text2); margin-top: 2px; }
  .pt-box-arrow { color: var(--text3); font-size: 20px; transition: color 0.2s; }
  .pt-box.active .pt-box-arrow { color: var(--purple); }

  /* ── DARK MODE ── */
  body.dark-mode .pt-header { background: #151525; border-bottom: 1px solid #2d2d4e; }
  body.dark-mode .pt-box    { background: #1a1a2e; border-color: #2d2d4e; }
  body.dark-mode .pt-icon-btn { background: #1f1f3a; border-color: #2d2d4e; color: #a89ec9; }

  /* ── RESPONSIVE ── */
  @media (max-width: 640px) {
    .pt-header {
      padding: 12px 16px;
      flex-wrap: nowrap;
    }
    .pt-header-left {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
      flex: 1 1 auto;
    }
    .pt-header-title {
      font-size: 15px;
    }
    .pt-header-sub {
      display: none;
      margin-top: 0px;
    }
    .pt-header-right-desktop {
      display: none !important;
    }
    .pt-header-right-mobile {
      display: flex !important;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
      width: auto;
      justify-content: flex-end;
      margin-top: 0;
    }

    .pt-dark-toggle {
      padding: 4px 9px;
      font-size: 12px;
    }

    .pt-icon-btn {
      width: 34px;
      height: 34px;
    }
    .pt-boxes-col {
      padding: 16px 16px 0;
      gap: 10px;
    }
    .pt-box {
      padding: 16px 14px;
      border-radius: 12px;
    }
    .pt-box-label { font-size: 14px; }
    .pt-box-desc  { font-size: 11px; }
  }

  @media (min-width: 641px) {
    .pt-header-right-mobile {
      display: none !important;
    }
    .pt-header-right-desktop {
      display: flex !important;
    }
  }

  /* ── BELL + UNREAD BADGE ── */
  .pt-bell-badge {
    position: absolute;
    top: -5px; right: -5px;
    min-width: 17px; height: 17px;
    padding: 0 4px;
    background: var(--red);
    color: #fff;
    border-radius: 9px;
    font-size: 10px;
    font-weight: 800;
    line-height: 1;
    display: flex; align-items: center; justify-content: center;
    border: 2px solid var(--white);
  }
  body.dark-mode .pt-bell-badge { border-color: #151525; }

  /* ── BELL DROPDOWN PANEL ── */
  .pt-bell-backdrop { position: fixed; inset: 0; z-index: 200; background: transparent; }
  .pt-bell-panel {
    position: fixed;
    top: 70px; right: 24px;
    width: 340px; max-width: calc(100vw - 32px);
    max-height: 70vh; overflow-y: auto;
    background: var(--white);
    border: 1.5px solid var(--border);
    border-radius: 14px;
    box-shadow: 0 12px 40px rgba(0,0,0,0.18);
    z-index: 201;
  }
  .pt-bell-panel-head {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 16px;
    font-size: 14px; font-weight: 800; color: var(--text);
    border-bottom: 1px solid var(--border);
    position: sticky; top: 0; background: var(--white);
  }
  .pt-bell-panel-count {
    font-size: 11px; font-weight: 700; color: var(--purple);
    background: var(--purple-dim); border-radius: 20px; padding: 2px 8px;
  }
  .pt-bell-item {
    padding: 12px 16px; border-bottom: 1px solid var(--border);
    cursor: pointer; transition: background 0.15s;
  }
  .pt-bell-item:last-child { border-bottom: none; }
  .pt-bell-item:hover { background: var(--purple-dim); }
  .pt-bell-item.unread { background: rgba(108,71,255,0.05); }
  .pt-bell-item-top { display: flex; align-items: center; gap: 7px; }
  .pt-bell-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--purple); flex-shrink: 0; }
  .pt-bell-item-title { font-size: 13px; font-weight: 800; color: var(--text); }
  .pt-bell-item-body { font-size: 12px; color: var(--text2); margin-top: 4px; line-height: 1.5; white-space: pre-wrap; }
  .pt-bell-item-date { font-size: 11px; color: var(--text3); margin-top: 6px; font-weight: 600; }
  .pt-bell-empty { padding: 30px 16px; text-align: center; color: var(--text3); font-size: 13px; font-weight: 600; }

  /* ── ONE-TIME ANNOUNCEMENT POPUP ── */
  .pt-pop-overlay {
    position: fixed; inset: 0; z-index: 1000;
    background: rgba(0,0,0,0.5);
    display: flex; align-items: center; justify-content: center;
    padding: 20px;
  }
  .pt-pop-card {
    background: var(--white);
    border: 1.5px solid var(--border);
    border-radius: 18px;
    padding: 28px 26px;
    width: 100%; max-width: 440px;
    box-shadow: 0 24px 60px rgba(0,0,0,0.3);
    max-height: 85vh; overflow-y: auto;
  }
  .pt-pop-badge {
    display: inline-block; font-size: 11px; font-weight: 800;
    text-transform: uppercase; letter-spacing: 1px;
    color: var(--purple); background: var(--purple-dim);
    border-radius: 20px; padding: 5px 12px; margin-bottom: 14px;
  }
  .pt-pop-title { font-size: 20px; font-weight: 800; color: var(--text); font-family: var(--font-head); line-height: 1.25; }
  .pt-pop-body { font-size: 14px; color: var(--text2); line-height: 1.6; margin-top: 12px; white-space: pre-wrap; }
  .pt-pop-date { font-size: 12px; color: var(--text3); font-weight: 600; margin-top: 14px; }
  .pt-pop-btn {
    margin-top: 22px; width: 100%;
    background: var(--purple); color: #fff; border: none;
    border-radius: 10px; padding: 12px; font-size: 14px; font-weight: 700;
    cursor: pointer; font-family: var(--font-body);
  }
  .pt-pop-btn:hover { opacity: 0.92; }
  .pt-pop-btn:disabled { opacity: 0.6; cursor: default; }

  /* ── FEEDBACK MODAL ── */
  .pt-fb-textarea {
    margin-top: 16px;
    width: 100%;
    padding: 12px 14px;
    border: 1.5px solid var(--border);
    border-radius: 10px;
    background: var(--bg);
    color: var(--text);
    font-family: var(--font-body);
    font-size: 14px;
    line-height: 1.5;
    resize: vertical;
    outline: none;
    transition: border-color 0.2s;
  }
  .pt-fb-textarea:focus { border-color: var(--purple); }
  .pt-fb-textarea::placeholder { color: var(--text3); }

  .pt-fb-devs {
    margin-top: 14px;
    padding: 12px 14px;
    background: var(--purple-dim);
    border: 1px solid var(--border);
    border-radius: 10px;
  }
  .pt-fb-devs-head { font-size: 12px; font-weight: 700; color: var(--text2); margin-bottom: 6px; }
  .pt-fb-dev { font-size: 11px; color: var(--text3); font-weight: 600; line-height: 1.6; }

  .pt-fb-actions { display: flex; gap: 10px; margin-top: 20px; }
  .pt-fb-cancel {
    background: none;
    border: 1.5px solid var(--border);
    border-radius: 10px;
    padding: 12px 18px;
    font-size: 14px;
    font-weight: 700;
    color: var(--text2);
    cursor: pointer;
    font-family: var(--font-body);
    transition: all 0.2s;
  }
  .pt-fb-cancel:hover { border-color: var(--purple); color: var(--purple); }
  .pt-fb-cancel:disabled { opacity: 0.6; cursor: default; }

  @media (max-width: 640px) {
    .pt-bell-panel { top: 60px; right: 16px; }
  }
`

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

  // Inject CSS on mount
  useEffect(() => {
    const el = document.createElement('style')
    el.id    = 'fp-styles'
    el.innerHTML = CSS
    if (!document.getElementById('fp-styles')) document.head.appendChild(el)
    return () => { const s = document.getElementById('fp-styles'); if (s) s.remove() }
  }, [])

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

        {/* Training Slots box */}
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