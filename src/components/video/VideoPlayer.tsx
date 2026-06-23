'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Play, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react'
import { SceneRenderer } from './Scenes'
import { useNarration } from '@/lib/video/useNarration'
import type { VideoComposition } from '@/types'

interface Props {
  composition: VideoComposition
  /** Begin playing as soon as it mounts. */
  autoPlay?: boolean
  /** Start with voiceover muted (used for scroll-autoplay; visuals + captions still play). */
  startMuted?: boolean
  /** Fired once the composition reaches the end. */
  onEnded?: () => void
  /** Fired on every frame with overall progress 0..1 (for watch tracking). */
  onProgress?: (fraction: number, elapsedMs: number) => void
}

/**
 * Plays a VideoComposition as a timed sequence of scenes.
 *
 * The clock is a single elapsed-ms value advanced by requestAnimationFrame.
 * It is deliberately isolated in one place: when real TTS narration arrives,
 * swap the rAF source for an <audio> element's `currentTime` and everything
 * else — scene selection, captions, progress — keeps working unchanged.
 */
export function VideoPlayer({ composition, autoPlay = true, startMuted = false, onEnded, onProgress }: Props) {
  const { scenes } = composition

  // Cumulative scene start times + total, derived once per composition.
  const { starts, total } = useMemo(() => {
    const s: number[] = []
    let acc = 0
    for (const scene of scenes) {
      s.push(acc)
      acc += scene.durationMs
    }
    return { starts: s, total: Math.max(acc, 1) }
  }, [scenes])

  const [playing, setPlaying] = useState(autoPlay)
  const [ended, setEnded] = useState(false)
  const [index, setIndex] = useState(0)
  const [sceneFraction, setSceneFraction] = useState(0)

  const narrator = useNarration(startMuted)

  const elapsedRef = useRef(0)
  const lastTsRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)
  const onEndedRef = useRef(onEnded)
  const onProgressRef = useRef(onProgress)
  onEndedRef.current = onEnded
  onProgressRef.current = onProgress

  const sceneAt = useCallback((elapsed: number) => {
    let i = starts.length - 1
    for (let k = 0; k < starts.length; k++) {
      if (elapsed < starts[k] + scenes[k].durationMs) { i = k; break }
    }
    const within = (elapsed - starts[i]) / scenes[i].durationMs
    return { i, within: Math.min(Math.max(within, 0), 1) }
  }, [starts, scenes])

  // ── The clock ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!playing) return
    const frame = (ts: number) => {
      if (lastTsRef.current == null) lastTsRef.current = ts
      elapsedRef.current += ts - lastTsRef.current
      lastTsRef.current = ts

      const elapsed = elapsedRef.current
      onProgressRef.current?.(Math.min(elapsed / total, 1), elapsed)

      if (elapsed >= total) {
        const last = scenes.length - 1
        setIndex(last)
        setSceneFraction(1)
        setPlaying(false)
        setEnded(true)
        onEndedRef.current?.()
        return
      }
      const { i, within } = sceneAt(elapsed)
      setIndex(i)
      setSceneFraction(within)
      rafRef.current = requestAnimationFrame(frame)
    }
    rafRef.current = requestAnimationFrame(frame)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      lastTsRef.current = null
    }
  }, [playing, total, scenes, sceneAt])

  // ── Voiceover ────────────────────────────────────────────────────────────
  // Speak the current scene's line. We cancel + re-speak on each change (scene
  // advance, pause→play, mute toggle) rather than using the browser's flaky
  // speech pause/resume. Goes silent when paused, ended, or muted.
  useEffect(() => {
    if (!playing || narrator.muted) { narrator.cancel(); return }
    narrator.speak(scenes[index]?.narration ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, playing, narrator.muted])

  const toggle = useCallback(() => {
    if (ended) { // replay
      elapsedRef.current = 0
      setEnded(false)
      setIndex(0)
      setSceneFraction(0)
      setPlaying(true)
      return
    }
    setPlaying((p) => !p)
  }, [ended])

  const seekToScene = useCallback((i: number) => {
    elapsedRef.current = starts[i]
    setEnded(false)
    setIndex(i)
    setSceneFraction(0)
    setPlaying(true)
  }, [starts])

  const current = scenes[index]

  return (
    <div className="absolute inset-0 overflow-hidden select-none" style={{ background: '#05081a' }}>

      {/* ── Scene (remounts per id → re-fires entry animations) ─────────── */}
      <div key={current?.id} className="absolute inset-0">
        {current && <SceneRenderer visual={current.visual} accent={composition.accent} />}
      </div>

      {/* ── Tap layer: play / pause / replay ───────────────────────────── */}
      <button onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}
        className="absolute inset-0 z-10 flex items-center justify-center bg-transparent border-none cursor-pointer">
        {!playing && (
          <span className="flex items-center justify-center rounded-full"
            style={{
              width: 66, height: 66, background: 'rgba(232,184,75,0.18)',
              border: '2px solid rgba(232,184,75,0.55)', backdropFilter: 'blur(12px)',
              boxShadow: '0 0 30px rgba(232,184,75,0.22)',
            }}>
            {ended
              ? <RotateCcw size={26} style={{ color: 'var(--gold)' }} />
              : <Play size={26} fill="var(--gold)" style={{ color: 'var(--gold)', marginLeft: 4 }} />}
          </span>
        )}
      </button>

      {/* ── Caption track ──────────────────────────────────────────────── */}
      <div className="absolute left-0 right-0 z-20 pointer-events-none px-7"
        style={{ bottom: 34 }}>
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

      {/* ── Segmented progress (one bar per scene, click to seek) ───────── */}
      <div className="absolute left-0 right-0 z-30 flex gap-1 px-3" style={{ bottom: 14 }}>
        {scenes.map((s, i) => {
          const fill = i < index ? 1 : i > index ? 0 : sceneFraction
          return (
            <button key={s.id} onClick={(e) => { e.stopPropagation(); seekToScene(i) }}
              aria-label={`Scene ${i + 1}`}
              className="flex-1 rounded-full overflow-hidden bg-transparent border-none cursor-pointer p-0"
              style={{ height: 3 }}>
              <span className="block w-full h-full rounded-full" style={{ background: 'rgba(255,255,255,0.18)' }}>
                <span className="block h-full rounded-full" style={{
                  width: `${fill * 100}%`,
                  background: 'linear-gradient(90deg, var(--gold), rgba(232,184,75,0.55))',
                  transition: i === index && playing ? 'width 0.1s linear' : 'none',
                }} />
              </span>
            </button>
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
