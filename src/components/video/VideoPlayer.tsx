'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Play, Pause, Volume2, VolumeX } from 'lucide-react'
import { SceneRenderer } from './Scenes'
import { useNarration } from '@/lib/video/useNarration'
import type { VideoComposition } from '@/types'

interface Props {
  composition: VideoComposition
  /** Fired on every frame with overall progress 0..1 (for the card's bar). */
  onProgress?: (fraction: number, elapsedMs: number) => void
}

/**
 * Plays a VideoComposition as a continuous, looping briefing.
 *
 * The SPEECH drives the timeline: each scene holds until its narration line
 * actually finishes (utterance `onend`), then advances — so a line is never
 * cut off mid-sentence by a fixed timer. After the last scene it loops back to
 * the start. A generous safety timer + token guards keep the visuals moving
 * even when speech is muted, unsupported, or misbehaves.
 */
export function VideoPlayer({ composition, onProgress }: Props) {
  const { scenes } = composition

  const { starts, total } = useMemo(() => {
    const s: number[] = []
    let acc = 0
    for (const sc of scenes) { s.push(acc); acc += sc.durationMs }
    return { starts: s, total: Math.max(acc, 1) }
  }, [scenes])

  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(true) // instant autoplay
  const [sceneFraction, setSceneFraction] = useState(0)
  const narrator = useNarration(false) // voiced by default — no unmute needed

  const tokenRef = useRef(0)
  const rafRef = useRef<number | null>(null)
  const onProgressRef = useRef(onProgress)
  onProgressRef.current = onProgress

  // ── Master loop ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!playing) { narrator.cancel(); return }
    const scene = scenes[index]
    if (!scene) return
    const myToken = ++tokenRef.current
    setSceneFraction(0)

    const advance = () => {
      if (tokenRef.current !== myToken) return // stale callback
      setIndex((i) => (i + 1) % scenes.length) // …loops at the end
    }

    // Smooth per-scene progress (visual only) + overall progress callback.
    const startTs = performance.now()
    const estMs = scene.durationMs
    const tick = (now: number) => {
      if (tokenRef.current !== myToken) return
      const f = Math.min((now - startTs) / estMs, 1)
      setSceneFraction(f)
      const elapsed = starts[index] + f * estMs
      onProgressRef.current?.(Math.min(elapsed / total, 1), elapsed)
      if (f < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    // Voice drives the real advance; the safety timer guarantees forward motion
    // if speech is muted/unsupported or never reports completion.
    let safetyMs: number
    if (narrator.supported && !narrator.muted) {
      const initiatedAt = performance.now()
      narrator.speak(scene.narration, () => {
        // Ignore a spurious immediate 'end' from the cancel→speak race.
        if (performance.now() - initiatedAt < 400) return
        advance()
      })
      safetyMs = estMs + 6000
    } else {
      safetyMs = estMs
    }
    const timer = window.setTimeout(advance, safetyMs)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      clearTimeout(timer)
    }
    // narrator.speak/cancel are stable; we intentionally key only on these.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, playing, narrator.muted, scenes, starts, total])

  const current = scenes[index]

  return (
    <div className="absolute inset-0 overflow-hidden select-none" style={{ background: '#05081a' }}>

      {/* ── Scene (remounts per id → re-fires entry animations) ─────────── */}
      <div key={current?.id} className="absolute inset-0">
        {current && <SceneRenderer visual={current.visual} accent={composition.accent} />}
      </div>

      {/* ── Tap to pause / resume ──────────────────────────────────────── */}
      <button onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pause' : 'Play'}
        className="absolute inset-0 z-10 flex items-center justify-center bg-transparent border-none cursor-pointer">
        {!playing && (
          <span className="flex items-center justify-center rounded-full"
            style={{
              width: 66, height: 66, background: 'rgba(232,184,75,0.18)',
              border: '2px solid rgba(232,184,75,0.55)', backdropFilter: 'blur(12px)',
              boxShadow: '0 0 30px rgba(232,184,75,0.22)',
            }}>
            <Play size={26} fill="var(--gold)" style={{ color: 'var(--gold)', marginLeft: 4 }} />
          </span>
        )}
      </button>

      {/* ── Caption track ──────────────────────────────────────────────── */}
      <div className="absolute left-0 right-0 z-20 pointer-events-none px-7" style={{ bottom: 34 }}>
        <div className="pointer-events-none" style={{
          background: 'linear-gradient(0deg, rgba(5,8,26,0.92) 0%, rgba(5,8,26,0.6) 70%, transparent 100%)',
          margin: '0 -28px', padding: '24px 28px 6px',
        }}>
          {current && (
            <p key={`cap-${current.id}`} className="font-sans font-medium text-center mx-auto"
              style={{
                fontSize: 14.5, lineHeight: 1.45, maxWidth: 460,
                color: 'rgba(238,242,255,0.92)', textShadow: '0 1px 10px rgba(0,0,0,0.85)',
                animation: 'sceneIn 0.45s ease both',
              }}>
              {current.narration}
            </p>
          )}
        </div>
      </div>

      {/* ── Segmented progress (one bar per scene) ─────────────────────── */}
      <div className="absolute left-0 right-0 z-30 flex gap-1 px-3" style={{ bottom: 14 }}>
        {scenes.map((s, i) => {
          const fill = i < index ? 1 : i > index ? 0 : sceneFraction
          return (
            <span key={s.id} className="flex-1 rounded-full overflow-hidden" style={{ height: 3, background: 'rgba(255,255,255,0.18)' }}>
              <span className="block h-full rounded-full" style={{
                width: `${fill * 100}%`,
                background: 'linear-gradient(90deg, var(--gold), rgba(232,184,75,0.55))',
                transition: i === index && playing ? 'width 0.1s linear' : 'none',
              }} />
            </span>
          )
        })}
      </div>

      {/* ── Controls: play/pause state + mute, bottom-left ──────────────── */}
      <div className="absolute z-30 flex items-center gap-2.5" style={{ bottom: 20, left: 14 }}>
        {playing
          ? <Pause size={13} fill="rgba(255,255,255,0.6)" style={{ color: 'rgba(255,255,255,0.6)' }} />
          : <Play size={13} fill="rgba(255,255,255,0.6)" style={{ color: 'rgba(255,255,255,0.6)' }} />}
        {narrator.supported && (
          <button onClick={(e) => { e.stopPropagation(); narrator.setMuted(!narrator.muted) }}
            aria-label={narrator.muted ? 'Unmute' : 'Mute'}
            className="flex items-center justify-center bg-transparent border-none cursor-pointer p-0">
            {narrator.muted
              ? <VolumeX size={15} style={{ color: 'rgba(255,255,255,0.6)' }} />
              : <Volume2 size={15} style={{ color: 'var(--gold)' }} />}
          </button>
        )}
      </div>
    </div>
  )
}
