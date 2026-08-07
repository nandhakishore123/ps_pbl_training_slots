// ============================================================================
// WelcomeIntro.jsx — Premium animated welcome intro (SELF-CONTAINED, REMOVABLE)
// ----------------------------------------------------------------------------
// Plays once when a user lands on their dashboard after signing in, then fades
// + zooms out to reveal the existing dashboard unchanged.
//
// Props:
//   name   (string)   full name or first name; empty -> shows just "Welcome"
//   onDone (function) called once when the intro finishes (or fails)
//
// To remove entirely: delete this file, plus the WELCOME INTRO block in each
// dashboard (import + showIntro state + <WelcomeIntro/> render).
//
// All styles are scoped via the `wi-` class prefix and a single injected
// <style id="wi-intro-styles"> tag, so nothing leaks into the app.
//
// Motion is CSS keyframes rather than framer-motion: the whole screen is one
// fixed beat sheet (see WI_TIMING below), and keyframe delays express that more
// precisely than a tree of springs — and keep this file dependency-light.
// ============================================================================

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

// ── Beat sheet (ms) ─────────────────────────────────────────────────────────
// Total ~6.6s. The CSS delays below are the same numbers in seconds; change both
// together. LEAVE starts the fade/zoom out, DONE unmounts via onDone().
//
//   0.25  badge flips in            1.50  progress bar appears, fills 4.1s
//   0.65  halo fades up, starts spin 1.60  tagline
//   0.80  eyebrow                   2.00  cards stagger in, 0.18s apart
//   1.00  name                      2.10  wave (2 passes)
//   1.35  subtitle                  5.60  bar completes -> LEAVE (1s fade/zoom)
//                                   6.60  DONE -> onDone()
const WI_TIMING = {
  LEAVE: 5600,
  DONE: 6600,
  REDUCED_LEAVE: 1500,
  REDUCED_DONE: 2000,
}

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
    /* Deep indigo core, lifted by two radial glows so the centre reads brighter
       than the corners. The flat linear gradient alone looked like a backdrop;
       the radials give it depth. */
    background:
      radial-gradient(90% 62% at 50% 34%, rgba(150, 118, 255, 0.42) 0%, rgba(150, 118, 255, 0) 62%),
      radial-gradient(70% 60% at 84% 108%, rgba(108, 71, 255, 0.5) 0%, rgba(108, 71, 255, 0) 60%),
      linear-gradient(150deg, #1e1145 0%, #2a1a5e 34%, #4A2FD0 74%, #6C47FF 100%);
    opacity: 1;
    transform: scale(1);
    transition: opacity 1s cubic-bezier(0.4, 0, 0.2, 1), transform 1s cubic-bezier(0.4, 0, 0.2, 1);
    font-family: var(--font-body, 'Plus Jakarta Sans'), -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }
  /* Vignette — settles the edges so the 3D never crowds the copy. */
  .wi-overlay::after {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    background: radial-gradient(78% 66% at 50% 46%, rgba(0, 0, 0, 0) 42%, rgba(12, 5, 40, 0.55) 100%);
  }
  .wi-overlay.wi-leaving {
    opacity: 0;
    transform: scale(1.12);
    pointer-events: none;
  }

  .wi-canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
    z-index: 0;
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
    overflow: visible;   /* guard: the gradient-clipped name must never be trimmed here */
  }

  /* ── Hero badge: glass shell + gold core + a slow conic halo ── */
  .wi-badge-wrap {
    position: relative;
    width: 132px;
    height: 132px;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transform: perspective(900px) rotateY(-72deg) scale(0.5);
    animation: wi-badge-in 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.25s forwards;
  }
  /* Conic halo, counter-lit — reads as a soft rim light rotating behind glass. */
  .wi-badge-ring {
    position: absolute;
    inset: -14px;
    border-radius: 42px;
    background: conic-gradient(from 0deg,
      rgba(255, 216, 107, 0.85), rgba(255, 255, 255, 0.15) 22%,
      rgba(155, 123, 255, 0.75) 46%, rgba(255, 255, 255, 0.12) 68%,
      rgba(255, 216, 107, 0.85) 100%);
    filter: blur(13px);
    opacity: 0;
    animation: wi-halo-in 1s ease 0.65s forwards, wi-spin 9s linear 0.65s infinite;
  }
  .wi-badge {
    position: relative;
    width: 118px;
    height: 118px;
    border-radius: 34px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(152deg, rgba(255, 255, 255, 0.26) 0%, rgba(255, 255, 255, 0.07) 100%);
    border: 1px solid rgba(255, 255, 255, 0.38);
    -webkit-backdrop-filter: blur(16px) saturate(160%);
    backdrop-filter: blur(16px) saturate(160%);
    box-shadow:
      0 26px 60px rgba(12, 4, 44, 0.5),
      0 8px 20px rgba(12, 4, 44, 0.32),
      inset 0 2px 2px rgba(255, 255, 255, 0.5),
      inset 0 -16px 30px rgba(90, 55, 200, 0.28);
    animation: wi-float 5.5s ease-in-out 1.2s infinite;
  }
  /* Glossy sheen across the top of the glass. */
  .wi-badge::after {
    content: '';
    position: absolute;
    top: 8px;
    left: 12px;
    right: 12px;
    height: 38px;
    border-radius: 26px 26px 40% 40%;
    pointer-events: none;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.42), rgba(255, 255, 255, 0));
    filter: blur(1px);
  }
  .wi-badge-core {
    width: 74px;
    height: 74px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 38px;
    line-height: 1;
    background: radial-gradient(114% 114% at 32% 22%, #FFF0C4 0%, #FFD86B 44%, #FF9E45 100%);
    box-shadow:
      0 10px 26px rgba(255, 158, 69, 0.5),
      0 0 42px rgba(255, 216, 107, 0.45),
      inset 0 2px 3px rgba(255, 255, 255, 0.75),
      inset 0 -8px 16px rgba(190, 96, 20, 0.32);
  }

  .wi-eyebrow {
    margin-top: 28px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 5px;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.62);
    opacity: 0;
    transform: translateY(12px);
    animation: wi-fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.8s forwards;
  }

  /* Display face for the hero line — the app's --font-head (Outfit). */
  .wi-name {
    margin-top: 12px;
    font-family: var(--font-head, 'Outfit'), 'Plus Jakarta Sans', system-ui, sans-serif;
    font-size: clamp(38px, 7.4vw, 68px);
    font-weight: 800;
    letter-spacing: -1.6px;
    line-height: 1.06;
    /* Solid fill, deliberately NOT a background-clip:text gradient.
       That approach broke here: filter:drop-shadow() puts this element on its own
       composited layer, the clip has to rasterise into that layer, and wi-name-in
       animates transform+opacity on the very same element and forces a re-raster.
       When the clip lost a glyph the browser painted the UNCLIPPED background
       rectangle instead — and since the gradient's top stop was #ffffff, that
       surfaced as a white blob wearing the drop-shadow over the first letter.
       A solid colour plus text-shadow is glyph-accurate, needs no compositing
       layer, and holds more contrast on the purple than the gradient's lavender
       foot did. Depth now comes from the layered shadow below. */
    color: #ffffff;
    text-shadow:
      0 2px 10px rgba(24, 8, 80, 0.5),
      0 10px 32px rgba(24, 8, 80, 0.42),
      0 0 46px rgba(196, 176, 255, 0.45);
    opacity: 0;
    transform: translateY(20px) scale(0.96);
    animation: wi-name-in 0.75s cubic-bezier(0.22, 1, 0.36, 1) 1s forwards;
  }
  /* The gradient clip is gone, so the emoji no longer needs to opt out of it —
     the old -webkit-text-fill-color/color:initial pair would now only risk
     forcing a black fallback on systems without colour emoji. */
  .wi-wave {
    display: inline-block;
    transform-origin: 70% 70%;
  }
  .wi-name.wi-ready .wi-wave { animation: wi-wave 1.6s ease 2.1s 2; }

  .wi-sub {
    margin-top: 14px;
    font-family: var(--font-head, 'Outfit'), 'Plus Jakarta Sans', system-ui, sans-serif;
    font-size: 17.5px;
    font-weight: 600;
    letter-spacing: 0.2px;
    color: rgba(255, 255, 255, 0.94);
    text-shadow: 0 2px 18px rgba(24, 8, 80, 0.42);
    opacity: 0;
    transform: translateY(12px);
    animation: wi-fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) 1.35s forwards;
  }

  .wi-tagline {
    margin-top: 7px;
    font-size: 13.5px;
    font-weight: 500;
    letter-spacing: 0.3px;
    color: rgba(255, 255, 255, 0.62);
    opacity: 0;
    transform: translateY(10px);
    animation: wi-fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) 1.6s forwards;
  }

  /* ── Premium glass feature cards ── */
  .wi-cards {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 14px;
    width: 100%;
    max-width: 900px;
    margin-top: 32px;
    perspective: 1100px;   /* gives the entrance a real tilt rather than a slide */
  }
  .wi-card {
    position: relative;
    flex: 1 1 185px;
    min-width: 170px;
    max-width: 205px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
    gap: 12px;
    padding: 17px 17px 16px;
    border-radius: 20px;
    background: linear-gradient(158deg, rgba(255, 255, 255, 0.17) 0%, rgba(255, 255, 255, 0.045) 100%);
    -webkit-backdrop-filter: blur(16px) saturate(150%);
    backdrop-filter: blur(16px) saturate(150%);
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow:
      0 18px 42px rgba(12, 4, 46, 0.36),
      0 4px 12px rgba(12, 4, 46, 0.22),
      inset 0 1px 0 rgba(255, 255, 255, 0.34);
    opacity: 0;
    transform: translateY(26px) rotateX(12deg) scale(0.97);
    animation: wi-card-in 0.68s cubic-bezier(0.22, 1, 0.36, 1) forwards;
    transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.28s ease, border-color 0.28s ease;
  }
  /* Glowing top edge — a 1px highlight that fades out along the card. */
  .wi-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 14%;
    right: 14%;
    height: 1px;
    pointer-events: none;
    background: linear-gradient(90deg, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0));
  }
  .wi-card:hover {
    transform: translateY(-5px) scale(1.015);
    border-color: rgba(255, 255, 255, 0.36);
    box-shadow:
      0 26px 56px rgba(12, 4, 46, 0.46),
      0 6px 16px rgba(12, 4, 46, 0.28),
      inset 0 1px 0 rgba(255, 255, 255, 0.42);
  }
  .wi-card-icon {
    width: 42px;
    height: 42px;
    border-radius: 13px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 21px;
    line-height: 1;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.34);
    flex-shrink: 0;
  }
  .wi-card-title {
    font-family: var(--font-head, 'Outfit'), 'Plus Jakarta Sans', system-ui, sans-serif;
    font-size: 14.5px;
    font-weight: 700;
    letter-spacing: -0.1px;
    color: #ffffff;
    line-height: 1.2;
  }
  .wi-card-desc {
    margin-top: 3px;
    font-size: 12px;
    font-weight: 400;
    color: rgba(255, 255, 255, 0.7);
    line-height: 1.38;
  }

  /* ── Slim glowing progress bar ── */
  .wi-bar {
    position: relative;
    margin-top: 34px;
    width: 210px;
    height: 3px;
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.16);
    overflow: hidden;
    opacity: 0;
    animation: wi-fade-in 0.5s ease 1.5s forwards;
  }
  .wi-bar-fill {
    width: 0%;
    height: 100%;
    border-radius: 3px;
    background: linear-gradient(90deg, rgba(255, 255, 255, 0.85), #ded2ff 46%, #FFD86B 100%);
    box-shadow: 0 0 14px rgba(255, 216, 107, 0.75), 0 0 5px rgba(255, 255, 255, 0.6);
    /* 1.5s start + 4.1s fill = 5.6s, exactly when WI_TIMING.LEAVE fires. */
    animation: wi-bar-fill 4.1s cubic-bezier(0.4, 0, 0.2, 1) 1.5s forwards;
  }

  /* Reduced motion: no canvas, no stagger — everything simply present. */
  .wi-overlay.wi-reduced .wi-badge-wrap,
  .wi-overlay.wi-reduced .wi-badge,
  .wi-overlay.wi-reduced .wi-badge-ring,
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
  .wi-overlay.wi-reduced .wi-badge-ring { opacity: 0.5; }
  .wi-overlay.wi-reduced .wi-card:hover { transform: none; }
  .wi-overlay.wi-reduced .wi-bar-fill { width: 100%; animation: none; }

  @keyframes wi-badge-in {
    0%   { opacity: 0; transform: perspective(900px) rotateY(-72deg) scale(0.5); }
    58%  { opacity: 1; transform: perspective(900px) rotateY(14deg) scale(1.07); }
    100% { opacity: 1; transform: perspective(900px) rotateY(0deg) scale(1); }
  }
  @keyframes wi-halo-in { 0% { opacity: 0; } 100% { opacity: 0.85; } }
  @keyframes wi-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  @keyframes wi-float {
    0%, 100% { transform: translateY(0); }
    50%      { transform: translateY(-9px); }
  }
  @keyframes wi-name-in {
    0%   { opacity: 0; transform: translateY(20px) scale(0.96); }
    100% { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes wi-fade-up {
    0%   { opacity: 0; transform: translateY(12px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  @keyframes wi-fade-in { 0% { opacity: 0; } 100% { opacity: 1; } }
  @keyframes wi-bar-fill { 0% { width: 0%; } 100% { width: 100%; } }
  @keyframes wi-card-in {
    0%   { opacity: 0; transform: translateY(26px) rotateX(12deg) scale(0.97); }
    100% { opacity: 1; transform: translateY(0) rotateX(0deg) scale(1); }
  }
  @keyframes wi-wave {
    0%, 60%, 100% { transform: rotate(0deg); }
    10%, 30% { transform: rotate(14deg); }
    20% { transform: rotate(-8deg); }
    40% { transform: rotate(-4deg); }
    50% { transform: rotate(10deg); }
  }

  @media (max-width: 640px) {
    .wi-badge-wrap { width: 104px; height: 104px; }
    .wi-badge { width: 92px; height: 92px; border-radius: 27px; }
    .wi-badge-ring { inset: -11px; border-radius: 34px; }
    .wi-badge-core { width: 58px; height: 58px; font-size: 30px; }
    .wi-eyebrow { margin-top: 22px; font-size: 11px; letter-spacing: 4px; }
    .wi-sub { font-size: 15px; }
    .wi-tagline { font-size: 12.5px; }
    .wi-bar { width: 180px; margin-top: 24px; }

    /* Cards: single column, compact horizontal (icon left, text right). */
    .wi-cards { gap: 9px; max-width: 340px; margin-top: 22px; }
    .wi-card {
      flex: 1 1 100%;
      max-width: none;
      min-width: 0;
      flex-direction: row;
      align-items: center;
      gap: 12px;
      padding: 12px 13px;
      border-radius: 15px;
    }
    .wi-card-icon { width: 35px; height: 35px; border-radius: 11px; font-size: 18px; }
    .wi-card-title { font-size: 13.5px; }
    .wi-card-desc { font-size: 11.5px; margin-top: 1px; }
  }
`

// ── Feature cards shown during the intro (icon, title, one-liner, accent) ──
const WI_FEATURES = [
  { icon: '📊', title: 'Points Dashboard', desc: 'Reward & Activity Points', accent: 'linear-gradient(135deg,#8b5cf6,#6c47ff)' },
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
    // Reduced motion: everything shown statically, then out.
    if (prefersReduced) {
      const t1 = setTimeout(() => setLeaving(true), WI_TIMING.REDUCED_LEAVE)
      const t2 = setTimeout(finish, WI_TIMING.REDUCED_DONE)
      return () => { clearTimeout(t1); clearTimeout(t2) }
    }
    // Full sequence (~6.6s): badge -> name -> copy -> cards -> bar completes,
    // then the 1s fade/zoom out starting at LEAVE.
    const t1 = setTimeout(() => setLeaving(true), WI_TIMING.LEAVE)
    const t2 = setTimeout(finish, WI_TIMING.DONE)
    return () => { clearTimeout(t1); clearTimeout(t2) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── three.js chemistry-lab scene (skipped under reduced motion) ──
  // Beakers, Erlenmeyer flasks and test tubes of glowing liquid, a few molecule
  // models and a stream of rising bubbles, all built from primitives and spread
  // across depth. Everything is kept out of the middle band so the copy stays
  // legible; linear fog sinks the far pieces into the background gradient.
  //
  // Geometries and materials are created ONCE and shared across every mesh, so
  // the dispose lists below are short and complete regardless of instance count.
  useEffect(() => {
    if (prefersReduced) return
    const canvas = canvasRef.current
    if (!canvas) return

    let renderer, scene, camera, rafId
    let onResize, onPointerMove
    let glowTex
    const geos = []            // every geometry created, disposed once
    const mats = []            // every material created, disposed once

    try {
      const width = window.innerWidth
      const height = window.innerHeight

      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
      renderer.setSize(width, height)

      scene = new THREE.Scene()
      // Fog tinted to the backdrop, so distant glassware dissolves into the
      // gradient instead of sitting flat on top of it.
      scene.fog = new THREE.Fog(0x2f1d63, 13, 38)

      camera = new THREE.PerspectiveCamera(58, width / height, 0.1, 100)
      camera.position.z = 15

      // Premium lighting: soft ambient fill, a violet key and a warm rim, so the
      // glass catches highlights along its edges.
      scene.add(new THREE.AmbientLight(0xffffff, 0.44))
      const key = new THREE.PointLight(0x9b7bff, 1.6, 120)
      key.position.set(-13, 9, 16)
      scene.add(key)
      const rim = new THREE.PointLight(0xffd9a0, 1.2, 120)
      rim.position.set(14, -7, 12)
      scene.add(rim)
      const top = new THREE.DirectionalLight(0xffffff, 0.55)
      top.position.set(0, 16, 8)
      scene.add(top)

      // Soft radial sprite for the ambient glow pools. Cheap stand-in for a
      // bloom pass — no post-processing chain to set up or dispose.
      const makeGlowTexture = () => {
        const c = document.createElement('canvas')
        c.width = c.height = 128
        const ctx = c.getContext('2d')
        const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
        g.addColorStop(0, 'rgba(255,255,255,0.95)')
        g.addColorStop(0.28, 'rgba(214,198,255,0.42)')
        g.addColorStop(1, 'rgba(140,110,255,0)')
        ctx.fillStyle = g
        ctx.fillRect(0, 0, 128, 128)
        return new THREE.CanvasTexture(c)
      }
      glowTex = makeGlowTexture()

      // ── Shared geometry library ──────────────────────────────────────────
      const track = (g) => { geos.push(g); return g }
      const G = {
        // Beaker: open-ended tube + a rolled lip.
        beakerBody: track(new THREE.CylinderGeometry(0.62, 0.62, 1.15, 28, 1, true)),
        beakerLip: track(new THREE.TorusGeometry(0.62, 0.045, 8, 28)),
        beakerLiquid: track(new THREE.CylinderGeometry(0.55, 0.55, 0.62, 26)),
        // Erlenmeyer: a truncated cone (wide base, narrow shoulder) + neck.
        flaskBody: track(new THREE.CylinderGeometry(0.2, 0.66, 1.1, 28, 1, true)),
        flaskNeck: track(new THREE.CylinderGeometry(0.17, 0.17, 0.44, 18, 1, true)),
        flaskLip: track(new THREE.TorusGeometry(0.17, 0.035, 8, 20)),
        flaskLiquid: track(new THREE.CylinderGeometry(0.42, 0.58, 0.55, 24)),
        // Test tube: tube + a sphere for the rounded bottom.
        tubeBody: track(new THREE.CylinderGeometry(0.2, 0.2, 1.3, 18, 1, true)),
        tubeBottom: track(new THREE.SphereGeometry(0.2, 16, 12)),
        tubeLip: track(new THREE.TorusGeometry(0.2, 0.032, 8, 20)),
        tubeLiquid: track(new THREE.CylinderGeometry(0.17, 0.17, 0.6, 16)),
        tubeLiquidBottom: track(new THREE.SphereGeometry(0.17, 14, 10)),
        // Molecule model.
        atom: track(new THREE.SphereGeometry(0.26, 20, 14)),
        atomSm: track(new THREE.SphereGeometry(0.17, 16, 12)),
        bond: track(new THREE.CylinderGeometry(0.038, 0.038, 1, 10)),   // unit height: scale.y = length
        // Bubbles and glow pools.
        bubble: track(new THREE.SphereGeometry(0.08, 12, 10)),
        pool: track(new THREE.PlaneGeometry(1, 1)),
      }

      // ── Shared materials ─────────────────────────────────────────────────
      // Vivid chemical palette that still sits inside the purple theme.
      const PALETTE = [0x9b7bff, 0x2dd4bf, 0xf59e0b, 0xf472b6, 0x10b981, 0x3b82f6]

      const glassMat = new THREE.MeshStandardMaterial({
        color: 0xdfe6ff, roughness: 0.06, metalness: 0.32,
        transparent: true, opacity: 0.26, side: THREE.DoubleSide, depthWrite: false,
      })
      const rimMat = new THREE.MeshStandardMaterial({
        color: 0xf2eeff, roughness: 0.14, metalness: 0.6,
        transparent: true, opacity: 0.55,
      })
      const bondMat = new THREE.MeshStandardMaterial({
        color: 0xd9ccff, roughness: 0.3, metalness: 0.55,
        transparent: true, opacity: 0.75,
      })
      // Liquids stay opaque so they render in the opaque pass, BEFORE the glass
      // shell — otherwise transparent-sort order can hide them inside the vessel.
      const liquidMats = PALETTE.map((c) => new THREE.MeshStandardMaterial({
        color: c, emissive: c, emissiveIntensity: 0.85, roughness: 0.24, metalness: 0.1,
      }))
      // Additive back-side shells — the neon-in-glass glow. fog:false keeps them
      // bright at depth instead of being washed toward the fog colour.
      const glowMats = PALETTE.map((c) => new THREE.MeshBasicMaterial({
        color: c, transparent: true, opacity: 0.17,
        blending: THREE.AdditiveBlending, side: THREE.BackSide, depthWrite: false, fog: false,
      }))
      const bubbleMat = new THREE.MeshBasicMaterial({
        color: 0xd8ccff, transparent: true, opacity: 0.55,
        blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
      })
      const poolMat = new THREE.MeshBasicMaterial({
        map: glowTex, transparent: true, opacity: 0.16,
        blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
      })
      mats.push(glassMat, rimMat, bondMat, bubbleMat, poolMat, ...liquidMats, ...glowMats)

      // ── Builders ─────────────────────────────────────────────────────────
      const addGlow = (group, geo, ci, y, sx, sy) => {
        const glow = new THREE.Mesh(geo, glowMats[ci % glowMats.length])
        glow.position.y = y
        glow.scale.set(sx, sy, sx)
        group.add(glow)
      }

      const makeBeaker = (ci) => {
        const g = new THREE.Group()
        g.add(new THREE.Mesh(G.beakerBody, glassMat))
        const lip = new THREE.Mesh(G.beakerLip, rimMat)
        lip.position.y = 0.575
        lip.rotation.x = Math.PI / 2
        g.add(lip)
        const liq = new THREE.Mesh(G.beakerLiquid, liquidMats[ci % liquidMats.length])
        liq.position.y = -0.265
        g.add(liq)
        addGlow(g, G.beakerLiquid, ci, -0.265, 1.35, 1.18)
        return g
      }

      const makeFlask = (ci) => {
        const g = new THREE.Group()
        g.add(new THREE.Mesh(G.flaskBody, glassMat))
        const neck = new THREE.Mesh(G.flaskNeck, glassMat)
        neck.position.y = 0.77
        g.add(neck)
        const lip = new THREE.Mesh(G.flaskLip, rimMat)
        lip.position.y = 0.99
        lip.rotation.x = Math.PI / 2
        g.add(lip)
        const liq = new THREE.Mesh(G.flaskLiquid, liquidMats[ci % liquidMats.length])
        liq.position.y = -0.275
        g.add(liq)
        addGlow(g, G.flaskLiquid, ci, -0.275, 1.3, 1.18)
        return g
      }

      const makeTube = (ci) => {
        const g = new THREE.Group()
        g.add(new THREE.Mesh(G.tubeBody, glassMat))
        const btm = new THREE.Mesh(G.tubeBottom, glassMat)
        btm.position.y = -0.65
        g.add(btm)
        const lip = new THREE.Mesh(G.tubeLip, rimMat)
        lip.position.y = 0.65
        lip.rotation.x = Math.PI / 2
        g.add(lip)
        const liq = new THREE.Mesh(G.tubeLiquid, liquidMats[ci % liquidMats.length])
        liq.position.y = -0.35
        g.add(liq)
        const liqBtm = new THREE.Mesh(G.tubeLiquidBottom, liquidMats[ci % liquidMats.length])
        liqBtm.position.y = -0.65
        g.add(liqBtm)
        addGlow(g, G.tubeLiquid, ci, -0.35, 1.5, 1.2)
        return g
      }

      // Bond: a unit-height cylinder stretched and rotated onto the centre→node axis.
      const UP = new THREE.Vector3(0, 1, 0)
      const makeBond = (to) => {
        const len = to.length()
        const m = new THREE.Mesh(G.bond, bondMat)
        m.scale.set(1, len, 1)
        m.position.copy(to).multiplyScalar(0.5)
        m.quaternion.setFromUnitVectors(UP, to.clone().normalize())
        return m
      }

      const MOLECULE_NODES = [
        new THREE.Vector3(0.74, 0.44, 0.16),
        new THREE.Vector3(-0.68, 0.5, -0.24),
        new THREE.Vector3(-0.2, -0.76, 0.42),
        new THREE.Vector3(0.26, 0.1, -0.82),
      ]
      const makeMolecule = (ci) => {
        const g = new THREE.Group()
        g.add(new THREE.Mesh(G.atom, liquidMats[ci % liquidMats.length]))
        const coreGlow = new THREE.Mesh(G.atom, glowMats[ci % glowMats.length])
        coreGlow.scale.setScalar(1.7)
        g.add(coreGlow)
        for (let k = 0; k < MOLECULE_NODES.length; k++) {
          const p = MOLECULE_NODES[k]
          const ni = (ci + k + 1) % liquidMats.length
          const atom = new THREE.Mesh(G.atomSm, liquidMats[ni])
          atom.position.copy(p)
          g.add(atom)
          const ag = new THREE.Mesh(G.atomSm, glowMats[ni])
          ag.position.copy(p)
          ag.scale.setScalar(1.75)
          g.add(ag)
          g.add(makeBond(p))
        }
        return g
      }

      // Parent group so the whole field can parallax as one.
      const field = new THREE.Group()
      scene.add(field)

      // ── Layout: 12 pieces, held out of the centre band where the copy sits ──
      const PIECES = [
        { kind: 'beaker',   c: 0, x: -9.2,  y: 2.2,  z: -4.0, s: 1.7,  tilt: 0.16 },
        { kind: 'flask',    c: 1, x: 9.4,   y: 1.5,  z: -3.0, s: 1.6,  tilt: -0.2 },
        { kind: 'tube',     c: 2, x: -6.4,  y: -3.7, z: 0.5,  s: 1.35, tilt: 0.3 },
        { kind: 'molecule', c: 3, x: 7.3,   y: -3.4, z: -1.0, s: 1.2,  tilt: 0 },
        { kind: 'beaker',   c: 4, x: 5.6,   y: 4.4,  z: -6.5, s: 1.15, tilt: -0.13 },
        { kind: 'tube',     c: 5, x: -4.8,  y: 4.5,  z: -6.0, s: 1.1,  tilt: -0.26 },
        { kind: 'flask',    c: 0, x: -11.6, y: -1.8, z: 2.5,  s: 1.95, tilt: 0.12 },
        { kind: 'molecule', c: 1, x: -8.0,  y: 4.0,  z: 3.5,  s: 1.5,  tilt: 0 },
        { kind: 'beaker',   c: 3, x: 11.4,  y: -3.9, z: 2.0,  s: 1.85, tilt: -0.15 },
        { kind: 'tube',     c: 4, x: 3.6,   y: -5.2, z: -4.0, s: 1.0,  tilt: 0.34 },
        { kind: 'flask',    c: 2, x: -3.9,  y: 5.8,  z: -8.0, s: 1.0,  tilt: -0.1 },
        { kind: 'molecule', c: 5, x: 3.7,   y: 5.6,  z: -8.5, s: 1.0,  tilt: 0 },
      ]

      for (let i = 0; i < PIECES.length; i++) {
        const p = PIECES[i]
        const obj =
          p.kind === 'beaker' ? makeBeaker(p.c)
          : p.kind === 'flask' ? makeFlask(p.c)
          : p.kind === 'tube' ? makeTube(p.c)
          : makeMolecule(p.c)

        obj.position.set(p.x, p.y, p.z)
        obj.scale.setScalar(p.s)
        obj.rotation.z = p.tilt
        obj.rotation.y = i * 0.7

        // Glassware sways gently on its tilt; molecules tumble.
        obj.userData = p.kind === 'molecule'
          ? { rotX: 0.0016 + (i % 3) * 0.0008, rotY: 0.0024 + (i % 4) * 0.0009,
              bobAmp: 0.34 + (i % 4) * 0.14, bobSpeed: 0.28 + (i % 5) * 0.07,
              phase: i * 0.9, baseY: p.y }
          : { swayAmp: 0.055 + (i % 3) * 0.022, swaySpeed: 0.34 + (i % 4) * 0.09,
              baseTilt: p.tilt, rotY: 0.0011 + (i % 4) * 0.0006,
              bobAmp: 0.3 + (i % 4) * 0.15, bobSpeed: 0.24 + (i % 5) * 0.07,
              phase: i * 0.9, baseY: p.y }

        field.add(obj)
      }

      // ── Bubbles: rise continuously and wrap, as if the glassware is fizzing ──
      const BUBBLES = 18
      for (let i = 0; i < BUBBLES; i++) {
        const b = new THREE.Mesh(G.bubble, bubbleMat)
        // Seeded off the glassware columns so they read as coming from the vessels.
        const src = PIECES[i % PIECES.length]
        const x = src.x + ((i % 5) - 2) * 0.42
        const bottom = src.y - 1.6
        const topY = src.y + 5.4
        b.position.set(x, bottom + ((i * 7) % 10) * 0.54, src.z + ((i % 3) - 1) * 0.6)
        b.scale.setScalar(0.6 + (i % 4) * 0.32)
        b.userData = {
          rise: 0.014 + (i % 5) * 0.006,
          top: topY,
          bottom,
          baseX: x,
          driftAmp: 0.16 + (i % 4) * 0.09,
          driftSpeed: 0.7 + (i % 5) * 0.22,
          phase: i * 1.3,
        }
        field.add(b)
      }

      // ── Ambient glow pools, well behind everything ──
      const POOLS = [
        { x: -9.0, y: 1.0, z: -9.0, s: 13 },
        { x: 9.5, y: -1.4, z: -9.5, s: 15 },
        { x: 0, y: -6.5, z: -10.0, s: 11 },
      ]
      for (const p of POOLS) {
        const pool = new THREE.Mesh(G.pool, poolMat)
        pool.position.set(p.x, p.y, p.z)
        pool.scale.setScalar(p.s)
        field.add(pool)
      }

      // Pointer parallax — a few degrees of camera drift, eased. Subtle enough
      // that it registers as depth rather than as an effect.
      let targetX = 0
      let targetY = 0
      onPointerMove = (e) => {
        targetX = (e.clientX / window.innerWidth - 0.5) * 1.6
        targetY = (e.clientY / window.innerHeight - 0.5) * 1.1
      }
      window.addEventListener('pointermove', onPointerMove)

      let t = 0
      const animate = () => {
        rafId = requestAnimationFrame(animate)
        t += 0.016

        camera.position.x += (targetX - camera.position.x) * 0.04
        camera.position.y += (-targetY - camera.position.y) * 0.04
        camera.lookAt(0, 0, 0)

        field.rotation.y = Math.sin(t * 0.08) * 0.09

        for (const child of field.children) {
          const u = child.userData
          if (!u) continue

          if (u.rise !== undefined) {
            // Bubble: rise, drift sideways, wrap back to the bottom.
            child.position.y += u.rise
            if (child.position.y > u.top) child.position.y = u.bottom
            child.position.x = u.baseX + Math.sin(t * u.driftSpeed + u.phase) * u.driftAmp
            continue
          }
          if (u.baseY === undefined) continue   // glow pools: static

          if (u.rotX) child.rotation.x += u.rotX
          if (u.rotY) child.rotation.y += u.rotY
          if (u.swayAmp !== undefined) {
            child.rotation.z = u.baseTilt + Math.sin(t * u.swaySpeed + u.phase) * u.swayAmp
          }
          child.position.y = u.baseY + Math.sin(t * u.bobSpeed + u.phase) * u.bobAmp
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

    // ── Full cleanup: cancel RAF, drop listeners, dispose GPU resources ──
    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      if (onResize) window.removeEventListener('resize', onResize)
      if (onPointerMove) window.removeEventListener('pointermove', onPointerMove)
      for (const g of geos) g?.dispose?.()
      for (const m of mats) m?.dispose?.()
      glowTex?.dispose?.()
      scene?.clear?.()
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
        background:
          'radial-gradient(90% 62% at 50% 34%, rgba(150,118,255,0.42) 0%, rgba(150,118,255,0) 62%),' +
          'radial-gradient(70% 60% at 84% 108%, rgba(108,71,255,0.5) 0%, rgba(108,71,255,0) 60%),' +
          'linear-gradient(150deg, #1e1145 0%, #2a1a5e 34%, #4A2FD0 74%, #6C47FF 100%)',
      }}
    >
      {!prefersReduced && <canvas ref={canvasRef} className="wi-canvas" />}

      <div className="wi-content">
        <div className="wi-badge-wrap">
          <div className="wi-badge-ring" aria-hidden="true" />
          <div className="wi-badge">
            <div className="wi-badge-core" aria-hidden="true">🏅</div>
          </div>
        </div>

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
              // Staggered rise 0.18s apart, starting 2.0s (last card ~2.54s).
              // Under reduced motion the animation is disabled, so delay is inert.
              style={{ animationDelay: `${2.0 + i * 0.18}s` }}
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
