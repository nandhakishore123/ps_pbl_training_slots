// StudentFeedback.jsx
// Student Feedback Popup — opens after completing MCQ assessment
// Like the Lab Record popup in index_working.html
// Steps: Roll Number → Feedback Questions → Submit → PDF

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";

const P = "#6c47ff", BG = "#f4f3ff", CARD = "#ffffff", BORDER = "#e5e4eb";

// ── Feedback questions (like LAB_QUESTIONS in index_working.html) ──
const FEEDBACK_QUESTIONS = [
  { id: "q1", section: "Training Experience", label: "How would you rate the overall training session?", type: "rating" },
  { id: "q2", section: "Training Experience", label: "Was the course content clear and easy to understand?", type: "rating" },
  { id: "q3", section: "Training Experience", label: "How helpful was the training material provided?", type: "rating" },
  { id: "q4", section: "Assessment Feedback", label: "Were the MCQ questions relevant to the course topics?", type: "rating" },
  { id: "q5", section: "Assessment Feedback", label: "Was the time limit (45 seconds per question) sufficient?", type: "choice", options: ["Yes, sufficient", "No, too short", "Needs more time"] },
  { id: "q6", section: "Assessment Feedback", label: "How difficult were the questions overall?", type: "choice", options: ["Easy", "Moderate", "Difficult", "Very Difficult"] },
  { id: "q7", section: "Suggestions", label: "What did you find most useful in this training?", type: "text", maxWords: 50 },
  { id: "q8", section: "Suggestions", label: "What improvements would you suggest for this course?", type: "text", maxWords: 50 },
  { id: "q9", section: "Suggestions", label: "Any other feedback or comments for the faculty?", type: "text", maxWords: 80 },
];

// ── Mock student DB (like GROUP_DB in index_working.html) ──────
const STUDENT_DB = {
  "7376241CS001": { name: "Arjun Ramesh",    dept: "CSE", year: "3rd Year", section: "A" },
  "7376241CS002": { name: "Priya Sundaram",  dept: "CSE", year: "3rd Year", section: "A" },
  "7376241EC001": { name: "Karthik Selvam",  dept: "ECE", year: "3rd Year", section: "B" },
  "7376241BT001": { name: "Divya Meenakshi", dept: "BT",  year: "3rd Year", section: "A" },
};

// ── Icons ─────────────────────────────────────────────────────
const IcoClose = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IcoCheck = () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>;

// ── Star Rating component ──────────────────────────────────────
function StarRating({ value, onChange }) {
  const [hov, setHov] = useState(0);
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      {[1,2,3,4,5].map(i => (
        <span key={i}
          onClick={() => onChange(i)}
          onMouseEnter={() => setHov(i)}
          onMouseLeave={() => setHov(0)}
          style={{ fontSize: 28, cursor: "pointer", color: i <= (hov || value) ? "#f59e0b" : "#e5e7eb", transition: "color .15s", userSelect: "none" }}>
          ★
        </span>
      ))}
      {value > 0 && <span style={{ fontSize: 12, color: "#6b7280", marginLeft: 4 }}>{["","Poor","Fair","Good","Very Good","Excellent"][value]}</span>}
    </div>
  );
}

// ── Word counter (like lrSave in index_working.html) ──────────
function wordCount(str) {
  return str.trim() === "" ? 0 : str.trim().split(/\s+/).length;
}

// ── PDF export (structure from exportCompilerPDF in index_working.html) ──
function exportFeedbackPDF(roll, student, courseName, score, answers) {
  const esc = s => String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  const now     = new Date();
  const dateStr = now.toLocaleDateString("en-IN", { day:"2-digit", month:"long", year:"numeric" });
  const timeStr = now.toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" });

  const sections = [...new Set(FEEDBACK_QUESTIONS.map(q => q.section))];

  const sectionsHtml = sections.map(sec => {
    const qs = FEEDBACK_QUESTIONS.filter(q => q.section === sec);
    const rowsHtml = qs.map(q => {
      let ansHtml = "";
      const ans = answers[q.id];
      if (q.type === "rating") {
        const stars = "★".repeat(ans||0) + "☆".repeat(5-(ans||0));
        const labels = ["","Poor","Fair","Good","Very Good","Excellent"];
        ansHtml = `<span style="color:#f59e0b;font-size:16px;">${stars}</span> <span style="color:#6b7280;font-size:11px;">${labels[ans||0]||""}</span>`;
      } else if (q.type === "choice") {
        ansHtml = `<span style="background:#f4f3ff;border:1px solid #e5e4eb;border-radius:6px;padding:3px 10px;font-weight:600;color:#6c47ff;">${esc(ans||"Not answered")}</span>`;
      } else {
        ansHtml = `<div style="background:#f8f7ff;border-left:3px solid #6c47ff;padding:8px 12px;border-radius:0 6px 6px 0;font-size:12px;color:#374151;line-height:1.6;">${esc(ans||"Not answered")}</div>`;
      }
      return `<tr><td style="width:55%;vertical-align:top;padding:10px 12px;font-size:12px;color:#374151;">${esc(q.label)}</td><td style="padding:10px 12px;vertical-align:top;">${ansHtml}</td></tr>`;
    }).join("");
    return `<div style="margin-bottom:22px;">
      <div style="font-size:10px;font-weight:800;color:#6c47ff;text-transform:uppercase;letter-spacing:1.5px;border-bottom:1.5px solid #e5e4eb;padding-bottom:5px;margin-bottom:10px;">${esc(sec)}</div>
      <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e5e4eb;">
        <thead><tr><th style="background:#6c47ff;color:#fff;font-size:10px;font-weight:700;padding:8px 12px;text-align:left;text-transform:uppercase;letter-spacing:.5px;">Question</th><th style="background:#6c47ff;color:#fff;font-size:10px;font-weight:700;padding:8px 12px;text-align:left;text-transform:uppercase;letter-spacing:.5px;">Response</th></tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>`;
  }).join("");

  const pct = Math.round((score.correct / score.total) * 100);
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
  <title>Student Feedback — ${esc(student.name)}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:"Segoe UI",Arial,sans-serif;font-size:12px;color:#1a1a2e;background:#fff;}
    .page{max-width:900px;margin:0 auto;padding:36px 44px;}
    .print-btn{position:fixed;top:16px;right:16px;padding:8px 18px;background:#6c47ff;color:#fff;border:none;border-radius:7px;font-size:11px;font-weight:700;cursor:pointer;}
    @media print{.print-btn{display:none;}.page{padding:20px 24px;}}
  </style></head><body>
  <button class="print-btn" onclick="window.print()">Print / Save PDF</button>
  <div class="page">
    <div style="border-bottom:3px solid #6c47ff;padding-bottom:18px;margin-bottom:24px;display:flex;justify-content:space-between;align-items:flex-start;">
      <div>
        <div style="font-size:20px;font-weight:900;color:#1a1a2e;">Bannari Amman Institute of Technology</div>
        <div style="font-size:11px;color:#6b7280;margin-top:3px;">Erode, Tamil Nadu — PS Training Division</div>
      </div>
      <div style="text-align:right;">
        <div style="background:#6c47ff;color:#fff;padding:5px 14px;border-radius:20px;font-size:11px;font-weight:700;display:inline-block;">Student Feedback Form</div>
        <div style="font-size:10px;color:#9ca3af;margin-top:5px;">${dateStr} at ${timeStr}</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:24px;">
      ${[["Roll Number",roll],["Student Name",student.name],["Department",student.dept+" — "+student.section],["Assessment Score",score.correct+"/"+score.total+" ("+pct+"%)"]].map(([l,v]) =>
        `<div style="background:#f8f7ff;border:1px solid #e5e4eb;border-radius:8px;padding:10px 14px;"><div style="font-size:9px;font-weight:700;color:#6c47ff;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px;">${l}</div><div style="font-size:12px;font-weight:700;color:#1a1a2e;">${esc(v)}</div></div>`
      ).join("")}
    </div>
    <div style="background:#f8f7ff;border:1px solid #e5e4eb;border-radius:8px;padding:10px 16px;margin-bottom:22px;display:flex;align-items:center;gap:10px;">
      <span style="font-size:11px;font-weight:700;color:#6b7280;">Course:</span>
      <span style="font-size:12px;font-weight:700;color:#1a1a2e;">${esc(courseName)}</span>
    </div>
    ${sectionsHtml}
    <div style="margin-top:28px;padding-top:12px;border-top:1px solid #e5e4eb;display:flex;justify-content:space-between;font-size:10px;color:#9ca3af;">
      <span>Student Feedback Form — PS Training — Bannari Amman Institute of Technology</span>
      <span>Generated: ${dateStr}</span>
    </div>
  </div></body></html>`;

  const w = window.open("", "_blank");
  if (w) { w.document.write(html); w.document.close(); }
  else alert("Allow popups to export PDF.");
}

// ── Main popup component ───────────────────────────────────────
export default function StudentFeedback({
  isOpen      = true,           // Pass false to hide popup
  onClose     = () => {},       // Called when popup closes
  courseName  = "CyberSecurity — Level 1",
  score       = { correct: 15, total: 20 },  // MCQ result passed from parent
}) {
  // Steps: "roll" → "questions" → "done" (same as labState.step in script)
  // The wizard step is reflected in the URL (?step=roll|questions|done) so refresh keeps
  // the student on the same step; the detected roll (?roll=) re-hydrates the student.
  const [searchParams, setSearchParams] = useSearchParams();
  const STEPS = ["roll", "questions", "done"];
  const stepParam = searchParams.get("step");
  const step = STEPS.includes(stepParam) ? stepParam : "roll";
  const goToStep = useCallback((next) => {
    setSearchParams((prev) => { const p = new URLSearchParams(prev); p.set("step", next); return p; });
  }, [setSearchParams]);

  const [roll,    setRoll]    = useState("");
  const [student, setStudent] = useState(null);
  const [rollErr, setRollErr] = useState("");
  const [answers, setAnswers] = useState({});
  const [wordCounts, setWordCounts] = useState({});

  // Re-hydrate the student from ?roll when refreshing onto a post-roll step.
  // STUDENT_DB is the same in-memory source detectRoll uses; invalid/missing roll → step 1.
  useEffect(() => {
    if (step === "roll" || student) return;
    const rollParam = String(searchParams.get("roll") || "").trim().toUpperCase();
    const info = rollParam ? STUDENT_DB[rollParam] : null;
    if (info) {
      setStudent({ ...info, roll: rollParam });
      setRoll(rollParam);
    } else {
      setSearchParams((prev) => {
        const p = new URLSearchParams(prev);
        p.set("step", "roll");
        p.delete("roll");
        return p;
      }, { replace: true });
    }
  }, [step, student, searchParams, setSearchParams]);

  if (!isOpen) return null;

  // ── Sections ───────────────────────────────────────────────
  const sections = [...new Set(FEEDBACK_QUESTIONS.map(q => q.section))];
  const totalQs  = FEEDBACK_QUESTIONS.length;
  const answered = Object.keys(answers).filter(k => {
    const a = answers[k]; return a !== null && a !== undefined && String(a).trim() !== "";
  }).length;

  // ── Detect roll (like selectLabRole in script) ─────────────
  const detectRoll = () => {
    const r = roll.trim().toUpperCase();
    if (!r) { setRollErr("Please enter your register number."); return; }
    const info = STUDENT_DB[r];
    if (!info) { setRollErr("Register number not found. Try: 7376241CS001"); return; }
    setRollErr("");
    setStudent({ ...info, roll: r });
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set("step", "questions");
      p.set("roll", r);
      return p;
    });
  };

  // ── Save answer (like lrSave in script) ────────────────────
  const saveAnswer = (id, val) => {
    setAnswers(a => ({ ...a, [id]: val }));
  };

  const saveText = (id, val, maxWords) => {
    const wc = wordCount(val);
    if (wc > maxWords) return; // block over-limit
    setAnswers(a => ({ ...a, [id]: val }));
    setWordCounts(w => ({ ...w, [id]: wc }));
  };

  // ── Submit ─────────────────────────────────────────────────
  const handleSubmit = () => {
    const unanswered = FEEDBACK_QUESTIONS.filter(q => {
      const a = answers[q.id];
      return a === null || a === undefined || String(a).trim() === "";
    });
    if (unanswered.length > 0) {
      alert(`Please answer all questions. ${unanswered.length} question(s) remaining.`);
      return;
    }
    goToStep("done");
  };

  const handleExportPDF = () => {
    exportFeedbackPDF(student.roll, student, courseName, score, answers);
  };

  return (
    // Overlay — same as pt-lab-record-overlay in index_working.html
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 99998, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'Segoe UI',system-ui,sans-serif" }}>
      <div style={{ background: CARD, borderRadius: 20, width: "100%", maxWidth: 620, maxHeight: "92vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,.35)" }}>

        {/* Header — like pt-labrecord-header */}
        <div style={{ padding: "16px 20px", background: P, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>Student Feedback Form</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.7)", marginTop: 2 }}>{courseName} &nbsp;•&nbsp; Score: {score.correct}/{score.total}</div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,.15)", border: "none", borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}>
            <IcoClose />
          </button>
        </div>

        {/* Progress bar — like lr-progress in script */}
        {step === "questions" && (
          <div style={{ padding: "8px 20px", background: "#f8f7ff", borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
            <div style={{ height: 5, background: BORDER, borderRadius: 10, overflow: "hidden", marginBottom: 4 }}>
              <div style={{ height: "100%", width: `${(answered / totalQs) * 100}%`, background: P, borderRadius: 10, transition: "width .3s" }} />
            </div>
            <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>{answered} of {totalQs} answered</div>
          </div>
        )}

        {/* Body — like lr-body in script */}
        <div style={{ flex: 1, overflow: "auto", padding: 20 }}>

          {/* ── STEP: roll ── */}
          {step === "roll" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e" }}>Enter Your Register Number</div>
              <div style={{ fontSize: 12, color: "#9ca3af" }}>Your details will be automatically detected from the student database.</div>
              <input value={roll} onChange={e => setRoll(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === "Enter" && detectRoll()}
                placeholder="e.g. 7376241CS001"
                style={{ width: "100%", padding: "12px 14px", border: `1.5px solid ${rollErr ? "#ef4444" : BORDER}`, borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#1a1a2e", outline: "none", fontFamily: "monospace", letterSpacing: 0.5 }} />
              {rollErr && <div style={{ fontSize: 12, color: "#ef4444", fontWeight: 600 }}>{rollErr}</div>}
              <button onClick={detectRoll}
                style={{ padding: 13, background: P, border: "none", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
                Detect My Details →
              </button>
              {/* Hint chips — like lr-hint-chips in script */}
              <div style={{ background: "#f8f7ff", border: `1px solid rgba(108,71,255,.15)`, borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: P, marginBottom: 8 }}>Test Roll Numbers:</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {Object.entries(STUDENT_DB).map(([r, s]) => (
                    <span key={r} onClick={() => setRoll(r)}
                      style={{ fontSize: 10, background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 6, padding: "3px 8px", cursor: "pointer", color: "#1a1a2e", fontWeight: 600, fontFamily: "monospace" }}>
                      {r} <span style={{ color: P }}>({s.name.split(" ")[0]})</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP: questions ── */}
          {step === "questions" && student && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Student info card */}
              <div style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(108,71,255,.1)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: P, fontSize: 16, flexShrink: 0 }}>
                  {student.name.charAt(0)}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e" }}>{student.name}</div>
                  <div style={{ fontSize: 11, color: "#6b7280" }}>{student.roll} • {student.dept} • {student.year}</div>
                </div>
              </div>

              {/* Sections — like each section in showLabStep */}
              {sections.map(sec => (
                <div key={sec}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: P, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 12, paddingBottom: 5, borderBottom: `1.5px solid ${BORDER}` }}>{sec}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {FEEDBACK_QUESTIONS.filter(q => q.section === sec).map(q => (
                      <div key={q.id}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e", marginBottom: 8 }}>{q.label}</div>

                        {/* Rating */}
                        {q.type === "rating" && (
                          <StarRating value={answers[q.id] || 0} onChange={val => saveAnswer(q.id, val)} />
                        )}

                        {/* Choice */}
                        {q.type === "choice" && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                            {q.options.map(opt => {
                              const sel = answers[q.id] === opt;
                              return (
                                <button key={opt} onClick={() => saveAnswer(q.id, opt)}
                                  style={{ padding: "7px 14px", borderRadius: 20, border: `1.5px solid ${sel ? P : BORDER}`, background: sel ? "rgba(108,71,255,.08)" : "#fff", color: sel ? P : "#374151", fontSize: 12, fontWeight: sel ? 700 : 600, cursor: "pointer", transition: "all .15s", fontFamily: "inherit" }}>
                                  {sel && <IcoCheck />} {opt}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Text — like textarea in showLabStep */}
                        {q.type === "text" && (
                          <div>
                            <textarea value={answers[q.id] || ""} onChange={e => saveText(q.id, e.target.value, q.maxWords)} rows={3} placeholder={`Write your response... (max ${q.maxWords} words)`}
                              style={{ width: "100%", padding: "10px 12px", border: `1.5px solid ${BORDER}`, borderRadius: 10, fontSize: 13, color: "#1a1a2e", outline: "none", resize: "vertical", fontFamily: "inherit", lineHeight: 1.6, background: BG }} />
                            <div style={{ fontSize: 11, color: (wordCounts[q.id] || 0) >= q.maxWords ? "#ef4444" : "#9ca3af", textAlign: "right", marginTop: 3 }}>
                              {wordCounts[q.id] || 0} / {q.maxWords} words
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── STEP: done ── */}
          {step === "done" && student && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 0", gap: 16, textAlign: "center" }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(16,185,129,.1)", border: "3px solid #10b981", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="28" height="28" fill="none" stroke="#10b981" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#1a1a2e" }}>Feedback Submitted!</div>
              <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6, maxWidth: 340 }}>
                Thank you, <strong>{student.name}</strong>! Your feedback for <strong>{courseName}</strong> has been recorded successfully.
              </div>
              <div style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "12px 20px", fontSize: 13, color: "#374151" }}>
                Assessment Score: <strong style={{ color: P }}>{score.correct}/{score.total} ({Math.round((score.correct/score.total)*100)}%)</strong>
              </div>
              <button onClick={handleExportPDF}
                style={{ padding: "12px 32px", background: P, border: "none", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer", boxShadow: "0 4px 20px rgba(108,71,255,.3)", fontFamily: "inherit" }}>
                Download Feedback PDF
              </button>
              <button onClick={onClose}
                style={{ padding: "10px 24px", background: "transparent", border: `1.5px solid ${BORDER}`, borderRadius: 10, color: "#6b7280", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                Close
              </button>
            </div>
          )}
        </div>

        {/* Footer — like lr-footer in script */}
        {step === "questions" && (
          <div style={{ padding: "12px 20px", borderTop: `1px solid ${BORDER}`, display: "flex", gap: 10, flexShrink: 0, background: "#fafafa" }}>
            <button onClick={() => goToStep("roll")}
              style={{ padding: "10px 18px", background: "transparent", border: `1.5px solid ${BORDER}`, borderRadius: 9, color: "#6b7280", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              ← Back
            </button>
            <button onClick={handleSubmit}
              style={{ flex: 1, padding: "11px 18px", background: P, border: "none", borderRadius: 9, color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 2px 12px rgba(108,71,255,.3)" }}>
              Submit Feedback →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Usage example ──────────────────────────────────────────────
// After MCQ assessment completes, render like this:
//
// <StudentFeedback
//   isOpen={showFeedback}
//   onClose={() => setShowFeedback(false)}
//   courseName="CyberSecurity — Level 1"
//   score={{ correct: 15, total: 20 }}
// />