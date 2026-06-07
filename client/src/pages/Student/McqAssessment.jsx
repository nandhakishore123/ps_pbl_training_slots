import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { trainingService } from "../../services/features/trainingService";

function useIsNarrow(maxWidthPx = 640) {
  const [isNarrow, setIsNarrow] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(`(max-width: ${maxWidthPx}px)`).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia(`(max-width: ${maxWidthPx}px)`);
    const onChange = (e) => setIsNarrow(e.matches);
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else mq.addListener(onChange);
    setIsNarrow(mq.matches);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", onChange);
      else mq.removeListener(onChange);
    };
  }, [maxWidthPx]);

  return isNarrow;
}

// ── shuffle helper ──────────────────────────────────────────
function shuffleArr(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Icons ─────────────────────────────────────────────────────
const IcoMCQ  = () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="12" y2="16"/></svg>;
const IcoGuide= () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>;
const IcoScore= () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;

const P = "#6c47ff";

// ── Sidebar ───────────────────────────────────────────────────
function Sidebar({ active, setActive, isMobile, disabled }) {
  const items = [
    { id: "test",  icon: <IcoMCQ />,   label: "MCQ Test" },
    { id: "guide", icon: <IcoGuide />, label: "Guide"    },
    { id: "score", icon: <IcoScore />, label: "Score"    },
  ];
  return (
    <div style={{ width: isMobile ? "100%" : 52, height: isMobile ? 52 : "auto", background: "#1a1040", display: "flex", flexDirection: isMobile ? "row" : "column", alignItems: "center", padding: isMobile ? "6px 10px" : undefined, paddingTop: isMobile ? undefined : 12, gap: isMobile ? 8 : 4, flexShrink: 0, overflowX: isMobile ? "auto" : "hidden" }}>
      <div style={{ width: 30, height: 30, borderRadius: 8, background: P, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: isMobile ? 0 : 16, marginRight: isMobile ? 6 : 0, fontWeight: 900, color: "#fff", fontSize: 15, flexShrink: 0 }}>B</div>
      {items.map(it => (
        <button key={it.id} title={it.label} onClick={() => !disabled && setActive(it.id)} disabled={disabled}
          style={{ width: 40, height: 40, borderRadius: 8, border: "none", cursor: disabled ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: active === it.id ? "rgba(108,71,255,0.25)" : "transparent", color: active === it.id ? "#c4b5fd" : "#6b7280", transition: "all .18s", opacity: disabled ? 0.5 : 1 }}>
          {it.icon}
        </button>
      ))}
    </div>
  );
}

// ── Timer ring ────────────────────────────────────────────────
function TimerRing({ val, maxVal }) {
  const r = 18, c = 2 * Math.PI * r;
  const color = val <= 30 ? "#ef4444" : val <= 120 ? "#f59e0b" : P;
  return (
    <div style={{ position: "relative", width: 52, height: 52, flexShrink: 0 }}>
      <svg width="52" height="52" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="26" cy="26" r={r} fill="none" stroke="rgba(108,71,255,.15)" strokeWidth="3"/>
        <circle cx="26" cy="26" r={r} fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={c} strokeDashoffset={c * (1 - val / (maxVal || 1))} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset .9s linear, stroke .5s" }}/>
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 15, color, fontFamily: "monospace" }}>{val > 99 ? 99 : val}</div>
    </div>
  );
}

// ── Warning popup ─────────────────────────────────────────────
function WarningPopup({ count, onDismiss }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", border: "2px solid #ef4444", borderRadius: 18, padding: "32px 28px", maxWidth: 380, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#ef4444", marginBottom: 10 }}>
          Warning {count} of 2{count === 2 ? " — Final Warning" : ""}
        </div>
        <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6, marginBottom: 22 }}>
          {count === 1
            ? "You left the assessment window! This is your first warning (1 of 2). One more violation and the NEXT switch will auto-submit your test immediately."
            : "This is your FINAL warning (2 of 2)! If you leave the assessment window ONE MORE TIME, your test will be automatically submitted with your current answers and marked as MALPRACTICE."}
        </div>
        <button onClick={onDismiss}
          style={{ padding: "12px 28px", background: P, border: "none", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
          I Understand — Continue
        </button>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────
export default function MCQAssessment() {
  const isMobile = useIsNarrow(640);
  const location = useLocation();
  const navigate = useNavigate();
  const { trainingSkillId, levelId, bookingId, levelName } = location.state || {};

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [studentAssessmentId, setStudentAssessmentId] = useState(null);
  
  const [sideActive, setSideActive] = useState("test");
  const [phase, setPhase] = useState("intro"); // intro | running | done
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [userAnswers, setUserAnswers] = useState({}); // { questionIndex: selectedOptionIndex }
  const [activeTypeTab, setActiveTypeTab] = useState("");

  const [totalSecondsLeft, setTotalSecondsLeft] = useState(0);
  const userAnswersRef = useRef(userAnswers);
  useEffect(() => {
    userAnswersRef.current = userAnswers;
  }, [userAnswers]);
  const [warnings, setWarnings] = useState(0);
  const [showWarn, setShowWarn] = useState(false);
  const [autoSubmit, setAutoSubmit] = useState(false);
  const [result, setResult] = useState(null);

  const timerRef = useRef(null);

  // ── Fetch Assessment Details on Mount ────────────────────────
  useEffect(() => {
    if (!trainingSkillId || !levelId) {
      setError("Assessment context missing. Please navigate from the slots page.");
      setLoading(false);
      return;
    }

    const fetchDetails = async () => {
      try {
        const res = await trainingService.getAssessment(trainingSkillId, levelId);
        setAssessment(res.data);
        
        // Setup initial total timer duration
        setTotalSecondsLeft(res.data.duration_minutes * 60);

        if (res.data.typeConfigs && res.data.typeConfigs.length > 0) {
          setActiveTypeTab(res.data.typeConfigs[0].mcq_type_name);
        }
      } catch (err) {
        console.error("Failed to load assessment:", err);
        setError(err.response?.data?.message || "Failed to load assessment details from backend.");
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [trainingSkillId, levelId]);

  // ── Start Test ──────────────────────────────────────────────
  const startTest = async () => {
    if (!assessment) return;
    try {
      setLoading(true);
      const res = await trainingService.startAssessment({
        assessmentId: assessment.assessment_id,
        totalMarks: assessment.total_marks
      });

      const rawQs = res.data.questions || [];
      if (rawQs.length === 0) {
        throw new Error("No questions available in the database for this assessment.");
      }

      // Format & shuffle options of questions
      const formatted = rawQs.map(q => {
        const optionsRaw = [q.option_a, q.option_b, q.option_c, q.option_d];
        const letters = ['A', 'B', 'C', 'D'];
        const idx = shuffleArr([0, 1, 2, 3]);
        return {
          mcq_question_id: q.mcq_question_id,
          q: q.question_text,
          options: idx.map(i => optionsRaw[i]),
          optionKeys: idx.map(i => letters[i]),
          correct_option: q.correct_option,
          marks: q.marks || 1,
          mcq_type_name: q.mcq_type_name
        };
      });

      setStudentAssessmentId(res.data.student_assessment_id);
      setQuestions(formatted);
      setUserAnswers({});
      setCurrent(0);
      setWarnings(0);
      setAutoSubmit(false);
      setTotalSecondsLeft(assessment.duration_minutes * 60);
      
      if (formatted.length > 0) {
        setActiveTypeTab(formatted[0].mcq_type_name);
      }

      setPhase("running");
      document.documentElement.requestFullscreen?.().catch(() => {});
    } catch (err) {
      alert(err.message || "Failed to start assessment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Submit Test ─────────────────────────────────────────────
  const submitTest = async (answersMap = userAnswers) => {
    clearInterval(timerRef.current);
    setLoading(true);
    try {
      const answersList = questions.map((q, idx) => {
        const selectedIdx = answersMap[idx];
        const selectedLetter = selectedIdx !== null && selectedIdx !== undefined ? q.optionKeys[selectedIdx] : null;
        return {
          mcq_question_id: q.mcq_question_id,
          selected_option: selectedLetter,
          correct_option: q.correct_option,
          marks: q.marks
        };
      });

      const res = await trainingService.submitAssessment(studentAssessmentId, {
        answers: answersList,
        passingMarks: assessment.passing_marks
      });

      setResult(res.data);
      setPhase("done");
      document.exitFullscreen?.().catch(() => {});
    } catch (err) {
      console.error("Failed to submit assessment:", err);
      alert("Submission failed. Your attempt was logged, but we couldn't record the score details.");
      setPhase("done");
    } finally {
      setLoading(false);
    }
  };

  // ── Auto-submit due to Malpractice ──────────────────────────
  const doAutoSubmit = async () => {
    clearInterval(timerRef.current);
    setAutoSubmit(true);
    setShowWarn(false);
    try {
      await trainingService.reportMalpractice(bookingId, { studentAssessmentId });
    } catch (err) {
      console.error("Failed to report malpractice:", err);
    }
    await submitTest(userAnswersRef.current);
  };

  // ── Total Duration Timer Effect ──────────────────────────────
  useEffect(() => {
    if (phase !== "running") return;
    clearInterval(timerRef.current);
    
    if (!showWarn) {
      timerRef.current = setInterval(() => {
        setTotalSecondsLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            submitTest(userAnswersRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [phase, showWarn]);

  // ── Anti-cheat Window Visibility Hook ────────────────────────
  // 2 warnings shown (1st and 2nd switch); 3rd switch → auto-submit
  useEffect(() => {
    if (phase !== "running" || !studentAssessmentId) return;
    const onVis = () => {
      if (document.hidden) {
        clearInterval(timerRef.current);
        setWarnings(w => {
          const nw = w + 1;
          if (nw >= 3) {
            // 3rd violation → auto-submit, no popup, keep counter at 2 to avoid "3/2" bug
            doAutoSubmit();
            return w; // stay at 2, never show 3/2
          }
          // 1st or 2nd violation → show warning popup
          setShowWarn(true);
          return nw;
        });
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [phase, studentAssessmentId, userAnswers]);

  const goNext = useCallback(() => {
    setCurrent(c => {
      const nextIdx = c + 1;
      if (nextIdx >= questions.length) {
        submitTest(userAnswersRef.current);
        return c;
      }
      setActiveTypeTab(questions[nextIdx].mcq_type_name);
      return nextIdx;
    });
  }, [questions]);

  const dismissWarn = () => {
    setShowWarn(false);
    document.documentElement.requestFullscreen?.().catch(() => {});
  };

  if (loading) {
    return (
      <div style={{ display: "flex", width: "100vw", height: "100vh", background: "#f4f3ff", justifyContent: "center", alignItems: "center", flexDirection: "column" }}>
        <div style={{ border: `4px solid rgba(108,71,255,0.15)`, borderTop: `4px solid ${P}`, borderRadius: "50%", width: 50, height: 50, animation: "spin 1s linear infinite" }} />
        <div style={{ marginTop: 16, fontSize: 15, fontWeight: 700, color: "#1a1a2e" }}>Loading Assessment...</div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: "flex", width: "100vw", height: "100vh", background: "#f4f3ff", justifyContent: "center", alignItems: "center", flexDirection: "column", padding: 20 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#ef4444", marginBottom: 8 }}>Error Loading Assessment</div>
        <div style={{ fontSize: 13, color: "#6b7280", maxWidth: 400, textAlign: "center", marginBottom: 20, lineHeight: 1.5 }}>{error}</div>
        <button onClick={() => navigate("/training-slots")} style={{ padding: "10px 24px", background: P, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: "pointer" }}>Back to Training Slots</button>
      </div>
    );
  }

  const q = questions[current];
  const prog = questions.length ? (current / questions.length) * 100 : 0;
  const uniqueCategories = Array.from(new Set(questions.map(item => item.mcq_type_name)));
  const selected = userAnswers[current] !== undefined ? userAnswers[current] : null;

  return (
    <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", height: isMobile ? "100dvh" : "100vh", background: "#f4f3ff", fontFamily: "'Segoe UI',system-ui,sans-serif", overflow: isMobile ? "auto" : "hidden" }}>
      <Sidebar active={sideActive} setActive={setSideActive} isMobile={isMobile} disabled={phase === "running"} />
      {showWarn && <WarningPopup count={warnings} onDismiss={dismissWarn} />}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {sideActive === "test" && (
          <>
            {/* ── INTRO ── */}
            {phase === "intro" && assessment && (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: isMobile ? 16 : 40, overflow: "auto" }}>
                <div style={{ background: "#fff", borderRadius: 20, padding: isMobile ? "28px 20px" : "40px 45px", maxWidth: 520, width: "100%", boxShadow: "0 8px 40px rgba(108,71,255,.12)", textAlign: "center" }}>
                  <div style={{ width: 64, height: 64, borderRadius: 16, background: "rgba(108,71,255,.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 28 }}>🔐</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#1a1a2e", marginBottom: 8 }}>{assessment.assessment_title || levelName}</div>
                  <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 20, lineHeight: 1.6 }}>
                    {assessment.duration_minutes} Minutes Duration • Dynamic Categories • Fullscreen Locked
                  </div>

                  {/* Section Tabs on Intro */}
                  <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 10, marginBottom: 15, justifyContent: "center" }}>
                    {assessment.typeConfigs?.map((cfg) => (
                      <button
                        key={cfg.config_id}
                        onClick={() => setActiveTypeTab(cfg.mcq_type_name)}
                        style={{
                          padding: "6px 14px",
                          borderRadius: 20,
                          border: "none",
                          background: activeTypeTab === cfg.mcq_type_name ? "rgba(108,71,255,0.15)" : "#f3f4f6",
                          color: activeTypeTab === cfg.mcq_type_name ? P : "#4b5563",
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer",
                          whiteSpace: "nowrap"
                        }}
                      >
                        {cfg.mcq_type_name}
                      </button>
                    ))}
                  </div>

                  {/* Type Description */}
                  {assessment.typeConfigs?.map((cfg) => {
                    if (cfg.mcq_type_name !== activeTypeTab) return null;
                    return (
                      <div key={cfg.config_id} style={{ background: "#f4f3ff", border: `1px dashed rgba(108,71,255,0.3)`, borderRadius: 10, padding: 14, textAlign: "left", marginBottom: 20 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: P, marginBottom: 3 }}>Category: {cfg.mcq_type_name}</div>
                        <div style={{ fontSize: 11, color: "#555", lineHeight: 1.4 }}>
                          Contains <strong>{cfg.question_count}</strong> questions. Suggested time: <strong>{cfg.question_count * (assessment ? Math.round((assessment.duration_minutes * 60) / (assessment.typeConfigs?.reduce((acc, c) => acc + c.question_count, 0) || 1)) : 45)}</strong> seconds.
                        </div>
                      </div>
                    );
                  })}

                  {/* Details Table */}
                  <div style={{ overflowX: "auto", width: "100%", marginBottom: 20 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr style={{ borderBottom: "2px solid #e5e4eb", textAlign: "left" }}>
                          <th style={{ padding: "8px 6px", fontWeight: 700, color: "#6b7280" }}>MCQ Type</th>
                          <th style={{ padding: "8px 6px", fontWeight: 700, color: "#6b7280" }}>Questions</th>
                          <th style={{ padding: "8px 6px", fontWeight: 700, color: "#6b7280" }}>Marks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assessment.typeConfigs?.map((cfg) => (
                          <tr key={cfg.config_id} style={{ borderBottom: "1px solid #f0f2f8", textAlign: "left" }}>
                            <td style={{ padding: "10px 6px", fontWeight: 600, color: "#1a1a2e" }}>{cfg.mcq_type_name}</td>
                            <td style={{ padding: "10px 6px", color: "#4b5563" }}>{cfg.question_count} Qs</td>
                            <td style={{ padding: "10px 6px", color: "#4b5563" }}>{cfg.question_count} Pts</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ background: "rgba(239,68,68,.06)", border: "1px solid rgba(239,68,68,.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 24, fontSize: 11, color: "#dc2626", lineHeight: 1.6, textAlign: "left" }}>
                    <strong>Anti-cheat active:</strong> You get <strong>2 warnings</strong>. Leaving the assessment tab a <strong>3rd time</strong> will instantly flag <strong>MALPRACTICE</strong> and auto-submit with current answers. You will <strong>not</strong> be able to retake the assessment.
                  </div>
                  <button onClick={startTest}
                    style={{ width: "100%", padding: 14, background: P, border: "none", borderRadius: 12, color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer", boxShadow: "0 4px 20px rgba(108,71,255,.35)", fontFamily: "inherit" }}>
                    Start Assessment
                  </button>
                </div>
              </div>
            )}

            {/* ── RUNNING ── */}
            {phase === "running" && q && (
              <>
                {/* Header */}
                <div style={{ padding: isMobile ? "12px 14px" : "16px 28px", background: "#fff", borderBottom: "1px solid #e5e4eb", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, gap: 12, flexWrap: isMobile ? "wrap" : "nowrap" }}>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: "#1a1a2e" }}>{assessment?.assessment_title || levelName}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: 1, textTransform: "uppercase", marginTop: 2 }}>Question {current + 1} of {questions.length}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    {warnings > 0 && (
                      <div style={{ background: warnings >= 2 ? "rgba(239,68,68,.18)" : "rgba(239,68,68,.1)", border: `1px solid ${warnings >= 2 ? "rgba(239,68,68,.5)" : "rgba(239,68,68,.3)"}`, borderRadius: 8, padding: "4px 12px", fontSize: 11, fontWeight: 700, color: "#dc2626" }}>
                        ⚠ Strike {warnings}/2 {warnings >= 2 ? "— Next switch = SUBMIT" : ""}
                      </div>
                    )}
                    {/* ── Always-visible Submit button ── */}
                    <button
                      onClick={() => {
                        const answered = Object.keys(userAnswers).length;
                        const total = questions.length;
                        const unanswered = total - answered;
                        const msg = unanswered > 0
                          ? `You have ${unanswered} unanswered question${unanswered !== 1 ? 's' : ''}. Submit anyway?`
                          : "Submit the assessment now?";
                        if (window.confirm(msg)) submitTest(userAnswers);
                      }}
                      style={{ padding: "7px 16px", background: "rgba(239,68,68,0.1)", border: "1.5px solid rgba(239,68,68,0.4)", borderRadius: 10, color: "#dc2626", fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
                    >
                      Submit Assessment
                    </button>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: totalSecondsLeft <= 30 ? "#ef4444" : "#4b5563", fontFamily: "monospace" }}>
                        {(() => {
                          const m = Math.floor(totalSecondsLeft / 60);
                          const s = totalSecondsLeft % 60;
                          return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
                        })()}
                      </span>
                      <TimerRing val={totalSecondsLeft} maxVal={assessment ? assessment.duration_minutes * 60 : 60} />
                    </div>
                  </div>
                </div>

                {/* Section Tabs inside test */}
                <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "10px 14px", background: "#f8f7ff", borderBottom: "1px solid #e5e4eb" }}>
                  {uniqueCategories.map(cat => {
                    const isActive = activeTypeTab === cat;
                    const countInCat = questions.filter(item => item.mcq_type_name === cat).length;
                    return (
                      <button
                        key={cat}
                        onClick={() => {
                          setActiveTypeTab(cat);
                          const firstIdx = questions.findIndex(item => item.mcq_type_name === cat);
                          if (firstIdx !== -1) setCurrent(firstIdx);
                        }}
                        style={{
                          padding: "6px 14px",
                          borderRadius: 20,
                          border: "none",
                          background: isActive ? "rgba(108,71,255,0.12)" : "transparent",
                          color: isActive ? P : "#6b7280",
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                          whiteSpace: "nowrap"
                        }}
                      >
                        {cat} ({countInCat} Qs)
                      </button>
                    );
                  })}
                </div>

                {/* Question Indices of Active Tab */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "10px 14px", background: "#fff", borderBottom: "1px solid #e5e4eb" }}>
                  {questions.map((qItem, idx) => {
                    if (qItem.mcq_type_name !== activeTypeTab) return null;
                    const isCurrent = idx === current;
                    const isAnswered = userAnswers[idx] !== undefined;
                    return (
                      <button
                        key={idx}
                        onClick={() => setCurrent(idx)}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          border: isCurrent ? `2.5px solid ${P}` : "1px solid #d1d5db",
                          background: isCurrent ? "#fff" : isAnswered ? "rgba(16,185,129,0.15)" : "#fafafa",
                          color: isCurrent ? P : isAnswered ? "#059669" : "#374151",
                          fontSize: 12,
                          fontWeight: 800,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>

                {/* Progress bar */}
                <div style={{ height: 4, background: "#e5e4eb", flexShrink: 0 }}>
                  <div style={{ height: "100%", width: prog + "%", background: P, transition: "width .4s" }} />
                </div>

                {/* Question Area */}
                <div style={{ flex: 1, padding: "28px 5vw", display: "flex", flexDirection: "column", overflow: "auto" }}>
                  <div style={{ background: "#fff", border: "1.5px solid rgba(108,71,255,.2)", borderRadius: 18, padding: "28px 32px", marginBottom: 16, boxShadow: "0 2px 12px rgba(108,71,255,.07)" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: P, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>{q.mcq_type_name} Section</div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: "#1a1a2e", lineHeight: 1.6, marginBottom: 24 }}>{q.q}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {q.options.map((opt, i) => {
                        const sel = selected === i;
                        return (
                          <div key={i} onClick={() => setUserAnswers({ ...userAnswers, [current]: i })}
                            style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 20px", borderRadius: 12, border: `1.5px solid ${sel ? P : "#e5e4eb"}`, background: sel ? "rgba(108,71,255,.06)" : "#fafafa", cursor: "pointer", transition: "all .18s", userSelect: "none" }}>
                            <div style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${sel ? P : "#d1d5db"}`, background: sel ? P : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all .18s" }}>
                              {sel && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />}
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: sel ? "#1a1a2e" : "#374151" }}>{opt}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <button onClick={() => goNext()}
                    style={{ width: "100%", padding: 16, background: P, border: "none", borderRadius: 14, color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer", boxShadow: "0 4px 20px rgba(108,71,255,.35)", transition: "all .2s", fontFamily: "inherit" }}>
                    {current === questions.length - 1 ? "Submit Assessment" : "Next Question →"}
                  </button>
                </div>
              </>
            )}

            {/* ── DONE ── */}
            {phase === "done" && (
              <>
                <div style={{ padding: "16px 28px", background: "#fff", borderBottom: "1px solid #e5e4eb", flexShrink: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: 1, textTransform: "uppercase" }}>Assessment Complete</div>
                  <div style={{ height: 4, background: P, borderRadius: 10, marginTop: 8 }} />
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, gap: 20 }}>
                  {result && (
                    <>
                      <div style={{ width: 130, height: 130, borderRadius: "50%", border: `4px solid ${result.status === 'PASSED' ? '#10b981' : '#ef4444'}`, background: result.status === 'PASSED' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                        <div style={{ fontSize: 36, fontWeight: 900, color: result.status === 'PASSED' ? '#10b981' : '#ef4444' }}>{result.score_obtained}</div>
                        <div style={{ fontSize: 13, color: "#6b7280", fontWeight: 600 }}>/ {assessment?.total_marks}</div>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#6b7280" }}>
                        Score: {Math.round((result.score_obtained / (assessment?.total_marks || 1)) * 100)}% &nbsp;|&nbsp; Pass mark: {assessment?.passing_marks} pts ({Math.round(((assessment?.passing_marks || 14) / (assessment?.total_marks || 20)) * 100)}%)
                      </div>
                    </>
                  )}
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#1a1a2e" }}>
                    Assessment {autoSubmit ? "Flagged for Malpractice" : "Complete"}
                  </div>
                  <div style={{ fontSize: 13, color: "#6b7280", maxWidth: 340, textAlign: "center", lineHeight: 1.6 }}>
                    {autoSubmit
                      ? "Your test was auto-submitted due to tab-switching violations. Status has been updated to MALPRACTICE."
                      : result?.status === 'PASSED'
                        ? "Congratulations! You have passed the assessment."
                        : "You did not achieve the passing marks. Please review and try again next time."}
                  </div>
                  <button onClick={() => navigate("/training-slots")}
                    style={{ padding: "14px 48px", background: P, border: "none", borderRadius: 12, color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer", marginTop: 8, boxShadow: "0 4px 20px rgba(108,71,255,.35)", fontFamily: "inherit" }}>
                    Done
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {/* ── SIDEBAR SECTIONS ── */}
        {sideActive === "guide" && (
          <div style={{ flex: 1, padding: isMobile ? 20 : 40, overflow: "auto" }}>
            <div style={{ background: "#fff", padding: 30, borderRadius: 16, boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
              <h2 style={{ fontFamily: "Outfit, sans-serif", marginBottom: 16 }}>Assessment Guide</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, color: "#4b5563", lineHeight: 1.6 }}>
                <p><strong>1. Fullscreen Requirement:</strong> The assessment runs in fullscreen. If you exit fullscreen, try to enter it again using the prompt.</p>
                <p><strong>2. Anti-Cheat &amp; Malpractice:</strong> Switching tabs or leaving the test screen gives you a <strong>warning</strong>. You get <strong>2 warnings</strong> (strikes). On the <strong>3rd tab switch</strong>, the test is automatically submitted with your current answers and logged as <em>MALPRACTICE</em>. You will not be able to retake the assessment after a malpractice flag.</p>
                <p><strong>3. Question Timer:</strong> Every question has a countdown timer based on the assessment's total duration. You must select an answer and click Next before the timer expires.</p>
              </div>
            </div>
          </div>
        )}

        {sideActive === "score" && (
          <div style={{ flex: 1, padding: isMobile ? 20 : 40, overflow: "auto" }}>
            <div style={{ background: "#fff", padding: 30, borderRadius: 16, boxShadow: "0 4px 20px rgba(0,0,0,0.05)", textAlign: "center" }}>
              <h2 style={{ fontFamily: "Outfit, sans-serif", marginBottom: 16 }}>Your Results</h2>
              {result ? (
                <div>
                  <div style={{ fontSize: 48, fontWeight: 900, color: P }}>{result.score_obtained} / {assessment?.total_marks}</div>
                  <div style={{ fontSize: 18, color: "#1a1a2e", fontWeight: 700, marginTop: 8 }}>Status: {result.status}</div>
                </div>
              ) : (
                <p style={{ color: "#6b7280" }}>No assessments completed in this session yet.</p>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}