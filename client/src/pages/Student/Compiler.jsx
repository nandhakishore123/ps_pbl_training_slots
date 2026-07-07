// Compiler.jsx
// Extracted from Points & Training Script (index_working.html)
// Course: Programming Python (PS Course ID: 3)
// Data taken directly from COMPILER_QUESTIONS[3] and runCode() logic

import { useState, useRef, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";

// ── Extracted directly from COMPILER_QUESTIONS[3] in index_working.html ──
const COURSE = {
  title:    "Programming Python",
  lang:     "python",
  version:  "3.10.0",
  pill:     "Python 3.10",
  tabName:  "main.py",
  problem:  "Write a Python program to check if a number is Prime.\n\nRequirements:\n• Read an integer from the user\n• Check if it is a prime number\n• Print \"Prime\" or \"Not Prime\"",
  hint:     "A prime number is divisible only by 1 and itself. Check divisibility from 2 to sqrt(n).",
  expected: "Enter a number: 7\nPrime\n\nEnter a number: 9\nNot Prime",
  starter:  `import math\n\nn = int(input("Enter a number: "))\n\n# Write your prime check logic here\nis_prime = True\n\nif n < 2:\n    is_prime = False\nelse:\n    for i in range(2, int(math.sqrt(n)) + 1):\n        # check if n is divisible by i\n        pass\n\nif is_prime:\n    print("Prime")\nelse:\n    print("Not Prime")`,
};

// ── Icons ─────────────────────────────────────────────────────
const IcoCode = () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>;
const IcoTerm = () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>;
const IcoFile = () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
const IcoPlay = () => <svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>;

const P = "#6c47ff";
const T = { bg:"#0d0d14", panel:"#13131f", sidebar:"#0f0f1a", border:"#1e1e2e", green:"#3fb950", red:"#f85149", yellow:"#e3b341", teal:"#4ec9b0", text:"#e2e8f0", text2:"#8b9ec7", text3:"#4a5580" };

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

// ── Sidebar ───────────────────────────────────────────────────
function Sidebar({ active, setActive, isMobile }) {
  const items = [
    { id: "editor",   icon: <IcoCode />, label: "Editor"   },
    { id: "terminal", icon: <IcoTerm />, label: "Terminal" },
    { id: "files",    icon: <IcoFile />, label: "Files"    },
  ];
  return (
    <div style={{ width: isMobile ? "100%" : 52, height: isMobile ? 52 : "auto", background: T.sidebar, borderRight: isMobile ? "none" : `1px solid ${T.border}`, borderBottom: isMobile ? `1px solid ${T.border}` : "none", display: "flex", flexDirection: isMobile ? "row" : "column", alignItems: "center", padding: isMobile ? "6px 10px" : undefined, paddingTop: isMobile ? undefined : 12, gap: isMobile ? 8 : 4, flexShrink: 0, overflowX: isMobile ? "auto" : "hidden" }}>
      <div style={{ width: 30, height: 30, borderRadius: 8, background: P, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: isMobile ? 0 : 16, marginRight: isMobile ? 6 : 0, fontWeight: 900, color: "#fff", fontSize: 15, flexShrink: 0 }}>B</div>
      {items.map(it => (
        <button key={it.id} title={it.label} onClick={() => setActive(it.id)}
          style={{ width: 40, height: 40, borderRadius: 8, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: active === it.id ? "rgba(108,71,255,0.18)" : "transparent", color: active === it.id ? P : T.text3, transition: "all .18s" }}>
          {it.icon}
        </button>
      ))}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────
export default function Compiler() {
  const isMobile = useIsNarrow(640);

  // Persistence keys (sessionStorage → survives refresh, clears when the tab closes)
  const CODE_KEY  = `compiler:code:${COURSE.lang}`;
  const STDIN_KEY = `compiler:stdin:${COURSE.lang}`;

  // Active view (Editor/Terminal/Files) reflected in the URL (?view=) so refresh keeps it.
  const [searchParams, setSearchParams] = useSearchParams();
  const VIEWS = ["editor", "terminal", "files"];
  const viewParam = searchParams.get("view");
  const sideActive = VIEWS.includes(viewParam) ? viewParam : "editor";
  const setSideActive = useCallback((next) => {
    setSearchParams((prev) => { const p = new URLSearchParams(prev); p.set("view", next); return p; });
  }, [setSearchParams]);

  // Code + stdin restored from sessionStorage if present. A real saved buffer (including an
  // empty string) is never overwritten by starter code; otherwise fall back to defaults.
  const [code, setCode] = useState(() => {
    try { const s = sessionStorage.getItem(CODE_KEY); return s !== null ? s : COURSE.starter; }
    catch { return COURSE.starter; }
  });
  const [stdin, setStdin] = useState(() => {
    try { const s = sessionStorage.getItem(STDIN_KEY); return s !== null ? s : "7"; }
    catch { return "7"; }
  });
  const [output,     setOutput]     = useState({ text: "BIT Assessment IDE — Ready. Write your code and click Run.", type: "info" });
  const [running,    setRunning]    = useState(false);
  const [execTime,   setExecTime]   = useState(null);
  const [fontSize,   setFontSize]   = useState(14);
  const [wrapOn,     setWrapOn]     = useState(false);
  const [history,    setHistory]    = useState([]);
  const [activeTab,  setActiveTab]  = useState("terminal");
  const editorRef = useRef(null);
  const lnRef     = useRef(null);

  // Persist code + stdin on every change (buffer only — this never triggers a run).
  useEffect(() => {
    try { sessionStorage.setItem(CODE_KEY, code); } catch {}
  }, [CODE_KEY, code]);
  useEffect(() => {
    try { sessionStorage.setItem(STDIN_KEY, stdin); } catch {}
  }, [STDIN_KEY, stdin]);

  const handleScroll = () => {
    if (lnRef.current && editorRef.current) lnRef.current.scrollTop = editorRef.current.scrollTop;
  };

  // ── handleEditorKey — extracted from handleEditorKey() in index_working.html ──
  const handleKeyDown = useCallback((e) => {
    const el = editorRef.current;
    if (e.key === "Tab") {
      e.preventDefault();
      const s = el.selectionStart, en = el.selectionEnd;
      const nv = code.substring(0, s) + "    " + code.substring(en);
      setCode(nv);
      requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = s + 4; });
      return;
    }
    if (e.ctrlKey && e.key === "Enter") { e.preventDefault(); runCode(); return; }
    // Auto-indent on Enter — extracted from handleEditorKey in script
    if (e.key === "Enter") {
      e.preventDefault();
      const s = el.selectionStart;
      const lines = code.substring(0, s).split("\n");
      const cur = lines[lines.length - 1];
      let indent = cur.match(/^(\s*)/)[1];
      if (/[:{([]\s*$/.test(cur.trimEnd())) indent += "    ";
      const nv = code.substring(0, s) + "\n" + indent + code.substring(el.selectionEnd);
      setCode(nv);
      requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = s + 1 + indent.length; });
      return;
    }
    // Auto-closing brackets — extracted from handleEditorKey in script
    const autoClose = { "(": ")", "[": "]", "{": "}" };
    if (autoClose[e.key]) {
      e.preventDefault();
      const s = el.selectionStart;
      const nv = code.substring(0, s) + e.key + autoClose[e.key] + code.substring(s);
      setCode(nv);
      requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = s + 1; });
    }
  }, [code]);

  // ── runCode — extracted from runCode() in index_working.html ──
  const runCode = async () => {
    setRunning(true);
    setActiveTab("terminal");
    setOutput({ text: "Compiling and running...", type: "info" });
    setExecTime(null);
    const t0 = Date.now();
    try {
      const resp = await fetch("https://emkc.org/api/v2/piston/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: COURSE.lang,
          version:  COURSE.version,
          files:    [{ name: COURSE.tabName, content: code }],
          stdin:    stdin,
        }),
      });
      const elapsed = Date.now() - t0;
      setExecTime(elapsed);
      if (!resp.ok) {
        if (resp.status === 401) throw new Error("Language version not supported. Try changing version.");
        throw new Error("API error: HTTP " + resp.status);
      }
      const res      = await resp.json();
      const stdout   = res.run?.stdout   || "";
      const stderr   = res.run?.stderr   || "";
      const compErr  = res.compile?.stderr || "";
      const exitCode = res.run?.code ?? 0;
      let text, type;
      if (compErr) {
        text = "-- Compilation Error --\n\n" + compErr; type = "error";
      } else if (exitCode !== 0 && !stdout) {
        text = `-- Runtime Error (exit ${exitCode}) --\n\n` + stderr; type = "error";
      } else {
        text = stdout || "(No output)"; type = "success";
        if (stderr) text += "\n\n-- stderr --\n" + stderr;
      }
      setOutput({ text, type });
      setHistory(h => [{ stdin, output: text, time: elapsed, type, at: new Date().toLocaleTimeString() }, ...h].slice(0, 5));
    } catch (err) {
      setExecTime(Date.now() - t0);
      setOutput({ text: "-- Error --\n\n" + err.message, type: "error" });
    }
    setRunning(false);
  };

  // ── exportCompilerPDF — extracted from exportCompilerPDF() in index_working.html ──
  const exportPDF = () => {
    const now     = new Date();
    const dateStr = now.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
    const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    const esc = s => String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    const isErr = output.text.includes("Error");

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
    <title>${COURSE.title} — BIT Assessment</title><style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:"Segoe UI",Arial,sans-serif;font-size:12px;color:#1a1a2e;background:#fff;}
    .page{max-width:900px;margin:0 auto;padding:36px 44px;}
    .print-btn{position:fixed;top:16px;right:16px;padding:8px 18px;background:#6c47ff;color:#fff;border:none;border-radius:7px;font-size:11px;font-weight:700;cursor:pointer;}
    @media print{.print-btn{display:none;}}
    .header{border-bottom:3px solid #6c47ff;padding-bottom:18px;margin-bottom:24px;display:flex;justify-content:space-between;align-items:flex-start;}
    .inst{font-size:20px;font-weight:900;}.inst-sub{font-size:11px;color:#6b7280;margin-top:3px;}
    .badge{background:#6c47ff;color:#fff;padding:5px 14px;border-radius:20px;font-size:11px;font-weight:700;}
    .info-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:22px;}
    .info-box{background:#f8f7ff;border:1px solid #e5e4eb;border-radius:8px;padding:10px 14px;}
    .info-label{font-size:9px;font-weight:700;color:#6c47ff;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px;}
    .info-val{font-size:13px;font-weight:700;}
    .sec-title{font-size:10px;font-weight:800;color:#6c47ff;text-transform:uppercase;letter-spacing:1.5px;border-bottom:1.5px solid #e5e4eb;padding-bottom:5px;margin-bottom:12px;}
    .problem-box{background:#f8f7ff;border-left:4px solid #6c47ff;padding:12px 16px;border-radius:0 8px 8px 0;font-size:12.5px;line-height:1.8;white-space:pre-line;margin-bottom:22px;}
    .code-block{background:#0d1117;color:#c9d1d9;font-family:"Courier New",monospace;font-size:12.5px;padding:16px 18px;border-radius:8px;white-space:pre-wrap;word-break:break-word;line-height:1.6;border:1px solid #21262d;margin-bottom:22px;}
    .output-block{background:#0d1117;font-family:"Courier New",monospace;font-size:12.5px;padding:14px 18px;border-radius:8px;white-space:pre-wrap;word-break:break-word;line-height:1.6;border:1px solid #21262d;margin-bottom:22px;}
    .footer{padding-top:12px;border-top:1px solid #e5e4eb;display:flex;justify-content:space-between;font-size:10px;color:#9ca3af;}
    </style></head><body>
    <button class="print-btn" onclick="window.print()">Print / Save PDF</button>
    <div class="page">
      <div class="header">
        <div><div class="inst">Bannari Amman Institute of Technology</div><div class="inst-sub">Erode, Tamil Nadu — PS Training Division</div></div>
        <div style="text-align:right"><div class="badge">Compiler Assessment</div><div style="font-size:10px;color:#9ca3af;margin-top:5px">${dateStr} at ${timeStr}</div></div>
      </div>
      <div class="info-grid">
        <div class="info-box"><div class="info-label">Course</div><div class="info-val">${COURSE.title}</div></div>
        <div class="info-box"><div class="info-label">Language</div><div class="info-val">${COURSE.pill}</div></div>
        <div class="info-box"><div class="info-label">Execution Time</div><div class="info-val">${execTime ? execTime + "ms" : "N/A"}</div></div>
      </div>
      <div class="sec-title" style="margin-bottom:12px">Problem Statement</div>
      <div class="problem-box">${esc(COURSE.problem)}</div>
      <div class="sec-title" style="margin-bottom:12px">Student Solution</div>
      <div class="code-block">${esc(code)}</div>
      <div class="sec-title" style="margin-bottom:12px">Program Output${stdin ? " (Input: " + esc(stdin) + ")" : ""}</div>
      <div class="output-block" style="color:${isErr ? "#f85149" : "#3fb950"}">${esc(output.text)}</div>
      <div class="footer">
        <span>PS Training Compiler Assessment — Bannari Amman Institute of Technology</span>
        <span>Generated: ${dateStr}</span>
      </div>
    </div></body></html>`;

    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); }
    else alert("Allow popups to export PDF.");
  };

  const outColor = output.type === "error" ? T.red : output.type === "success" ? T.green : T.text2;

  return (
    <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", height: isMobile ? "100dvh" : "100vh", background: T.bg, fontFamily: "'Segoe UI',system-ui,sans-serif", overflow: "hidden", color: T.text }}>
      <Sidebar active={sideActive} setActive={setSideActive} isMobile={isMobile} />

      {/* Problem sidebar */}
      <div style={{ width: isMobile ? "100%" : 260, maxHeight: isMobile ? 260 : undefined, background: T.panel, borderRight: isMobile ? "none" : `1px solid ${T.border}`, borderBottom: isMobile ? `1px solid ${T.border}` : "none", display: "flex", flexDirection: "column", flexShrink: 0, overflow: "hidden" }}>
        <div style={{ padding: "12px 14px 8px", borderBottom: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: P, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 3 }}>Problem</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{COURSE.title}</div>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, color: P, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6 }}>Problem Statement</div>
            <div style={{ fontSize: 12.5, color: T.text, lineHeight: 1.75, whiteSpace: "pre-line" }}>{COURSE.problem}</div>
          </div>
          <div style={{ background: "#1a1508", borderLeft: `3px solid ${T.yellow}`, borderRadius: "0 6px 6px 0", padding: "8px 12px" }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: T.yellow, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 4 }}>Hint</div>
            <div style={{ fontSize: 12, color: "#9cdcfe", lineHeight: 1.6 }}>{COURSE.hint}</div>
          </div>
          <div style={{ background: "#0a1f14", border: `1px solid #1a4a2e`, borderRadius: 6, padding: "8px 12px" }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: T.green, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6 }}>Expected Output</div>
            <pre style={{ fontFamily: "'Courier New',monospace", fontSize: 11.5, color: T.green, lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap" }}>{COURSE.expected}</pre>
          </div>
        </div>
        <div style={{ padding: "10px 14px", borderTop: `1px solid ${T.border}`, display: "flex", flexDirection: "column", gap: 6 }}>
          <SideBtn color="#0e639c" onClick={exportPDF}>Export as PDF</SideBtn>
          <div style={{ display: "flex", gap: 6 }}>
            <SideBtn color="#2d5a27" onClick={() => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([code],{type:"text/plain"})); a.download = COURSE.tabName; a.click(); }} full>Download</SideBtn>
            <SideBtn color="#5a3a1a" onClick={() => { if (confirm("Reset to starter code?")) setCode(COURSE.starter); }} full>Reset</SideBtn>
          </div>
        </div>
      </div>

      {/* Editor area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Title bar */}
        <div style={{ height: isMobile ? "auto" : 36, background: "#1a1a2e", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", flexWrap: isMobile ? "wrap" : "nowrap", paddingLeft: 14, paddingRight: isMobile ? 12 : 0, gap: 12, flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 6 }}>
            {["#ff5f57","#febc2e","#28c840"].map((c,i) => <div key={i} style={{ width: 12, height: 12, borderRadius: "50%", background: c }} />)}
          </div>
          <div style={{ background: T.bg, borderTop: `2px solid ${P}`, padding: "0 14px", height: 36, display: "flex", alignItems: "center", fontSize: 12, color: T.text, gap: 6 }}>
            🐍 {COURSE.tabName}
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, paddingRight: 12 }}>
            <ToolBtn onClick={() => setFontSize(f => Math.max(10, f-1))}>A-</ToolBtn>
            <span style={{ fontSize: 10, color: T.text3, minWidth: 26, textAlign: "center" }}>{fontSize}px</span>
            <ToolBtn onClick={() => setFontSize(f => Math.min(22, f+1))}>A+</ToolBtn>
            <ToolBtn onClick={() => navigator.clipboard.writeText(code).catch(()=>{})}>Copy</ToolBtn>
          </div>
        </div>

        {/* Toolbar */}
        <div style={{ height: isMobile ? "auto" : 34, background: "#16162a", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", flexWrap: isMobile ? "wrap" : "nowrap", padding: isMobile ? "8px 12px" : "0 12px", gap: 8, rowGap: 8, flexShrink: 0 }}>
          <button onClick={runCode} disabled={running}
            style={{ height: 24, padding: "0 14px", background: running ? "#2a4a2a" : "#388a34", border: "none", borderRadius: 4, color: "#fff", fontSize: 11, fontWeight: 700, cursor: running ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 5, opacity: running ? 0.6 : 1, fontFamily: "inherit" }}>
            <IcoPlay /> {running ? "Running..." : "Run"}
          </button>
          <button onClick={() => setOutput({ text: "BIT Assessment IDE — Ready.", type: "info" })}
            style={{ height: 24, padding: "0 10px", background: "transparent", border: `1px solid ${T.border}`, borderRadius: 4, color: T.text2, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>Clear</button>
          <button onClick={() => setWrapOn(w => !w)}
            style={{ height: 24, padding: "0 10px", background: "transparent", border: `1px solid ${wrapOn ? P : T.border}`, borderRadius: 4, color: wrapOn ? P : T.text2, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
            Wrap: {wrapOn ? "ON" : "OFF"}
          </button>
          <span style={{ fontSize: 11, color: T.text3, marginLeft: 6 }}>stdin:</span>
          <textarea value={stdin} onChange={e => setStdin(e.target.value)} rows={1} placeholder="e.g. 7"
            style={{ height: 24, width: isMobile ? "100%" : 120, flex: isMobile ? "1 0 100%" : "0 0 auto", background: "#0d0d14", border: `1px solid ${T.border}`, borderRadius: 3, color: T.teal, fontSize: 12, padding: "2px 8px", fontFamily: "monospace", outline: "none", resize: "none" }} />
          {execTime && <span style={{ marginLeft: "auto", fontSize: 11, color: T.text3 }}>{execTime}ms</span>}
          <span style={{ marginLeft: execTime ? 8 : "auto", fontSize: 11, color: P, fontWeight: 600 }}>{COURSE.pill}</span>
        </div>

        {/* Editor */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          <div ref={lnRef} style={{ width: 44, background: T.bg, color: T.text3, fontFamily: "'Courier New',monospace", fontSize, lineHeight: "21px", padding: "14px 10px 14px 0", textAlign: "right", userSelect: "none", flexShrink: 0, overflow: "hidden", borderRight: `1px solid ${T.border}` }}>
            {code.split("\n").map((_, i) => <div key={i}>{i + 1}</div>)}
          </div>
          <textarea ref={editorRef} value={code} onChange={e => setCode(e.target.value)} onKeyDown={handleKeyDown} onScroll={handleScroll} spellCheck={false} autoComplete="off"
            style={{ flex: 1, background: T.bg, color: T.text, fontFamily: "'Courier New',monospace", fontSize, lineHeight: "21px", padding: 14, border: "none", outline: "none", resize: "none", whiteSpace: wrapOn ? "pre-wrap" : "pre", overflowX: wrapOn ? "hidden" : "auto", overflowY: "auto", caretColor: "#aeafad", tabSize: 4 }} />
        </div>

        {/* Output panel */}
        <div style={{ height: isMobile ? 180 : 210, background: T.bg, borderTop: `1px solid ${T.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ height: 28, background: "#13131f", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", flexShrink: 0 }}>
            {["terminal","history"].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                style={{ height: 28, padding: "0 16px", background: "transparent", border: "none", borderBottom: `2px solid ${activeTab === tab ? P : "transparent"}`, color: activeTab === tab ? T.text : T.text3, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                {tab === "terminal" ? "Terminal" : "Run History"}
              </button>
            ))}
            {output.type !== "info" && (
              <span style={{ marginLeft: "auto", marginRight: 12, fontSize: 10, fontWeight: 700, color: output.type === "error" ? T.red : T.green }}>
                {output.type === "error" ? "Error" : "Done"}{execTime ? ` — ${execTime}ms` : ""}
              </span>
            )}
          </div>
          <div style={{ flex: 1, overflow: "auto", padding: "10px 16px", fontFamily: "'Courier New',monospace", fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {activeTab === "terminal"
              ? <span style={{ color: outColor }}>{output.text}</span>
              : history.length === 0
                ? <span style={{ color: T.text3 }}>No run history yet.</span>
                : history.map((r, i) => (
                  <div key={i} style={{ marginBottom: 12, paddingBottom: 10, borderBottom: `1px solid ${T.border}` }}>
                    <div style={{ fontSize: 10, color: T.text3, marginBottom: 4 }}>Run #{i+1} — {r.at} — {r.time}ms — Input: {r.stdin || "(none)"}</div>
                    <span style={{ color: r.type === "error" ? T.red : T.green }}>{r.output}</span>
                  </div>
                ))
            }
          </div>
        </div>

        {/* Status bar */}
        <div style={{ height: 22, background: P, display: "flex", alignItems: "center", padding: "0 12px", gap: 16, flexShrink: 0, overflowX: isMobile ? "auto" : "hidden", whiteSpace: "nowrap" }}>
          {[`Assessment Mode — ${COURSE.title}`, COURSE.pill, "UTF-8", "Spaces: 4", `${code.split("\n").length} lines`].map((s, i) => (
            <span key={i} style={{ fontSize: 11, color: "rgba(255,255,255,.8)" }}>{s}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function SideBtn({ children, onClick, color, full }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ flex: full ? 1 : undefined, padding: "8px 10px", background: hov ? color + "cc" : color, border: "none", borderRadius: 5, color: "#fff", fontSize: 11.5, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, transition: "background .15s", fontFamily: "inherit" }}>
      {children}
    </button>
  );
}

function ToolBtn({ children, onClick }) {
  return (
    <button onClick={onClick}
      style={{ height: 22, padding: "0 8px", background: "transparent", border: `1px solid #1e1e2e`, borderRadius: 3, color: "#4a5580", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
      {children}
    </button>
  );
}