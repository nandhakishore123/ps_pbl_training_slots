import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

/* ============================================================
   BIT — Points & Training :: Reward Points (ADMIN full view)
   Full leaderboard experience adapted 1:1 from the uploaded
   standalone RewardPoints.jsx: live BASE_API leaderboard
   (by ?dept=) + per-student Details modal (PRANESH_BASE SSE).
   Admin-only — dept dropdown, year filter, search, ranked
   table, and per-student course-completion details.
   External data sources used as-is (browser → Google/HF).
   ============================================================ */

const BASE_API =
  "https://script.google.com/macros/s/AKfycbwUdK6oQZwo6SC-1eNUtQIyrNYp-RcKHSy-wBy-5RDonSuQaNDs_hdNfeXxpFnxsAx5/exec";
const PRANESH_BASE = "https://praneshjs-rewardpointssite.hf.space";

const DEPT_OPTIONS = [
  { value: "AGRI", label: "Agricultural Engg" },
  { value: "AIDS", label: "AI & Data Science" },
  { value: "AIML", label: "AI & ML" },
  { value: "BIOMEDICAL", label: "Biomedical" },
  { value: "BT", label: "Biotechnology" },
  { value: "CIVIL", label: "Civil Engg" },
  { value: "CSBS", label: "CS & Business Systems" },
  { value: "CSD", label: "CS & Design" },
  { value: "CSE", label: "Computer Science" },
  { value: "CT", label: "Computer Technology" },
  { value: "EEE", label: "Electrical & Electronics" },
  { value: "ECE", label: "Electronics & Comm" },
  { value: "EIE", label: "Electronics & Instr" },
  { value: "FT", label: "Fashion Technology" },
  { value: "ISE", label: "Info Science & Engg" },
  { value: "IT", label: "Information Technology" },
  { value: "MECH", label: "Mechanical Engg" },
  { value: "MTRS", label: "Mechatronics" },
];

const DEPT_NAMES = DEPT_OPTIONS.reduce((m, d) => {
  m[d.value] = d.label;
  return m;
}, {});

/* ---- getCatGroupStyle ---- */
function getCatGroupStyle(cat) {
  const c = cat.toUpperCase();
  if (c.includes("P SKILL") || c.includes("SKILL"))
    return { bg: "#eff6ff", border: "rgba(59,130,246,0.3)", hdr: "#1e40af", icon: "" };
  if (c.includes("INITIATIVE"))
    return { bg: "#f0fdf4", border: "rgba(34,197,94,0.3)", hdr: "#15803d", icon: "" };
  if (c.includes("HACKATHON") || c.includes("TECHNICAL"))
    return { bg: "#fdf4ff", border: "rgba(168,85,247,0.3)", hdr: "#7e22ce", icon: "" };
  if (c.includes("PROJECT"))
    return { bg: "#fff7ed", border: "rgba(249,115,22,0.3)", hdr: "#c2410c", icon: "" };
  return { bg: "#f8fafc", border: "rgba(148,163,184,0.3)", hdr: "#475569", icon: "" };
}

/* ---- parseCourseDetails ---- */
function parseCourseDetails(raw) {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const courses = [];
  let totalPoints = 0;
  const tm = raw.match(/TOTAL REWARD POINTS FROM ACTIVITIES:\s*([\d.]+)/i);
  if (tm) totalPoints = parseFloat(tm[1]);
  for (const line of lines) {
    const m2 = line.match(/^\d+\.\s+(.+?)\s*-\s*\(([^)]+)\)\s*-\s*([\d.]+)\s*pts$/i);
    if (m2) {
      const [, lbl, dr, pts] = m2;
      const [cat, ...np] = lbl.trim().split(":");
      courses.push({
        category: cat.trim(),
        name: np.length ? np.join(":").trim() : lbl.trim(),
        dateRange: dr.trim(),
        points: parseFloat(pts),
      });
      continue;
    }
    const m1 = line.match(/^\d+\.\s+(.+?)\s*-\s*([\d.]+)\s*pts$/i);
    if (m1) {
      const [, lbl, pts] = m1;
      const [cat, ...np] = lbl.trim().split(":");
      courses.push({
        category: cat.trim(),
        name: np.length ? np.join(":").trim() : lbl.trim(),
        dateRange: null,
        points: parseFloat(pts),
      });
    }
  }
  return { courses, totalPoints };
}

/* ---- case-insensitive <mark> highlighter ---- */
function highlight(text, search) {
  const t = String(text);
  if (!search) return t;
  const out = [];
  const upper = t.toUpperCase();
  const su = search.toUpperCase();
  let i = 0;
  let key = 0;
  if (!su.length) return t;
  while (true) {
    const idx = upper.indexOf(su, i);
    if (idx === -1) {
      out.push(t.slice(i));
      break;
    }
    if (idx > i) out.push(t.slice(i, idx));
    out.push(<mark key={key++}>{t.slice(idx, idx + su.length)}</mark>);
    i = idx + su.length;
  }
  return out;
}

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

.rp-app { box-sizing: border-box; }
.rp-app *, .rp-app *::before, .rp-app *::after { box-sizing: border-box; }
.rp-app {
  --purple: #6c47ff;
  --purple-dim: rgba(108, 71, 255, 0.1);
  --purple-glow: rgba(108, 71, 255, 0.3);
  --bg: #f0f2f8;
  --white: #fff;
  --border: #e5e4eb;
  --text: #1a1a2e;
  --text2: #6b7280;
  --text3: #9ca3af;
  --green: #10b981;
  --red: #ef4444;
  --gold: #f59e0b;
  --font-head: 'Outfit', sans-serif;
  --font-body: 'Plus Jakarta Sans', sans-serif;
  font-family: var(--font-body);
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
  -webkit-font-smoothing: antialiased;
}
.rp-app * { font-family: var(--font-body); }

.rp-app .pt-header {
  background: var(--white); border-bottom: 1px solid var(--border);
  padding: 16px 24px; display: flex; align-items: center;
  justify-content: space-between; gap: 12px; position: sticky; top: 0;
  z-index: 100; box-shadow: 0 1px 8px rgba(0, 0, 0, 0.05);
}
.rp-app .pt-header-icon {
  width: 36px; height: 36px; border-radius: 10px; background: var(--purple-dim);
  display: flex; align-items: center; justify-content: center; font-size: 18px;
}
.rp-app .pt-header-title { font-size: 18px; font-weight: 800; color: var(--text); font-family: var(--font-head); }
.rp-app .pt-header-sub { font-size: 12px; color: var(--text3); margin-top: 1px; }

.rp-app .pt-content { padding: 16px 24px 32px; }

.rp-app .pt-section-back {
  display: flex; align-items: center; gap: 8px; background: var(--white);
  border: 1.5px solid var(--border); color: var(--text2); padding: 9px 16px;
  border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer;
  transition: all 0.2s; width: fit-content; margin-bottom: 16px; font-family: var(--font-body);
}
.rp-app .pt-section-back:hover { background: var(--purple-dim); border-color: rgba(108, 71, 255, 0.3); }

.rp-app .pt-filters { display: flex; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; }
.rp-app .pt-select {
  padding: 8px 28px 8px 12px; border: 1.5px solid var(--border); border-radius: 8px;
  background: var(--white); font-size: 13px; font-weight: 600; color: var(--text);
  outline: none; cursor: pointer; appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 8px center; font-family: var(--font-body);
}
.rp-app .pt-select:focus { border-color: var(--purple); }
.rp-app .pt-search {
  flex: 1; min-width: 160px; padding: 8px 14px; border: 1.5px solid var(--border);
  border-radius: 8px; background: var(--white); font-size: 13px; color: var(--text);
  outline: none; font-family: var(--font-body);
}
.rp-app .pt-search:focus { border-color: var(--purple); }
.rp-app .pt-search::placeholder { color: var(--text3); }

.rp-app .pt-count { font-size: 11px; color: var(--text3); text-align: right; margin-bottom: 8px; }

.rp-app .pt-table-card { background: var(--white); border-radius: 14px; border: 1px solid var(--border); overflow: hidden; }
.rp-app .pt-table-head-with-btn {
  display: grid; grid-template-columns: 56px 1fr 90px 100px 90px; padding: 10px 18px;
  background: linear-gradient(90deg, #f8f7ff, #f0eeff); font-size: 10px; font-weight: 800;
  color: var(--text3); letter-spacing: 1.5px; text-transform: uppercase; border-bottom: 1px solid var(--border);
}
.rp-app .pt-table-head-pts { text-align: right; }
.rp-app .pt-table-row-with-btn {
  display: grid; grid-template-columns: 56px 1fr 90px 100px 90px; align-items: center;
  padding: 12px 18px; border-bottom: 1px solid #f3f4f6; transition: background 0.15s; animation: rpRowIn 0.3s ease both;
}
.rp-app .pt-table-row-with-btn:last-child { border-bottom: none; }
.rp-app .pt-table-row-with-btn:hover { background: #f8f7ff; }
.rp-app .pt-rank { font-size: 15px; font-weight: 900; color: var(--text3); }
.rp-app .pt-name { font-size: 13px; font-weight: 700; color: var(--text); }
.rp-app .pt-roll { font-size: 11px; color: var(--text3); margin-top: 2px; }
.rp-app .pt-dept { font-size: 12px; color: var(--text2); font-weight: 600; }
.rp-app .pt-pts { font-size: 16px; font-weight: 900; color: var(--purple); text-align: right; }

.rp-app .details-btn {
  display: inline-flex; align-items: center; gap: 3px; padding: 3px 9px; border-radius: 20px;
  border: 1px solid rgba(108, 71, 255, 0.25); background: rgba(108, 71, 255, 0.07);
  color: var(--purple); font-family: var(--font-body); font-size: 10px; font-weight: 700;
  cursor: pointer; transition: all 0.2s; white-space: nowrap; letter-spacing: 0.5px;
}
.rp-app .details-btn:hover { background: rgba(108, 71, 255, 0.16); border-color: var(--purple); }

@keyframes rpRowIn { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: translateX(0); } }

.rp-app mark { background: rgba(108, 71, 255, 0.15); color: var(--purple); border-radius: 3px; padding: 0 3px; font-weight: 900; }

.rp-app .pt-empty { text-align: center; padding: 40px 20px; color: var(--text3); font-size: 14px; }
.rp-app .pt-spinner-wrap { text-align: center; padding: 40px 20px; }
.rp-app .pt-spinner {
  width: 32px; height: 32px; border: 3px solid var(--border); border-top-color: var(--purple);
  border-radius: 50%; animation: rpSpin 0.7s linear infinite; margin: 0 auto 12px;
}
.rp-app .pt-spinner-text { font-size: 13px; color: var(--text2); font-weight: 600; }
@keyframes rpSpin { to { transform: rotate(360deg); } }

#rp-details-overlay {
  position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); z-index: 10001;
  display: none; align-items: center; justify-content: center; padding: 20px; backdrop-filter: blur(4px);
}
#rp-details-overlay.open { display: flex; }
.rp-app-modal .pt-details-modal, .pt-details-modal {
  background: var(--white, #fff); border-radius: 20px; width: 100%; max-width: 560px;
  max-height: 85vh; overflow: hidden; display: flex; flex-direction: column;
  animation: rpModalIn 0.3s cubic-bezier(0.22, 1, 0.36, 1) both; box-shadow: 0 24px 60px rgba(0, 0, 0, 0.2);
  font-family: 'Plus Jakarta Sans', sans-serif;
}
.pt-details-header {
  background: linear-gradient(135deg, #1e1b3a, #2d1f5e); padding: 20px 24px;
  display: flex; align-items: center; justify-content: space-between; flex-shrink: 0;
}
.pt-details-name { font-size: 17px; font-weight: 800; color: #fff; font-family: 'Outfit', sans-serif; }
.pt-details-roll { font-size: 11px; color: rgba(255, 255, 255, 0.6); margin-top: 3px; letter-spacing: 1px; }
.pt-details-close {
  width: 32px; height: 32px; border-radius: 50%; border: 1px solid rgba(255, 255, 255, 0.2);
  background: transparent; color: rgba(255, 255, 255, 0.7); display: flex; align-items: center;
  justify-content: center; cursor: pointer; font-size: 16px; transition: all 0.2s;
}
.pt-details-close:hover { background: rgba(255, 255, 255, 0.1); color: #fff; }
.pt-details-body { overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 14px; flex: 1; }
.pt-details-total {
  display: flex; align-items: center; justify-content: space-between;
  background: rgba(108, 71, 255, 0.07); border: 1px solid rgba(108, 71, 255, 0.2);
  border-radius: 10px; padding: 16px 20px;
}
.pt-details-total-label { font-size: 13px; font-weight: 600; color: #6b7280; }
.pt-details-total-val { font-size: 24px; font-weight: 900; color: #6c47ff; font-family: 'Outfit', sans-serif; }
.pt-details-group { border: 1px solid #e5e4eb; border-radius: 12px; overflow: hidden; margin-bottom: 2px; }
.pt-details-group-hdr {
  display: flex; align-items: center; justify-content: space-between; padding: 11px 16px;
  font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;
}
.pt-details-group-total { font-size: 13px; font-weight: 900; }
.pt-details-item {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
  padding: 11px 16px; border-top: 1px solid #e5e4eb; transition: background 0.15s;
}
.pt-details-item:hover { background: #f8f7ff; }
.pt-details-item-name { font-size: 13px; font-weight: 600; color: #1a1a2e; line-height: 1.4; }
.pt-details-item-date { font-size: 11px; color: #9ca3af; margin-top: 2px; }
.pt-details-item-pts { font-size: 14px; font-weight: 800; color: #6c47ff; white-space: nowrap; flex-shrink: 0; }
.pt-details-loading { display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 50px 20px; color: #6b7280; font-size: 14px; }
.pt-details-empty { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 50px 20px; color: #9ca3af; font-size: 14px; text-align: center; }
@keyframes rpModalIn { from { opacity: 0; transform: translateY(24px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
`;

export default function AdminRewardPoints() {
  const navigate = useNavigate();

  const [dept, setDept] = useState("BT");
  const [year, setYear] = useState("ALL");
  const [search, setSearch] = useState("");

  const [rpData, setRpData] = useState([]);
  const [rpStatus, setRpStatus] = useState("loading"); // loading | loaded | error

  // details modal
  const [dOpen, setDOpen] = useState(false);
  const [dName, setDName] = useState("");
  const [dRoll, setDRoll] = useState("");
  const [dStatus, setDStatus] = useState("loading"); // loading | empty | nocourse | error | data
  const [dCourses, setDCourses] = useState([]);
  const [dTotal, setDTotal] = useState(0);
  const [dErr, setDErr] = useState("");

  const reqRef = useRef(0);
  const esRef = useRef(null);

  /* lock scroll when modal open */
  useEffect(() => {
    document.body.style.overflow = dOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [dOpen]);

  async function loadRP(d) {
    const id = ++reqRef.current;
    setRpStatus("loading");
    try {
      const res = await fetch(`${BASE_API}?dept=${encodeURIComponent(d)}`);
      const json = await res.json();
      if (id !== reqRef.current) return;
      setRpData(json.data || []);
      setRpStatus("loaded");
    } catch (e) {
      if (id !== reqRef.current) return;
      setRpStatus("error");
    }
  }

  useEffect(() => {
    loadRP(dept);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dept]);

  function openDetails(roll, name) {
    setDName(name);
    setDRoll(roll);
    setDStatus("loading");
    setDCourses([]);
    setDTotal(0);
    setDErr("");
    setDOpen(true);
    fetchDetails(roll);
  }
  function closeDetails() {
    if (esRef.current) {
      try { esRef.current.close(); } catch (e) {}
    }
    setDOpen(false);
  }

  async function fetchDetails(roll) {
    try {
      const submitRes = await fetch(`${PRANESH_BASE}/gradio_api/call/search_student`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: [roll] }),
      });
      if (!submitRes.ok) throw new Error(`HTTP ${submitRes.status}`);
      const { event_id } = await submitRes.json();
      if (!event_id) throw new Error("No event_id");
      const rawText = await new Promise((resolve, reject) => {
        if (esRef.current) {
          try { esRef.current.close(); } catch (e) {}
        }
        const src = new EventSource(`${PRANESH_BASE}/gradio_api/call/search_student/${event_id}`);
        esRef.current = src;
        const timer = setTimeout(() => { src.close(); reject(new Error("Timeout")); }, 30000);
        src.addEventListener("complete", (e) => {
          clearTimeout(timer);
          src.close();
          try { resolve(String(JSON.parse(e.data)[0] || "")); }
          catch (err) { reject(new Error("Parse error")); }
        });
        src.onmessage = (e) => {
          try {
            const p = JSON.parse(e.data);
            if (Array.isArray(p) && p[0]) {
              clearTimeout(timer);
              src.close();
              resolve(String(p[0]));
            }
          } catch (err) {}
        };
        src.onerror = () => { clearTimeout(timer); src.close(); reject(new Error("Stream error")); };
      });
      if (!rawText || rawText.toLowerCase().includes("not found")) {
        setDStatus("empty");
        return;
      }
      const { courses, totalPoints } = parseCourseDetails(rawText);
      if (!courses.length) {
        setDStatus("nocourse");
        return;
      }
      setDCourses(courses);
      setDTotal(totalPoints);
      setDStatus("data");
    } catch (err) {
      setDErr(err.message);
      setDStatus("error");
    }
  }

  const sorted = [...rpData].sort((a, b) => b.balance - a.balance);
  const byYear = year === "ALL" ? sorted : sorted.filter((s) => s.roll.substring(4, 6) === year);
  const su = search.trim().toUpperCase();
  const filtered = byYear.filter(
    (s) => !su || s.name.toUpperCase().includes(su) || s.roll.includes(su)
  );

  const grouped = {};
  for (const c of dCourses) {
    if (!grouped[c.category]) grouped[c.category] = [];
    grouped[c.category].push(c);
  }

  return (
    <div className="rp-app">
      <style>{STYLES}</style>

      {/* HEADER */}
      <div className="pt-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="pt-header-icon">🏅</div>
          <div>
            <div className="pt-header-title">Reward Points — Leaderboard</div>
            <div className="pt-header-sub">Admin · full department rankings & details</div>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="pt-content">
        <button className="pt-section-back" onClick={() => navigate(-1)}>
          ← Back
        </button>

        <div className="pt-filters">
          <select className="pt-select" value={dept} onChange={(e) => setDept(e.target.value)}>
            {DEPT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select className="pt-select" value={year} onChange={(e) => setYear(e.target.value)}>
            <option value="ALL">Overall Ranking</option>
            <option value="23">3rd Year</option>
            <option value="24">2nd Year</option>
            <option value="25">1st Year</option>
          </select>
          <input
            type="text"
            className="pt-search"
            placeholder="e.g. 7376242BT192"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="pt-count">
          {rpStatus === "loaded" ? `Showing ${filtered.length} of ${byYear.length} students` : ""}
        </div>

        <div className="pt-table-card">
          <div className="pt-table-head-with-btn">
            <span>RANK</span>
            <span>STUDENT</span>
            <span></span>
            <span>YEAR</span>
            <span className="pt-table-head-pts">POINTS</span>
          </div>

          <div>
            {rpStatus === "loading" && (
              <div className="pt-spinner-wrap">
                <div className="pt-spinner"></div>
                <div className="pt-spinner-text">Loading {DEPT_NAMES[dept] || dept} rankings...</div>
              </div>
            )}

            {rpStatus === "error" && (
              <div className="pt-empty">Failed to load. Check connection.</div>
            )}

            {rpStatus === "loaded" && filtered.length === 0 && (
              <div className="pt-empty">No students found.</div>
            )}

            {rpStatus === "loaded" &&
              filtered.map((s, i) => {
                const gr = byYear.indexOf(s);
                const yr = s.roll.substring(4, 6);
                const yrTxt = yr === "23" ? "3rd Year" : yr === "24" ? "2nd Year" : "1st Year";
                return (
                  <div
                    className="pt-table-row-with-btn"
                    key={s.roll + i}
                    style={{ animationDelay: `${Math.min(i * 12, 350)}ms` }}
                  >
                    <div className="pt-rank">{gr + 1}</div>
                    <div>
                      <div className="pt-name">{highlight(s.name, su)}</div>
                      <div className="pt-roll">{highlight(s.roll, su)}</div>
                    </div>
                    <div>
                      <button
                        className="details-btn"
                        onClick={() => openDetails(s.roll, s.name)}
                        title="View course completion"
                      >
                        Details
                      </button>
                    </div>
                    <div className="pt-dept">{yrTxt}</div>
                    <div className="pt-pts">{Number(s.balance || 0).toLocaleString()}</div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* DETAILS MODAL */}
      <div
        id="rp-details-overlay"
        className={dOpen ? "open" : ""}
        onMouseDown={(e) => { if (e.target === e.currentTarget) closeDetails(); }}
      >
        <div className="pt-details-modal">
          <div className="pt-details-header">
            <div>
              <div className="pt-details-name">{dName || "—"}</div>
              <div className="pt-details-roll">{dRoll || "—"}</div>
            </div>
            <button className="pt-details-close" onClick={closeDetails}>×</button>
          </div>

          <div className="pt-details-body">
            {dStatus === "loading" && (
              <div className="pt-details-loading">
                <div className="pt-spinner"></div>
                <p>Fetching details for <strong>{dRoll}</strong>...</p>
              </div>
            )}

            {dStatus === "empty" && (
              <div className="pt-details-empty">
                <p>No data found for <strong>{dRoll}</strong>.</p>
              </div>
            )}

            {dStatus === "nocourse" && (
              <div className="pt-details-empty"><p>No course activity found.</p></div>
            )}

            {dStatus === "error" && (
              <div className="pt-details-empty">
                <p>Failed to fetch details.</p>
                <small style={{ color: "#9ca3af" }}>{dErr}</small>
              </div>
            )}

            {dStatus === "data" && (
              <>
                {dTotal ? (
                  <div className="pt-details-total">
                    <span className="pt-details-total-label">Total Points from Activities</span>
                    <span className="pt-details-total-val">{dTotal.toLocaleString()} pts</span>
                  </div>
                ) : null}
                <div>
                  {Object.entries(grouped).map(([cat, items]) => {
                    const st = getCatGroupStyle(cat);
                    const catTotal = items.reduce((sum, it) => sum + it.points, 0);
                    return (
                      <div className="pt-details-group" key={cat} style={{ borderColor: st.border, background: st.bg }}>
                        <div className="pt-details-group-hdr" style={{ color: st.hdr }}>
                          <span>{st.icon} {cat}</span>
                          <span className="pt-details-group-total">{catTotal.toLocaleString()} pts</span>
                        </div>
                        {items.map((item, idx) => (
                          <div className="pt-details-item" key={idx}>
                            <div>
                              <div className="pt-details-item-name">{item.name}</div>
                              {item.dateRange ? (
                                <div className="pt-details-item-date">{item.dateRange}</div>
                              ) : null}
                            </div>
                            <div className="pt-details-item-pts">+{item.points.toLocaleString()} pts</div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
