import { useState, useEffect, useCallback } from "react";
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.jsx';
import { authService } from '../../services/features/authService';
import { facultyService } from '../../services/features/facultyService';
import pageStyles from './FacultyDashboard.module.css';

// ── Helpers ────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-violet-100 text-violet-700",
  "bg-rose-100 text-rose-700",
  "bg-amber-100 text-amber-700",
  "bg-cyan-100 text-cyan-700",
  "bg-orange-100 text-orange-700",
  "bg-teal-100 text-teal-700",
];

const getInitials = (name) =>
  String(name || '').split(" ").filter(Boolean).slice(0, 2).map((n) => n[0]).join("").toUpperCase() || '?';

const getAvatarColor = (idx) => AVATAR_COLORS[idx % AVATAR_COLORS.length];

const formatTime = (timeStr) => {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  const hh = parseInt(h, 10);
  const ampm = hh >= 12 ? 'PM' : 'AM';
  const h12 = hh % 12 || 12;
  return `${h12}:${m} ${ampm}`;
};

// ── Shared Primitives ──────────────────────────────────────────────────────

function StatusBadge({ status }) {
  if (status === "ONGOING") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
        Ongoing
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
      Malpractice
    </span>
  );
}

function Toast({ message, type, onClose }) {
  const styles = {
    success: "bg-emerald-600",
    warning: "bg-amber-500",
    error: "bg-red-600",
  };
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl text-white text-sm font-medium shadow-xl ${styles[type] || styles.success} animate-slide-up`}>
      <span>{message}</span>
      <button onClick={onClose} className="ml-1 opacity-70 hover:opacity-100 leading-none">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    </div>
  );
}

// ── Malpractice Modal ──────────────────────────────────────────────────────

const MALPRACTICE_REASONS = [
  "Copying from another student",
  "Using unauthorised notes or materials",
  "Mobile phone usage during session",
  "Impersonation",
  "Tampering with lab equipment",
  "Other",
];

function MalpracticeModal({ student, onConfirm, onCancel }) {
  const [selected, setSelected] = useState("");
  const [custom, setCustom] = useState("");

  if (!student) return null;

  const reason = selected === "Other" ? custom.trim() : selected;
  const canSubmit = !!reason;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="h-1 w-full bg-red-500" />
        <div className="p-6 space-y-5">
          <div>
            <h3 className="text-base font-bold text-gray-900">Mark Malpractice</h3>
            <p className="text-xs text-gray-400 mt-0.5">This action will be logged and is reversible by faculty.</p>
          </div>
          <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${getAvatarColor(student._idx || 0)}`}>
              {getInitials(student.name)}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{student.name}</p>
              <p className="text-xs text-gray-400 font-mono">{student.reg_num} &middot; {student.course}</p>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Reason for Malpractice</p>
            <div className="flex flex-col gap-2">
              {MALPRACTICE_REASONS.map((r) => (
                <label
                  key={r}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border cursor-pointer transition-all text-sm ${
                    selected === r
                      ? "border-red-400 bg-red-50 text-red-800"
                      : "border-gray-200 hover:border-gray-300 text-gray-700"
                  }`}
                >
                  <input
                    type="radio"
                    name="malpractice-reason"
                    value={r}
                    checked={selected === r}
                    onChange={() => setSelected(r)}
                    className="accent-red-600"
                  />
                  {r}
                </label>
              ))}
            </div>
            {selected === "Other" && (
              <textarea
                className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400 resize-none transition"
                rows={2}
                placeholder="Describe the reason..."
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
              />
            )}
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">Cancel</button>
            <button
              disabled={!canSubmit}
              onClick={() => onConfirm(reason)}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Confirm Malpractice
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Revoke Modal ───────────────────────────────────────────────────────────

function RevokeModal({ student, onConfirm, onCancel }) {
  const [reason, setReason] = useState("");

  if (!student) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="h-1 w-full bg-amber-400" />
        <div className="p-6 space-y-5">
          <div>
            <h3 className="text-base font-bold text-gray-900">Revoke Malpractice Flag</h3>
            <p className="text-xs text-gray-400 mt-0.5">Student status will be reset to Ongoing. Reason is mandatory.</p>
          </div>
          <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${getAvatarColor(student._idx || 0)}`}>
              {getInitials(student.name)}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{student.name}</p>
              <p className="text-xs text-gray-400 font-mono">{student.reg_num} &middot; {student.course}</p>
            </div>
          </div>
          {student.remarks && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-1">Original Malpractice Reason</p>
              <p className="text-sm text-red-800">{student.remarks}</p>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Reason for Revocation</p>
            <textarea
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 resize-none transition"
              rows={3}
              placeholder="State the grounds for revoking this malpractice flag..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">Cancel</button>
            <button
              disabled={!reason.trim()}
              onClick={() => onConfirm(reason.trim())}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Revoke Flag
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Attendance Modal ───────────────────────────────────────────────────────

function AttendanceModal({ student, onConfirm, onCancel }) {
  if (!student) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="h-1 w-full bg-blue-500" />
        <div className="p-6 space-y-4">
          <div>
            <h3 className="text-base font-bold text-gray-900">Mark Attendance</h3>
            <p className="text-xs text-gray-400 mt-0.5">Confirm attendance for today's session.</p>
          </div>
          <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${getAvatarColor(student._idx || 0)}`}>
              {getInitials(student.name)}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{student.name}</p>
              <p className="text-xs text-gray-400 font-mono">{student.reg_num} &middot; {student.course}</p>
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">Cancel</button>
            <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors">Mark Present</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Student Card ───────────────────────────────────────────────────────────

function StudentCard({ student, idx, onMarkAttendance, onMarkMalpractice, onRevoke, onReview }) {
  return (
    <div className={`bg-white rounded-xl border flex flex-col overflow-hidden transition-all hover:shadow-sm ${student.status === "MALPRACTICE" ? "border-red-200" : "border-gray-200"}`}>
      {student.status === "MALPRACTICE" && <div className="h-0.5 w-full bg-red-400" />}
      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* Avatar + Name */}
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${getAvatarColor(idx)}`}>
            {getInitials(student.name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 leading-tight truncate">{student.name}</p>
            <p className="text-xs text-gray-400 font-mono">{student.reg_num}</p>
          </div>
        </div>

        {/* Status + attendance */}
        <div className="flex flex-wrap gap-1.5">
          <StatusBadge status={student.status} />
          {student.is_present === 1 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
              Present
            </span>
          )}
        </div>

        {/* Course info */}
        <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-xs">
          <span className="text-gray-400 font-medium">Course</span>
          <span className="font-semibold text-gray-700 truncate ml-2 max-w-[120px]">{student.course || '—'}</span>
        </div>

        {/* Malpractice reason if flagged */}
        {student.status === "MALPRACTICE" && student.remarks && (
          <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            <p className="text-xs text-red-500 font-semibold uppercase tracking-wide mb-0.5">Reason</p>
            <p className="text-xs text-red-700 leading-snug">{student.remarks}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col gap-1.5 mt-auto pt-1">
          {student.is_present !== 1 && student.status !== "MALPRACTICE" && (
            <button
              onClick={() => onMarkAttendance(student)}
              className="w-full py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition-all"
            >
              Mark Attendance
            </button>
          )}
          {student.status === "ONGOING" && (
            <button
              onClick={() => onMarkMalpractice(student)}
              className="w-full py-2 rounded-lg text-xs font-semibold border border-red-300 text-red-600 hover:bg-red-50 active:scale-95 transition-all"
            >
              Mark Malpractice
            </button>
          )}
          {student.status === "MALPRACTICE" && (
            <button
              onClick={() => onRevoke(student)}
              className="w-full py-2 rounded-lg text-xs font-semibold bg-amber-500 text-white hover:bg-amber-600 active:scale-95 transition-all"
            >
              Revoke to Ongoing
            </button>
          )}
          <button
            onClick={() => onReview(student)}
            className="w-full py-2 rounded-lg text-xs font-semibold border border-indigo-300 text-indigo-600 hover:bg-indigo-50 active:scale-95 transition-all"
          >
            Review MCQ &amp; Survey
          </button>
        </div>
      </div>
    </div>
  );
}

// ── PDF helpers (mirrored from TrainingSlots) ──────────────────────────────

function exportLabRecordPDF(booking, surveyResponses) {
  const esc = s => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
  const logoUrl = window.location.origin + '/BIT.png';

  const questions = surveyResponses.map(r => ({ survey_question_id: r.survey_question_id, question: r.question }));
  const answers = {};
  surveyResponses.forEach(r => { answers[r.survey_question_id] = r.student_response; });

  const is10Qs = questions.length === 10;
  const sections = is10Qs ? [
    { name: "Individual Contribution", qids: [1, 2, 3, 4] },
    { name: "Teamwork & Collaboration", qids: [5, 6, 7, 8] },
    { name: "Learning & Reflection", qids: [9, 10] }
  ] : [
    { name: "Session Overview", qids: [1, 2, 3] },
    { name: "Individual Contribution", qids: [4, 5, 6] },
    { name: "Learning & Reflection", qids: [7, 8, 9] }
  ];

  const sectionsHtml = sections.map(sec => {
    const qs = questions.filter(q => sec.qids.includes(Number(q.survey_question_id)));
    if (qs.length === 0) return '';
    const rowsHtml = qs.map((q, idx) => {
      const ans = answers[q.survey_question_id] || "Not answered";
      const letters = ['A', 'B', 'C', 'D'];
      const displayQ = `${letters[idx] || ''}. ${q.question}`;
      return `<tr style="border-bottom: 1px solid #e5e4eb;">
        <td style="width:45%;vertical-align:top;padding:12px 14px;font-size:12px;color:#1a1a2e;font-weight:600;">${esc(displayQ)}</td>
        <td style="vertical-align:top;padding:12px 14px;font-size:12px;color:#374151;line-height:1.6;white-space:pre-wrap;">${esc(ans)}</td>
      </tr>`;
    }).join('');
    return `<div style="margin-bottom:24px;page-break-inside:avoid;">
      <div style="font-size:11px;font-weight:800;color:#6c47ff;text-transform:uppercase;letter-spacing:1.5px;border-bottom:2.5px solid #6c47ff;padding-bottom:6px;margin-bottom:12px;">${esc(sec.name)}</div>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e5e4eb;border-radius:8px;overflow:hidden;">
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>`;
  }).join('');

  const bkDate = booking.booking_date || '—';
  const bkTime = booking.start_time ? `${booking.start_time} - ${booking.end_time || ''}` : '—';
  const bkVenue = booking.venue_name || '—';
  const deptSec = booking.student_course || '—';

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
    <title>Lab Record — ${esc(booking.student_name)}</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:"Segoe UI",Arial,sans-serif;font-size:12px;color:#1a1a2e;background:#fff}
      .page{max-width:900px;margin:0 auto;padding:40px 50px}
      .print-btn{position:fixed;top:20px;right:20px;padding:10px 22px;background:#6c47ff;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(108,71,255,0.25)}
      @media print{.print-btn{display:none}.page{padding:20px 24px}}
    </style></head><body>
    <button class="print-btn" onclick="window.print()">Print / Save PDF</button>
    <div class="page">
      <div style="border-bottom:3px solid #6c47ff;padding-bottom:20px;margin-bottom:28px;display:flex;align-items:center;justify-content:space-between;">
        <div style="display:flex;align-items:center;gap:16px;">
          <img src="${logoUrl}" alt="BIT Logo" style="height:60px;object-fit:contain;" onerror="this.style.display='none'"/>
          <div>
            <div style="font-size:20px;font-weight:900;color:#1a1a2e;">Bannari Amman Institute of Technology</div>
            <div style="font-size:11px;color:#6b7280;font-weight:600;margin-top:3px;text-transform:uppercase;">An Autonomous Institution Affiliated to Anna University</div>
            <div style="font-size:11px;color:#6b7280;">Sathyamanagalam, Erode, Tamil Nadu - 638401</div>
          </div>
        </div>
        <div style="text-align:right;">
          <div style="background:#6c47ff;color:#fff;padding:6px 14px;border-radius:20px;font-size:10px;font-weight:800;display:inline-block;text-transform:uppercase;">LAB RECORD</div>
          <div style="font-size:10px;color:#9ca3af;margin-top:6px;">Generated: ${dateStr}</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:28px;">
        ${[
          ["Register Number", booking.student_reg_num || '—'],
          ["Student Name", booking.student_name || '—'],
          ["Department / Sec", deptSec],
          ["Course Name", booking.skill_name || '—']
        ].map(([l, v]) => `<div style="background:#f8f7ff;border:1px solid #e5e4eb;border-radius:8px;padding:10px 14px;">
          <div style="font-size:9px;font-weight:800;color:#6c47ff;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">${l}</div>
          <div style="font-size:12px;font-weight:700;color:#1a1a2e;">${esc(v)}</div>
        </div>`).join('')}
      </div>
      <div style="display:flex;gap:16px;background:#f8f7ff;border:1px solid #e5e4eb;border-radius:8px;padding:12px 16px;margin-bottom:28px;font-size:12px;">
        <div style="flex:1;"><span style="color:#6b7280;font-weight:600;">Lab Session Date:</span> <strong>${esc(bkDate)}</strong></div>
        <div style="flex:1;"><span style="color:#6b7280;font-weight:600;">Session Timings:</span> <strong>${esc(bkTime)}</strong></div>
        <div style="flex:1.5;"><span style="color:#6b7280;font-weight:600;">Lab Venue:</span> <strong style="color:#6c47ff;">${esc(bkVenue)}</strong></div>
      </div>
      ${sectionsHtml}
      <div style="margin-top:36px;padding-top:24px;border-top:1.5px dashed #e5e4eb;display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">
        ${['Signature of Student','Lab In-charge','Faculty In-charge'].map(label =>
          `<div style="text-align:center;"><div style="height:28px;"></div>
          <div style="border-top:1px solid #e5e4eb;width:85%;margin:0 auto;padding-top:4px;font-size:9px;font-weight:700;color:#4b5563;text-transform:uppercase;">${label}</div></div>`
        ).join('')}
      </div>
    </div></body></html>`;

  const win = window.open('', '_blank', 'width=960,height=700');
  if (!win) { alert('Please allow popups for this site to export PDF.'); return; }
  win.document.write(html);
  win.document.close();
}

// ── Review Modal ───────────────────────────────────────────────────────────

function ReviewModal({ bookingId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("lab"); // "lab" | "survey" | "mcq"
  const [verifying, setVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    if (!bookingId) return;
    setLoading(true);
    setActiveTab("lab");
    facultyService.getStudentReviewData(bookingId)
      .then(res => {
        setData(res.data);
        // Read initial verification state from first survey row
        const verified = (res.data?.surveyResponses || []).some(r => r.is_incharge_verified === 1);
        setIsVerified(verified);
      })
      .catch(err => console.error("Failed to load review data", err))
      .finally(() => setLoading(false));
  }, [bookingId]);

  const handleVerify = async () => {
    setVerifying(true);
    try {
      await facultyService.verifyInchargeLabRecord(bookingId);
      setIsVerified(true);
      setData(prev => ({
        ...prev,
        surveyResponses: (prev?.surveyResponses || []).map(r => ({ ...r, is_incharge_verified: 1 }))
      }));
    } catch (err) {
      console.error("Failed to verify", err);
      alert(err?.response?.data?.message || "Failed to verify lab record.");
    } finally {
      setVerifying(false);
    }
  };

  if (!bookingId) return null;

  const surveyResponses = data?.surveyResponses || [];
  const hasSurvey = surveyResponses.length > 0;

  // Build PDF preview (mirrors TrainingSlots renderPdfPreview)
  const renderLabPreview = () => {
    const booking = data.booking;
    const bkDate = booking.booking_date || '—';
    const bkTime = booking.start_time ? `${booking.start_time} - ${booking.end_time || ''}` : '—';
    const bkVenue = booking.venue_name || '—';
    const questions = surveyResponses.map(r => ({ survey_question_id: r.survey_question_id, question: r.question }));
    const answers = {};
    surveyResponses.forEach(r => { answers[r.survey_question_id] = r.student_response; });
    const is10Qs = questions.length === 10;
    const sections = is10Qs ? [
      { name: "Individual Contribution", qids: [1, 2, 3, 4] },
      { name: "Teamwork & Collaboration", qids: [5, 6, 7, 8] },
      { name: "Learning & Reflection", qids: [9, 10] }
    ] : [
      { name: "Session Overview", qids: [1, 2, 3] },
      { name: "Individual Contribution", qids: [4, 5, 6] },
      { name: "Learning & Reflection", qids: [7, 8, 9] }
    ];

    return (
      <div style={{ background:"#fff", border:"1px solid #e5e4eb", borderRadius:8, padding:"20px 24px", fontSize:12, color:"#1a1a2e", lineHeight:1.5 }}>
        {/* Letterhead */}
        <div style={{ borderBottom:"2px solid #6c47ff", paddingBottom:12, marginBottom:18, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <img src="/BIT.png" alt="BIT Logo" style={{ height:44, objectFit:"contain" }} onError={e => { e.target.style.display='none'; }} />
            <div>
              <div style={{ fontSize:13, fontWeight:900, color:"#1a1a2e" }}>Bannari Amman Institute of Technology</div>
              <div style={{ fontSize:8, color:"#6b7280", fontWeight:600, textTransform:"uppercase" }}>An Autonomous Institution · Anna University</div>
              <div style={{ fontSize:8, color:"#6b7280" }}>Sathyamanagalam, Erode, Tamil Nadu - 638401</div>
            </div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ background:"#6c47ff", color:"#fff", padding:"4px 10px", borderRadius:12, fontSize:9, fontWeight:800, display:"inline-block", textTransform:"uppercase" }}>LAB RECORD</div>
          </div>
        </div>

        {/* Metadata */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:8, marginBottom:16 }}>
          {[
            ["Register Number", booking.student_reg_num || '—'],
            ["Student Name", booking.student_name || '—'],
            ["Department / Sec", booking.student_course || '—'],
            ["Course Name", booking.skill_name || '—']
          ].map(([l, v]) => (
            <div key={l} style={{ background:"#f8f7ff", border:"1px solid #e5e4eb", borderRadius:6, padding:"7px 10px" }}>
              <div style={{ fontSize:8, fontWeight:800, color:"#6c47ff", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:2 }}>{l}</div>
              <div style={{ fontSize:11, fontWeight:700 }}>{v}</div>
            </div>
          ))}
        </div>

        {/* Session row */}
        <div style={{ display:"flex", gap:10, background:"#f8f7ff", border:"1px solid #e5e4eb", borderRadius:6, padding:"9px 10px", marginBottom:16, fontSize:11 }}>
          <div style={{ flex:1 }}><span style={{ color:"#6b7280", fontWeight:600 }}>Date:</span> <strong>{bkDate}</strong></div>
          <div style={{ flex:1 }}><span style={{ color:"#6b7280", fontWeight:600 }}>Time:</span> <strong>{bkTime}</strong></div>
          <div style={{ flex:1.5 }}><span style={{ color:"#6b7280", fontWeight:600 }}>Venue:</span> <strong style={{ color:"#6c47ff" }}>{bkVenue}</strong></div>
        </div>

        {/* Q&A sections */}
        {hasSurvey ? sections.map(sec => {
          const qs = questions.filter(q => sec.qids.includes(Number(q.survey_question_id)));
          if (!qs.length) return null;
          return (
            <div key={sec.name} style={{ marginBottom:16 }}>
              <div style={{ fontSize:9, fontWeight:800, color:"#6c47ff", textTransform:"uppercase", letterSpacing:"1px", borderBottom:"1.5px solid #6c47ff", paddingBottom:3, marginBottom:8 }}>{sec.name}</div>
              <table style={{ width:"100%", borderCollapse:"collapse", border:"1px solid #e5e4eb" }}>
                <tbody>
                  {qs.map((q, idx) => {
                    const letters = ['A','B','C','D'];
                    return (
                      <tr key={q.survey_question_id} style={{ borderBottom:"1px solid #e5e4eb" }}>
                        <td style={{ width:"40%", verticalAlign:"top", padding:"9px 10px", fontSize:11, fontWeight:600, borderRight:"1px solid #e5e4eb" }}>
                          {letters[idx]||''}. {q.question}
                        </td>
                        <td style={{ verticalAlign:"top", padding:"9px 10px", fontSize:11, color:"#374151", lineHeight:1.5, whiteSpace:"pre-wrap" }}>
                          {answers[q.survey_question_id] || <em style={{ color:"#9ca3af" }}>Not answered</em>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        }) : (
          <div style={{ textAlign:"center", padding:"20px 0", color:"#9ca3af", fontSize:13 }}>No survey responses submitted yet.</div>
        )}

        {/* Signatures */}
        <div style={{ marginTop:28, paddingTop:16, borderTop:"1.5px dashed #e5e4eb", display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
          {['Signature of Student','Lab In-charge','Faculty In-charge'].map(label => (
            <div key={label} style={{ textAlign:"center" }}>
              <div style={{ height:24 }} />
              <div style={{ borderTop:"1px solid #e5e4eb", width:"85%", margin:"0 auto", paddingTop:3, fontSize:8, fontWeight:700, color:"#4b5563", textTransform:"uppercase" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const TABS = [
    { id: "lab", label: "📄 Lab Record" },
    { id: "survey", label: "📋 Survey Responses" },
    { id: "mcq", label: "🎯 MCQ Score" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col animate-slide-up" style={{ maxHeight: "92vh" }}>

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-start flex-shrink-0" style={{ background:"linear-gradient(135deg,#1e1b3a,#2d1f5e)" }}>
          <div>
            <h3 className="text-base font-bold text-white font-sans">Review Student Session</h3>
            {data?.booking && (
              <p className="text-xs mt-1 font-sans" style={{ color:"rgba(255,255,255,0.65)" }}>
                <span className="font-semibold text-white">{data.booking.student_name}</span>
                {" "}({data.booking.student_reg_num}) · {data.booking.skill_name} (L{data.booking.level_name || '—'})
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Verification badge */}
            {!loading && hasSurvey && (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                isVerified
                  ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-300"
                  : "bg-amber-400/20 border-amber-400/40 text-amber-300"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isVerified ? "bg-emerald-400" : "bg-amber-400"}`} />
                {isVerified ? "In-charge Verified" : "Verification Pending"}
              </span>
            )}
            <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6 bg-white flex-shrink-0">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-4 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-white" style={{ minHeight:320 }}>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
              <div className="w-8 h-8 rounded-full animate-spin" style={{ border:"3px solid #e5e7eb", borderTopColor:"#6366f1" }} />
              <p className="text-sm font-sans">Loading review data...</p>
            </div>
          ) : !data ? (
            <div className="text-center py-20 text-gray-400 text-sm font-sans">
              Failed to load data. Please close and try again.
            </div>
          ) : (
            <>
              {/* ── LAB RECORD TAB ── */}
              {activeTab === "lab" && (
                <div className="space-y-3">
                  {!hasSurvey && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700 font-medium font-sans">
                      ⚠️ Student has not submitted a lab record (end survey) yet.
                    </div>
                  )}
                  {renderLabPreview()}
                </div>
              )}

              {/* ── SURVEY RESPONSES TAB ── */}
              {activeTab === "survey" && (
                <div className="space-y-4">
                  {!hasSurvey ? (
                    <div className="text-center py-12 text-gray-400 text-sm font-sans">
                      <svg className="mx-auto mb-3 text-gray-300" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z"/></svg>
                      No end survey response found for this session.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {surveyResponses.map((item, idx) => (
                        <div key={idx} className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-left">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5 font-sans">Question {idx + 1}</p>
                          <p className="text-sm font-semibold text-gray-800 mb-2 font-sans">{item.question}</p>
                          <p className="text-sm text-gray-600 bg-white rounded-lg px-3 py-2 border border-gray-100 whitespace-pre-wrap font-sans">
                            {item.student_response || <span className="text-gray-400 italic">Not answered</span>}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── MCQ TAB ── */}
              {activeTab === "mcq" && (
                <div className="space-y-5 text-left">
                  {!data.assessment ? (
                    <div className="text-center py-12 text-gray-400 text-sm font-sans">
                      <svg className="mx-auto mb-3 text-gray-300" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 14.14 14.14"/></svg>
                      No MCQ assessment attempted or configured for this level.
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                        <div>
                          <h4 className="text-sm font-bold text-indigo-900 font-sans">{data.assessment.assessment_title}</h4>
                          <p className="text-xs text-indigo-500 mt-0.5 font-mono">Submitted: {new Date(data.assessment.submitted_at).toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="text-[10px] text-indigo-400 block font-semibold uppercase tracking-wider font-sans">Score</span>
                            <span className="text-2xl font-black text-indigo-700 font-sans">{data.assessment.score_obtained} <span className="text-xs font-medium text-indigo-400">/ {data.assessment.total_marks}</span></span>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold font-sans ${data.assessment.status === 'PASSED' || data.assessment.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {data.assessment.status}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider font-sans">Question Breakdown</h4>
                        {data.mcqAnswers.map((q, idx) => {
                          const options = [
                            { key: 'A', text: q.option_a },
                            { key: 'B', text: q.option_b },
                            { key: 'C', text: q.option_c },
                            { key: 'D', text: q.option_d }
                          ];
                          return (
                            <div key={q.mcq_question_id} className={`border rounded-xl p-4 bg-white ${q.is_correct ? 'border-emerald-200' : q.selected_option ? 'border-red-200' : 'border-gray-200'}`}>
                              <div className="flex justify-between items-start gap-3 mb-3">
                                <span className="text-sm font-bold text-gray-800 font-sans">Q{idx + 1}. {q.question_text}</span>
                                {q.is_correct
                                  ? <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 flex-shrink-0 font-sans">Correct</span>
                                  : q.selected_option
                                    ? <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 flex-shrink-0 font-sans">Incorrect</span>
                                    : <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500 flex-shrink-0 font-sans">Not Attempted</span>
                                }
                              </div>
                              <div className="grid sm:grid-cols-2 gap-2 text-xs">
                                {options.map(opt => {
                                  const isSel = q.selected_option === opt.key;
                                  const isCorr = q.correct_option === opt.key;
                                  let cls = "border border-gray-100 bg-gray-50 text-gray-700";
                                  if (isCorr) cls = "border-emerald-300 bg-emerald-50 text-emerald-800 font-medium";
                                  else if (isSel) cls = "border-red-300 bg-red-50 text-red-800 font-medium";
                                  return (
                                    <div key={opt.key} className={`px-3 py-2 rounded-lg flex items-center gap-2 ${cls}`}>
                                      <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${isCorr ? 'bg-emerald-200 text-emerald-800' : isSel ? 'bg-red-200 text-red-800' : 'bg-gray-200 text-gray-600'}`}>{opt.key}</span>
                                      <span className="font-sans">{opt.text}</span>
                                      {isCorr && <span className="ml-auto text-emerald-600 font-bold font-sans">✓</span>}
                                      {isSel && !isCorr && <span className="ml-auto text-red-600 font-bold font-sans">✗</span>}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex gap-2">
            {/* Export PDF button — only when survey exists */}
            {!loading && hasSurvey && (
              <button
                onClick={() => exportLabRecordPDF(data.booking, surveyResponses)}
                className="px-4 py-2 rounded-xl text-sm font-semibold border border-indigo-200 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors font-sans flex items-center gap-2"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Export PDF
              </button>
            )}
            {/* Approve button */}
            {!loading && hasSurvey && !isVerified && (
              <button
                onClick={handleVerify}
                disabled={verifying}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors font-sans flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {verifying ? (
                  <><div className="w-3.5 h-3.5 rounded-full animate-spin" style={{ border:"2px solid rgba(255,255,255,0.4)", borderTopColor:"#fff" }} /> Verifying...</>
                ) : (
                  <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg> Approve Lab Record</>
                )}
              </button>
            )}
            {!loading && hasSurvey && isVerified && (
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-100 text-emerald-700 font-sans">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                Lab Record Approved
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-gray-900 hover:bg-gray-800 text-white transition-colors font-sans"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}


function VenueDetail({ venue, onBack }) {
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [modalAttendance, setModalAttendance] = useState(null);
  const [modalMalpractice, setModalMalpractice] = useState(null);
  const [modalRevoke, setModalRevoke] = useState(null);
  const [reviewBookingId, setReviewBookingId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Load students for this mapping
  useEffect(() => {
    let cancelled = false;
    setLoadingStudents(true);
    facultyService.getStudentsByMapping(venue.mapping_id)
      .then(res => {
        if (!cancelled) setStudents(res.data || []);
      })
      .catch(err => {
        if (!cancelled) showToast('Failed to load students.', 'error');
        console.error(err);
      })
      .finally(() => { if (!cancelled) setLoadingStudents(false); });
    return () => { cancelled = true; };
  }, [venue.mapping_id]);

  const ongoingCount = students.filter((s) => s.status === "ONGOING").length;
  const malpracticeCount = students.filter((s) => s.status === "MALPRACTICE").length;
  const attendedCount = students.filter((s) => s.is_present === 1).length;

  const filtered = students.filter((s) => {
    const matchStatus = filterStatus === "ALL" || s.status === filterStatus;
    const q = search.toLowerCase();
    return matchStatus && (s.name.toLowerCase().includes(q) || (s.reg_num || '').toLowerCase().includes(q));
  });

  const handleMarkAttendance = async (student) => {
    try {
      await facultyService.markAttendance(student.booking_id);
      setStudents(prev => prev.map(s => s.booking_id === student.booking_id ? { ...s, is_present: 1 } : s));
      showToast(`Attendance marked for ${student.name}.`, "success");
    } catch {
      showToast('Failed to mark attendance.', 'error');
    }
    setModalAttendance(null);
  };

  const handleMarkMalpractice = async (reason) => {
    const student = modalMalpractice;
    try {
      await facultyService.markMalpractice(student.booking_id, reason);
      setStudents(prev => prev.map(s => s.booking_id === student.booking_id ? { ...s, status: "MALPRACTICE", remarks: reason } : s));
      showToast(`Malpractice flagged for ${student.name}.`, "warning");
    } catch {
      showToast('Failed to mark malpractice.', 'error');
    }
    setModalMalpractice(null);
  };

  const handleRevoke = async (reason) => {
    const student = modalRevoke;
    try {
      await facultyService.revokeMalpractice(student.booking_id);
      setStudents(prev => prev.map(s => s.booking_id === student.booking_id ? { ...s, status: "ONGOING", remarks: null } : s));
      showToast(`Malpractice flag revoked for ${student.name}.`, "success");
    } catch {
      showToast('Failed to revoke malpractice.', 'error');
    }
    setModalRevoke(null);
  };

  const handleMarkAll = async () => {
    try {
      const res = await facultyService.markAllAttendance(venue.mapping_id);
      setStudents(prev => prev.map(s => s.status === "ONGOING" ? { ...s, is_present: 1 } : s));
      showToast(`${res.data?.marked ?? 'All'} students marked as present.`, "success");
    } catch {
      showToast('Failed to mark all attendance.', 'error');
    }
  };

  const pendingAttendance = students.filter(s => s.is_present !== 1 && s.status === "ONGOING").length;

  return (
    <div className="space-y-5">
      {/* Back */}
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors group">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-0.5 transition-transform">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
        Back to My Venues
      </button>

      {/* Venue card */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-bold text-gray-900">{venue.venue_name}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{venue.location}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">{venue.skill_type}</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 font-mono">Cap: {venue.capacity}</span>
            </div>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-px bg-gray-100">
          {[
            { label: "Slot", value: `${formatTime(venue.start_time)} – ${formatTime(venue.end_time)}` },
            { label: "Skill Type", value: venue.skill_type },
            { label: "Capacity", value: `${venue.capacity} seats` },
            { label: "Current Bookings", value: venue.current_bookings ?? 0 },
          ].map((item) => (
            <div key={item.label} className="bg-white px-5 py-3">
              <p className="text-xs text-gray-400 mb-0.5">{item.label}</p>
              <p className="text-sm font-semibold text-gray-800">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Students", value: students.length, dot: "bg-gray-400" },
          { label: "Ongoing", value: ongoingCount, dot: "bg-emerald-500" },
          { label: "Malpractice", value: malpracticeCount, dot: "bg-red-500" },
          { label: "Attendance Marked", value: attendedCount, dot: "bg-blue-500" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 px-4 py-3">
            <p className="text-xs text-gray-400 mb-1">{s.label}</p>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
              <span className="text-xl font-bold text-gray-900">{s.value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Filter + Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or roll number..."
            className="w-full pl-8 pr-4 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 transition"
          />
        </div>
        <div className="flex gap-2">
          {["ALL", "ONGOING", "MALPRACTICE"].map((f) => (
            <button
              key={f}
              onClick={() => setFilterStatus(f)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                filterStatus === f
                  ? f === "MALPRACTICE" ? "bg-red-600 text-white"
                    : f === "ONGOING" ? "bg-emerald-600 text-white"
                    : "bg-gray-900 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {f === "ALL" ? "All" : f === "ONGOING" ? "Ongoing" : "Malpractice"}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk mark all */}
      {pendingAttendance > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-blue-800">Mark All as Present</p>
            <p className="text-xs text-blue-500 mt-0.5">{pendingAttendance} students pending</p>
          </div>
          <button
            onClick={handleMarkAll}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors flex-shrink-0"
          >
            Mark All Present
          </button>
        </div>
      )}

      {/* Cards */}
      {loadingStudents ? (
        <div className="bg-white rounded-xl border border-gray-200 py-14 flex flex-col items-center gap-2 text-gray-400">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-sm">Loading students...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-14 flex flex-col items-center gap-2 text-gray-400">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <p className="text-sm">No students match this filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((student, i) => (
            <StudentCard
              key={student.booking_id}
              student={{ ...student, _idx: i }}
              idx={i}
              onMarkAttendance={(s) => setModalAttendance(s)}
              onMarkMalpractice={(s) => setModalMalpractice(s)}
              onRevoke={(s) => setModalRevoke(s)}
              onReview={(s) => setReviewBookingId(s.booking_id)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <AttendanceModal
        student={modalAttendance}
        onCancel={() => setModalAttendance(null)}
        onConfirm={() => handleMarkAttendance(modalAttendance)}
      />
      <MalpracticeModal
        student={modalMalpractice}
        onCancel={() => setModalMalpractice(null)}
        onConfirm={handleMarkMalpractice}
      />
      <RevokeModal
        student={modalRevoke}
        onCancel={() => setModalRevoke(null)}
        onConfirm={handleRevoke}
      />
      <ReviewModal
        bookingId={reviewBookingId}
        onClose={() => setReviewBookingId(null)}
      />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

// ── Main MyVenues ──────────────────────────────────────────────────────────

export default function MyVenues() {
  const [selectedVenueId, setSelectedVenueId] = useState(null);
  const [selectedMapping, setSelectedMapping] = useState(null);
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const routeNavigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);

  const rawName = user?.name || user?.email || 'Faculty';
  const baseName = String(rawName).split('@')[0];
  const displayName = baseName
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
  const initials = String(displayName).trim()?.charAt(0)?.toUpperCase() || 'F';

  // Load venues from API
  const loadVenues = useCallback(() => {
    setLoading(true);
    setError(null);
    facultyService.getMyVenues()
      .then(res => setVenues(res.data || []))
      .catch(err => {
        console.error(err);
        setError('Failed to load venues. Please try again.');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadVenues(); }, [loadVenues]);

  const handleLogout = async () => {
    try { await authService.logout(); } finally {
      logout();
      routeNavigate('/auth/login', { replace: true });
    }
  };

  const handleBack = () => {
    if (selectedMapping) {
      setSelectedMapping(null);
    } else if (selectedVenueId) {
      setSelectedVenueId(null);
    } else {
      routeNavigate('/faculty-dashboard');
      window.scrollTo(0, 0);
    }
  };

  let crumbTitle = 'My Venues';
  if (selectedMapping) {
    crumbTitle = `${selectedMapping.venue_name} - ${formatTime(selectedMapping.start_time)}`;
  } else if (selectedVenueId) {
    const v = venues.find(x => x.venue_id === selectedVenueId);
    crumbTitle = v ? v.venue_name : 'Select Slot';
  }

  return (
    <div className={pageStyles.page}>

      {/* HEADER */}
      <header className={pageStyles.header}>
        <div className={pageStyles.headerLeft}>
          <button className={pageStyles.backBtn} onClick={handleBack}>
            ← Back
          </button>
          <span className={pageStyles.headerSep}>/</span>
          <span className={pageStyles.headerCrumb}>{crumbTitle}</span>
        </div>

        <div className={pageStyles.headerRight}>
          <div className={pageStyles.userPill} title={displayName}>
            <div className={pageStyles.userAvatar}>{initials}</div>
            <div className={pageStyles.userName}>{displayName}</div>
          </div>
          <button
            type="button"
            className={pageStyles.logoutBtn}
            onClick={handleLogout}
            aria-label="Logout"
            title="Logout"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M10 7V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M15 12H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 9l-3 3 3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </header>

      {/* CONTENT */}
      <main className={pageStyles.pageMain}>
        {selectedMapping ? (
          <div className={pageStyles.groups}>
            <VenueDetail venue={selectedMapping} onBack={() => setSelectedMapping(null)} />
          </div>
        ) : selectedVenueId ? (
          <>
            <div className={pageStyles.sectionHeader}>
              <div className={pageStyles.sectionTitle}>Select Slot Timing</div>
              <div className={pageStyles.sectionSub}>Allotted slots for this venue</div>
            </div>
            <div className={pageStyles.groups}>
              <div className={pageStyles.group}>
                <div className={pageStyles.groupLabel}>Available Slots</div>
                <div className={pageStyles.venuesList}>
                  {venues.filter(x => x.venue_id === selectedVenueId).map((slot) => (
                    <button
                      key={slot.mapping_id}
                      onClick={() => setSelectedMapping(slot)}
                      className="w-full bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center gap-4 hover:shadow-sm hover:border-gray-300 transition-all text-left group"
                    >
                      <div className="w-11 h-11 rounded-xl bg-emerald-600 flex items-center justify-center flex-shrink-0">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 mb-0.5">
                          {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
                        </p>
                        <div className="flex gap-2 mt-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                            {slot.current_bookings ?? 0} Students Booked
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 font-mono">
                            {slot.skill_type}
                          </span>
                        </div>
                      </div>
                      <span className="text-gray-300 text-lg group-hover:text-gray-500 transition-colors flex-shrink-0">›</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className={pageStyles.sectionHeader}>
              <div className={pageStyles.sectionTitle}>My Venues</div>
              <div className={pageStyles.sectionSub}>Venues currently assigned to you</div>
            </div>
            <div className={pageStyles.groups}>
              <div className={pageStyles.group}>
                <div className={pageStyles.groupLabel}>Assigned Venues</div>

                {loading ? (
                  <div className="bg-white rounded-xl border border-gray-200 py-14 flex flex-col items-center gap-3 text-gray-400">
                    <div className="w-6 h-6 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin" />
                    <p className="text-sm">Loading your venues...</p>
                  </div>
                ) : error ? (
                  <div className="bg-white rounded-xl border border-red-200 py-12 flex flex-col items-center gap-3 text-center px-6">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                    <p className="text-sm font-semibold text-red-600">{error}</p>
                    <button onClick={loadVenues} className="px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">
                      Retry
                    </button>
                  </div>
                ) : venues.length === 0 ? (
                  <div className={pageStyles.emptyState}>
                    <div className={pageStyles.emptyStateIcon}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
                    </div>
                    <div className={pageStyles.emptyStateTitle}>No Venues Assigned</div>
                    <div className={pageStyles.emptyStateDesc}>You have no venue assignments yet. Contact the admin for allocation.</div>
                    <span className={pageStyles.emptyStateBadge}>No active venues</span>
                  </div>
                ) : (
                  <div className={pageStyles.venuesList}>
                    {(() => {
                      const uniqueVenues = [];
                      const seenVenues = new Set();
                      venues.forEach(v => {
                        if (!seenVenues.has(v.venue_id)) {
                          seenVenues.add(v.venue_id);
                          const slots = venues.filter(x => x.venue_id === v.venue_id);
                          const totalBookings = slots.reduce((acc, curr) => acc + (curr.current_bookings ?? 0), 0);
                          uniqueVenues.push({
                            ...v,
                            slotsCount: slots.length,
                            totalBookings
                          });
                        }
                      });

                      return uniqueVenues.map((venue) => (
                        <button
                          key={venue.venue_id}
                          onClick={() => setSelectedVenueId(venue.venue_id)}
                          className="w-full bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center gap-4 hover:shadow-sm hover:border-gray-300 transition-all text-left group"
                        >
                          <div className="w-11 h-11 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900 mb-0.5 truncate">{venue.venue_name}</p>
                            <p className="text-xs text-gray-400">{venue.location}</p>
                            <div className="flex gap-2 mt-2 flex-wrap">
                              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
                                {venue.totalBookings} Total Students
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                                {venue.slotsCount} {venue.slotsCount === 1 ? 'Slot' : 'Slots'} Assigned
                              </span>
                            </div>
                          </div>
                          <span className="text-gray-300 text-lg group-hover:text-gray-500 transition-colors flex-shrink-0">›</span>
                        </button>
                      ));
                    })()}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>

      <style>{`
        @keyframes slide-up { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        .animate-slide-up { animation: slide-up 0.2s ease both; }
      `}</style>
    </div>
  );
}
