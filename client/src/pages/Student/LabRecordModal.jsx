import { useState, useEffect } from "react";
import { trainingService } from "../../services/features/trainingService";

const P = "#6c47ff";

// Auto-opened after a PBL assessment score is shown (so the student doesn't
// forget the lab record). Loads the end-of-session questions and posts the
// answers to end_survey via the existing submitLabRecord endpoint. Decoupled:
// writes ONLY end_survey, never points. onClose(submitted:boolean) lets the
// parent resume the normal Done → navigate flow whether submitted or skipped.
export default function LabRecordModal({ bookingId, onClose }) {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({}); // { [survey_question_id]: text }
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const res = await trainingService.getLabRecordQuestions();
        if (ignore) return;
        setQuestions(Array.isArray(res?.data) ? res.data : []);
      } catch {
        if (!ignore) setErr("Couldn't load the lab record questions. You can fill it later from your slots.");
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, []);

  const setAnswer = (qid, text) => setAnswers((a) => ({ ...a, [qid]: text }));

  const submit = async () => {
    const responses = questions.map((q) => ({
      survey_question_id: q.survey_question_id,
      student_response: (answers[q.survey_question_id] || "").trim(),
    }));
    if (responses.some((r) => !r.student_response)) {
      setErr("Please answer all questions before submitting.");
      return;
    }
    setSubmitting(true);
    setErr("");
    try {
      await trainingService.submitLabRecord(bookingId, responses);
      onClose(true);
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to submit lab record. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 12000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(3px)" }}>
      <div style={{ background: "#fff", borderRadius: 18, width: "100%", maxWidth: 620, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 60px rgba(0,0,0,0.25)" }}>
        <div style={{ padding: "18px 22px", borderBottom: "1px solid #e5e4eb" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: 1, textTransform: "uppercase" }}>One last step</div>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: "#1a1a2e", margin: "4px 0 0" }}>Fill your Lab Record</h2>
          <p style={{ fontSize: 12.5, color: "#6b7280", margin: "4px 0 0" }}>
            Complete the lab record now so it isn't forgotten — your score has already been saved.
          </p>
        </div>

        <div style={{ padding: "18px 22px", overflowY: "auto", flex: 1 }}>
          {loading ? (
            <div style={{ color: "#9ca3af", fontSize: 13, padding: "12px 0" }}>Loading questions…</div>
          ) : questions.length === 0 ? (
            <div style={{ color: "#9ca3af", fontSize: 13, padding: "12px 0" }}>No lab record questions are configured.</div>
          ) : (
            questions.map((q, i) => (
              <div key={q.survey_question_id} style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#1a1a2e", marginBottom: 6 }}>
                  {i + 1}. {q.question}
                </label>
                <textarea
                  value={answers[q.survey_question_id] || ""}
                  onChange={(e) => setAnswer(q.survey_question_id, e.target.value)}
                  rows={3}
                  placeholder="Your answer…"
                  style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #e5e4eb", borderRadius: 10, fontSize: 13.5, color: "#1a1a2e", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }}
                />
              </div>
            ))
          )}
          {err && <div style={{ fontSize: 12.5, color: "#ef4444", fontWeight: 600, marginTop: 4 }}>{err}</div>}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "16px 22px", borderTop: "1px solid #e5e4eb" }}>
          <button onClick={() => onClose(false)} disabled={submitting}
            style={{ padding: "10px 18px", borderRadius: 10, border: "1.5px solid #e5e4eb", background: "#fff", color: "#6b7280", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            Skip for now
          </button>
          <button onClick={submit} disabled={submitting || loading || questions.length === 0}
            style={{ padding: "10px 22px", borderRadius: 10, border: "none", background: P, color: "#fff", fontSize: 13, fontWeight: 800, cursor: submitting ? "default" : "pointer", opacity: submitting || loading || questions.length === 0 ? 0.7 : 1, fontFamily: "inherit" }}>
            {submitting ? "Submitting…" : "Submit Lab Record"}
          </button>
        </div>
      </div>
    </div>
  );
}
