'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
 * Two clocks, one behaviour:
 *  • Premium audio (composition.audioUrl): a hidden <audio> is the master clock;
 *    visuals track its currentTime and it loops on end. This is the natural,
 *    full-take premium voiceover.
 *  • No audio: the browser SpeechSynthesis speaks each beat and the scene holds
 *    until the line finishes (onend), then advances — never cutting off — and
 *    loops at the end.
 */
export function VideoPlayer({ composition, onProgress }: Props) {
  const { scenes } = composition
  const hasAudio = !!composition.audioUrl

  const { starts, total } = useMemo(() => {
    const s: number[] = []
    let acc = 0
    for (const sc of scenes) { s.push(acc); acc += sc.durationMs }
    return { starts: s, total: Math.max(acc, 1) }
  }, [scenes])

  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(true) // instant autoplay
  const [muted, setMuted] = useState(false)    // voiced by default
  const [sceneFraction, setSceneFraction] = useState(0)
  const narrator = useNarration(false)

  const tokenRef = useRef(0)
  const rafRef = useRef<number | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const onProgressRef = useRef(onProgress)
  onProgressRef.current = onProgress

  const sceneAt = useCallback((elapsed: number) => {
    let i = starts.length - 1
    for (let k = 0; k < starts.length; k++) {
      if (elapsed < starts[k] + scenes[k].durationMs) { i = k; break }
    }
    const within = (elapsed - starts[i]) / scenes[i].durationMs
    return { i, within: Math.min(Math.max(within, 0), 1) }
  }, [starts, scenes])

  // ── Premium-audio clock ────────────────────────────────────────────────
  useEffect(() => {
    if (!hasAudio) return
    const audio = audioRef.current
    if (!audio) return
    audio.muted = muted
    if (!playing) { audio.pause(); return }

    const tryPlay = () => {
      const p = audio.play()
      // If the browser blocks audible autoplay, fall back to muted so the
      // visuals still advance; a single tap on the speaker unmutes.
      if (p) p.catch(() => { audio.muted = true; setMuted(true); audio.play().catch(() => {}) })
    }
    tryPlay()

    const onTime = () => {
      const dur = audio.duration && isFinite(audio.duration) ? audio.duration : total / 1000
      const frac = dur > 0 ? Math.min(audio.currentTime / dur, 1) : 0
      const elapsed = frac * total
      const { i, within } = sceneAt(elapsed)
      setIndex(i)
      setSceneFraction(within)
      onProgressRef.current?.(frac, audio.currentTime * 1000)
    }
    const onEnded = () => { audio.currentTime = 0; audio.play().catch(() => {}) } // loop
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('ended', onEnded)
    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('ended', onEnded)
    }
  }, [hasAudio, playing, muted, total, sceneAt])

  // ── Browser-voice clock (fallback) ──────────────────────────────────────
  useEffect(() => {
    if (hasAudio) return
    if (!playing) { narrator.cancel(); return }
    const scene = scenes[index]
    if (!scene) return
    const myToken = ++tokenRef.current
    setSceneFraction(0)

    const advance = () => {
      if (tokenRef.current !== myToken) return
      setIndex((i) => (i + 1) % scenes.length) // loop
    }

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

    let safetyMs: number
    if (narrator.supported && !muted) {
      const initiatedAt = performance.now()
      narrator.speak(scene.narration, () => {
        if (performance.now() - initiatedAt < 400) return // ignore spurious early end
        advance()
      })
      safetyMs = estMs + 6000
    } else {
      narrator.cancel()
      safetyMs = estMs
    }
    const timer = window.setTimeout(advance, safetyMs)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAudio, index, playing, muted, scenes, starts, total])

  const current = scenes[index]
  const showMute = hasAudio || narrator.supported

  return (
    <div className="absolute inset-0 overflow-hidden select-none" style={{ background: '#05081a' }}>

      {hasAudio && <audio ref={audioRef} src={composition.audioUrl} preload="auto" />}

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

      {/* ── Caption track (hidden for statement beats — text already shown big) ── */}
      <div className="absolute left-0 right-0 z-20 pointer-events-none px-7" style={{ bottom: 34 }}>
        <div className="pointer-events-none" style={{
          background: 'linear-gradient(0deg, rgba(5,8,26,0.92) 0%, rgba(5,8,26,0.6) 70%, transparent 100%)',
          margin: '0 -28px', padding: '24px 28px 6px',
        }}>
          {current && current.visual.type !== 'statement' && (
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
        {showMute && (
          <button onClick={(e) => { e.stopPropagation(); setMuted((m) => !m) }}
            aria-label={muted ? 'Unmute' : 'Mute'}
            className="flex items-center justify-center bg-transparent border-none cursor-pointer p-0">
            {muted
              ? <VolumeX size={15} style={{ color: 'rgba(255,255,255,0.6)' }} />
              : <Volume2 size={15} style={{ color: 'var(--gold)' }} />}
          </button>
        )}
      </div>
    </div>
  )
}
