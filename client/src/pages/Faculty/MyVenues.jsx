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

function StudentCard({ student, idx, onMarkAttendance, onMarkMalpractice, onRevoke }) {
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
        </div>
      </div>
    </div>
  );
}

// ── Venue Detail View ──────────────────────────────────────────────────────

function VenueDetail({ venue, onBack }) {
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [modalAttendance, setModalAttendance] = useState(null);
  const [modalMalpractice, setModalMalpractice] = useState(null);
  const [modalRevoke, setModalRevoke] = useState(null);
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
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

// ── Main MyVenues ──────────────────────────────────────────────────────────

export default function MyVenues() {
  const [selectedVenue, setSelectedVenue] = useState(null);
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
    if (selectedVenue) {
      setSelectedVenue(null);
    } else {
      routeNavigate('/faculty-dashboard');
      window.scrollTo(0, 0);
    }
  };

  const crumbTitle = selectedVenue ? selectedVenue.venue_name : 'My Venues';

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
        {!selectedVenue ? (
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
                    {venues.map((venue) => (
                      <button
                        key={venue.mapping_id}
                        onClick={() => setSelectedVenue(venue)}
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
                              {venue.current_bookings ?? 0} Students
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                              {formatTime(venue.start_time)} – {formatTime(venue.end_time)}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 font-mono">
                              {venue.skill_type}
                            </span>
                          </div>
                        </div>
                        <span className="text-gray-300 text-lg group-hover:text-gray-500 transition-colors flex-shrink-0">›</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className={pageStyles.groups}>
            <VenueDetail venue={selectedVenue} onBack={() => setSelectedVenue(null)} />
          </div>
        )}
      </main>

      <style>{`
        @keyframes slide-up { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        .animate-slide-up { animation: slide-up 0.2s ease both; }
      `}</style>
    </div>
  );
}
