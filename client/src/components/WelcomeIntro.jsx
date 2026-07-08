// ============================================================================
// WelcomeIntro.jsx — Premium animated welcome intro (SELF-CONTAINED, REMOVABLE)
// ----------------------------------------------------------------------------
// Plays once when a student lands on the dashboard, then fades+zooms out to
// reveal the existing dashboard unchanged.
//
// Props:
//   name   (string)   full name or first name; empty -> shows just "Welcome 👋"
//   onDone (function) called once when the intro finishes (or fails)
//
// To remove entirely: delete this file, plus the WELCOME INTRO block in
// StudentDashboard.jsx (import + showIntro state + <WelcomeIntro/> render).
//
// All styles are scoped via the `wi-` class prefix and a single injected
// <style id="wi-intro-styles"> tag, so nothing leaks into the app.
// ============================================================================

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

// ── Scoped styles (prefixed wi-) ────────────────────────────────────────────
const WI_CSS = `
  .wi-overlay {
    position: fixed;
    inset: 0;
    z-index: 9999;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #2a1a5e 0%, #4A2FD0 45%, #6C47FF 100%);
    opacity: 1;
    transform: scale(1);
    transition: opacity 1s ease, transform 1s ease;
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }
  .wi-overlay.wi-leaving {
    opacity: 0;
    transform: scale(1.15);
    pointer-events: none;
  }

  .wi-canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
    z-index: 1;
  }

  .wi-content {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 24px;
    max-width: 92vw;
  }

  .wi-medal {
    width: 110px;
    height: 110px;
    border-radius: 28px;
    background: linear-gradient(135deg, #FFD86B, #FF9E45);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 58px;
    line-height: 1;
    box-shadow: 0 12px 40px rgba(255, 158, 69, 0.55), 0 0 60px rgba(255, 216, 107, 0.45);
    opacity: 0;
    transform: perspective(600px) rotateY(90deg) scale(0.4);
    animation: wi-medal-in 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.3s forwards;
  }

  .wi-eyebrow {
    margin-top: 26px;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.7);
    opacity: 0;
    transform: translateY(12px);
    animation: wi-fade-up 0.7s ease 0.7s forwards;
  }

  .wi-name {
    margin-top: 10px;
    font-size: 56px;
    font-weight: 800;
    line-height: 1.1;
    color: #ffffff;
    text-shadow: 0 4px 24px rgba(0, 0, 0, 0.25);
    opacity: 0;
    transform: translateY(18px) scale(0.96);
    animation: wi-name-in 0.8s cubic-bezier(0.22, 1, 0.36, 1) 1.0s forwards;
  }

  .wi-wave {
    display: inline-block;
    transform-origin: 70% 70%;
  }
  .wi-name.wi-ready .wi-wave {
    animation: wi-wave 2.2s ease 1.9s 3;
  }

  .wi-sub {
    margin-top: 14px;
    font-size: 17px;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.9);
    opacity: 0;
    transform: translateY(12px);
    animation: wi-fade-up 0.7s ease 1.4s forwards;
  }

  .wi-tagline {
    margin-top: 8px;
    font-size: 14px;
    font-weight: 400;
    color: rgba(255, 255, 255, 0.7);
    opacity: 0;
    transform: translateY(10px);
    animation: wi-fade-up 0.7s ease 1.8s forwards;
  }

  /* ── Feature cards (glass) ── */
  .wi-cards {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 14px;
    width: 100%;
    max-width: 880px;
    margin-top: 28px;
  }
  .wi-card {
    flex: 1 1 180px;
    min-width: 165px;
    max-width: 200px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
    gap: 11px;
    padding: 16px 16px 15px;
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.12);
    -webkit-backdrop-filter: blur(10px);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.25);
    box-shadow: 0 8px 28px rgba(20, 10, 60, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.15);
    opacity: 0;
    transform: translateY(20px);
    animation: wi-card-in 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  .wi-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 14px 36px rgba(20, 10, 60, 0.38), inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }
  .wi-card-icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 21px;
    line-height: 1;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.22);
    flex-shrink: 0;
  }
  .wi-card-title {
    font-size: 14.5px;
    font-weight: 700;
    color: #ffffff;
    line-height: 1.2;
  }
  .wi-card-desc {
    margin-top: 3px;
    font-size: 12px;
    font-weight: 400;
    color: rgba(255, 255, 255, 0.75);
    line-height: 1.35;
  }

  .wi-bar {
    margin-top: 30px;
    width: 220px;
    height: 4px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.2);
    overflow: hidden;
    opacity: 0;
    animation: wi-fade-in 0.5s ease 1.8s forwards;
  }
  .wi-bar-fill {
    width: 0%;
    height: 100%;
    border-radius: 4px;
    background: linear-gradient(90deg, #FFD86B, #FF9E45);
    animation: wi-bar-fill 3.6s ease 1.8s forwards;
  }

  /* Reduced-motion: no shapes/stagger, but everything (incl. cards) shown statically. */
  .wi-overlay.wi-reduced .wi-medal,
  .wi-overlay.wi-reduced .wi-eyebrow,
  .wi-overlay.wi-reduced .wi-name,
  .wi-overlay.wi-reduced .wi-sub,
  .wi-overlay.wi-reduced .wi-tagline,
  .wi-overlay.wi-reduced .wi-card,
  .wi-overlay.wi-reduced .wi-bar {
    animation: none;
    opacity: 1;
    transform: none;
  }
  .wi-overlay.wi-reduced .wi-card:hover { transform: none; }
  .wi-overlay.wi-reduced .wi-bar-fill { width: 100%; animation: none; }

  @keyframes wi-medal-in {
    0%   { opacity: 0; transform: perspective(600px) rotateY(90deg) scale(0.4); }
    60%  { opacity: 1; transform: perspective(600px) rotateY(-12deg) scale(1.08); }
    100% { opacity: 1; transform: perspective(600px) rotateY(0deg) scale(1); }
  }
  @keyframes wi-name-in {
    0%   { opacity: 0; transform: translateY(18px) scale(0.96); }
    100% { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes wi-fade-up {
    0%   { opacity: 0; transform: translateY(12px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  @keyframes wi-fade-in { 0% { opacity: 0; } 100% { opacity: 1; } }
  @keyframes wi-bar-fill { 0% { width: 0%; } 100% { width: 100%; } }
  @keyframes wi-card-in {
    0%   { opacity: 0; transform: translateY(20px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  @keyframes wi-wave {
    0%, 60%, 100% { transform: rotate(0deg); }
    10%, 30% { transform: rotate(14deg); }
    20% { transform: rotate(-8deg); }
    40% { transform: rotate(-4deg); }
    50% { transform: rotate(10deg); }
  }

  @media (max-width: 640px) {
    .wi-medal { width: 84px; height: 84px; border-radius: 22px; font-size: 44px; }
    .wi-name { font-size: 36px; }
    .wi-eyebrow { font-size: 12px; letter-spacing: 3px; }
    .wi-sub { font-size: 14px; }
    .wi-tagline { font-size: 12.5px; }
    .wi-bar { width: 190px; margin-top: 22px; }

    /* Cards: single column, compact horizontal (icon left, text right). */
    .wi-cards { gap: 9px; max-width: 340px; margin-top: 20px; }
    .wi-card {
      flex: 1 1 100%;
      max-width: none;
      min-width: 0;
      flex-direction: row;
      align-items: center;
      gap: 12px;
      padding: 11px 13px;
      border-radius: 14px;
    }
    .wi-card-icon { width: 34px; height: 34px; border-radius: 10px; font-size: 18px; }
    .wi-card-title { font-size: 13.5px; }
    .wi-card-desc { font-size: 11.5px; margin-top: 1px; }
  }
`

// ── Feature cards shown during the intro (icon, title, one-liner, accent) ──
const WI_FEATURES = [
  { icon: '📊', title: 'Points Dashboard', desc: 'Reward & Activity Points', accent: 'linear-gradient(135deg,#8b5cf6,#6c47ff)' },
  { icon: '📅', title: 'Training Slots',   desc: 'PS & PBL Lab Booking',     accent: 'linear-gradient(135deg,#2dd4bf,#0d9488)' },
  { icon: '📦', title: 'Inventory Request', desc: 'Equipment & lab items',    accent: 'linear-gradient(135deg,#fb923c,#f97316)' },
  { icon: '💬', title: 'Feedback',          desc: 'Share your suggestions',   accent: 'linear-gradient(135deg,#f472b6,#ec4899)' },
]

export default function WelcomeIntro({ name = '', onDone }) {
  const overlayRef = useRef(null)
  const canvasRef = useRef(null)
  const doneRef = useRef(false)          // guard so onDone fires exactly once
  const [leaving, setLeaving] = useState(false)

  const firstName = String(name || '').trim().split(/\s+/)[0] || ''

  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const finish = () => {
    if (doneRef.current) return
    doneRef.current = true
    onDone?.()
  }

  // ── Inject scoped styles (mount) / remove (unmount) ──
  useEffect(() => {
    if (!document.getElementById('wi-intro-styles')) {
      const el = document.createElement('style')
      el.id = 'wi-intro-styles'
      el.innerHTML = WI_CSS
      document.head.appendChild(el)
    }
    return () => {
      const s = document.getElementById('wi-intro-styles')
      if (s) s.remove()
    }
  }, [])

  // ── Timing: start the fade-out, then call onDone after it completes ──
  useEffect(() => {
    // Reduced motion: show the four feature cards statically ~2s, then fade out.
    if (prefersReduced) {
      const t1 = setTimeout(() => setLeaving(true), 2000)
      const t2 = setTimeout(finish, 2600)
      return () => { clearTimeout(t1); clearTimeout(t2) }
    }
    // Full sequence (~6.6s): medal→name→tagline→feature cards→bar completes,
    // then the ~1s fade/zoom out starting ~5.6s.
    const t1 = setTimeout(() => setLeaving(true), 5600)
    const t2 = setTimeout(finish, 6600)
    return () => { clearTimeout(t1); clearTimeout(t2) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── three.js floating shapes (skipped under reduced motion) ──
  useEffect(() => {
    if (prefersReduced) return
    const canvas = canvasRef.current
    if (!canvas) return

    let renderer, scene, camera, rafId
    let onResize
    const meshes = []

    try {
      const width = window.innerWidth
      const height = window.innerHeight

      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
      renderer.setSize(width, height)

      scene = new THREE.Scene()
      camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100)
      camera.position.z = 14

      // Soft lighting: ambient + two point lights (warm + violet).
      scene.add(new THREE.AmbientLight(0xffffff, 0.55))
      const p1 = new THREE.PointLight(0xffe6a8, 1.1, 100)
      p1.position.set(10, 12, 14)
      scene.add(p1)
      const p2 = new THREE.PointLight(0x8b6bff, 0.9, 100)
      p2.position.set(-12, -8, 10)
      scene.add(p2)

      // Palette: gold / white / violet.
      const colors = [0xffd86b, 0xff9e45, 0xffffff, 0x9b7bff, 0x6c47ff, 0xf3ecff]

      // Low-poly geometry factory (varied primitives).
      const geoFor = (i) => {
        switch (i % 6) {
          case 0: return new THREE.IcosahedronGeometry(1, 0)
          case 1: return new THREE.TorusGeometry(0.7, 0.28, 8, 14)
          case 2: return new THREE.OctahedronGeometry(1, 0)
          case 3: return new THREE.BoxGeometry(1.3, 1.3, 1.3)
          case 4: return new THREE.TetrahedronGeometry(1.2, 0)
          default: return new THREE.DodecahedronGeometry(1, 0)
        }
      }

      const COUNT = 24
      for (let i = 0; i < COUNT; i++) {
        const geo = geoFor(i)
        const mat = new THREE.MeshStandardMaterial({
          color: colors[i % colors.length],
          roughness: 0.35,
          metalness: 0.25,
          flatShading: true,
          transparent: true,
          opacity: 0.9,
        })
        const mesh = new THREE.Mesh(geo, mat)
        // Deterministic-ish spread (no Math.random dependency for placement feel).
        const a = (i / COUNT) * Math.PI * 2
        const ring = 5 + (i % 4) * 2.2
        mesh.position.set(
          Math.cos(a) * ring + (i % 3 - 1) * 1.5,
          Math.sin(a * 1.3) * 4.5 + (i % 5 - 2),
          -2 - (i % 6) * 1.4
        )
        const s = 0.55 + (i % 5) * 0.16
        mesh.scale.setScalar(s)
        // Per-mesh animation params.
        mesh.userData = {
          rotX: 0.002 + (i % 5) * 0.0016,
          rotY: 0.003 + (i % 4) * 0.0015,
          bobAmp: 0.4 + (i % 4) * 0.18,
          bobSpeed: 0.4 + (i % 5) * 0.12,
          phase: a,
          baseY: mesh.position.y,
        }
        scene.add(mesh)
        meshes.push(mesh)
      }

      let t = 0
      const animate = () => {
        rafId = requestAnimationFrame(animate)
        t += 0.016
        for (const m of meshes) {
          const u = m.userData
          m.rotation.x += u.rotX
          m.rotation.y += u.rotY
          m.position.y = u.baseY + Math.sin(t * u.bobSpeed + u.phase) * u.bobAmp
        }
        renderer.render(scene, camera)
      }
      animate()

      onResize = () => {
        const w = window.innerWidth
        const h = window.innerHeight
        camera.aspect = w / h
        camera.updateProjectionMatrix()
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
        renderer.setSize(w, h)
      }
      window.addEventListener('resize', onResize)
    } catch (err) {
      // 3D is decorative — never crash the intro. Gradient + text still show.
      console.warn('[WelcomeIntro] 3D disabled:', err)
    }

    // ── Full cleanup: cancel RAF, drop listener, dispose GPU resources ──
    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      if (onResize) window.removeEventListener('resize', onResize)
      for (const m of meshes) {
        m.geometry?.dispose?.()
        m.material?.dispose?.()
        scene?.remove(m)
      }
      renderer?.dispose?.()
      renderer?.forceContextLoss?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      ref={overlayRef}
      className={`wi-overlay${leaving ? ' wi-leaving' : ''}${prefersReduced ? ' wi-reduced' : ''}`}
      role="dialog"
      aria-label="Welcome"
      // Critical covering styles are INLINE so the overlay paints a solid,
      // full-screen gradient from the very first frame — before the scoped
      // <style> (injected in a useEffect) exists. This prevents any flash of
      // the unstyled dashboard underneath (FOUC). opacity/transform are left to
      // the .wi-overlay / .wi-leaving classes so the fade-out is unchanged.
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #2a1a5e 0%, #4A2FD0 45%, #6C47FF 100%)',
      }}
    >
      {!prefersReduced && <canvas ref={canvasRef} className="wi-canvas" />}

      <div className="wi-content">
        <div className="wi-medal" aria-hidden="true">🏅</div>
        <div className="wi-eyebrow">Welcome to</div>
        <div className={`wi-name${!prefersReduced ? ' wi-ready' : ''}`}>
          {firstName ? <>{firstName} <span className="wi-wave">👋</span></>
                     : <>Welcome <span className="wi-wave">👋</span></>}
        </div>
        <div className="wi-sub">Points &amp; Training Portal</div>
        <div className="wi-tagline">Everything you need, in one place</div>

        <div className="wi-cards">
          {WI_FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="wi-card"
              // Staggered fly-in ~0.2s apart, starting ~2.2s (last card ~2.8s).
              // Under reduced motion the animation is disabled, so delay is inert.
              style={{ animationDelay: `${2.2 + i * 0.2}s` }}
            >
              <div className="wi-card-icon" style={{ background: f.accent }} aria-hidden="true">
                {f.icon}
              </div>
              <div className="wi-card-text">
                <div className="wi-card-title">{f.title}</div>
                <div className="wi-card-desc">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="wi-bar"><div className="wi-bar-fill" /></div>
      </div>
    </div>
  )
}
