'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export interface Narrator {
  /** True once the browser exposes a usable speech engine. */
  supported: boolean
  muted: boolean
  setMuted: (m: boolean) => void
  /** Speak a line now, cancelling anything already in flight. `onEnd` fires
   *  when the line finishes (or errors), so the caller can advance. */
  speak: (text: string, onEnd?: () => void) => void
  /** Stop all speech immediately. */
  cancel: () => void
  /** Kept for a future audio-file backend; Web Speech pause/resume is flaky. */
  pause: () => void
  resume: () => void
}

/**
 * Voiceover for the video player, backed by the browser's built-in
 * SpeechSynthesis. Deliberately tiny and isolated: to move to a real TTS
 * provider (ElevenLabs / OpenAI) later, replace the body of this hook with one
 * that plays per-scene audio clips — the player calls `speak`/`cancel`/`muted`
 * and nothing else needs to change.
 */
export function useNarration(initialMuted = false): Narrator {
  const [supported, setSupported] = useState(false)
  const [muted, setMutedState] = useState(initialMuted)

  const voiceRef = useRef<SpeechSynthesisVoice | null>(null)
  const mutedRef = useRef(initialMuted)
  mutedRef.current = muted

  // Detect support + pick the nicest available English voice.
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    setSupported(true)

    const pick = () => {
      const voices = window.speechSynthesis.getVoices()
      voiceRef.current =
        voices.find((v) => /en[-_]?(AU|GB|US)/i.test(v.lang) &&
          /natural|neural|google|samantha|daniel|aria|libby/i.test(v.name)) ??
        voices.find((v) => /^en/i.test(v.lang)) ??
        voices[0] ?? null
    }
    pick()
    window.speechSynthesis.onvoiceschanged = pick

    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  const cancel = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
  }, [])

  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    if (mutedRef.current || !text.trim()) return
    const synth = window.speechSynthesis
    synth.cancel() // clear anything pending/queued
    const u = new SpeechSynthesisUtterance(text)
    if (voiceRef.current) u.voice = voiceRef.current
    u.rate = 1.0
    u.pitch = 1.0
    u.volume = 1.0
    if (onEnd) {
      u.onend = () => onEnd()
      u.onerror = () => onEnd() // an error shouldn't stall the timeline
    }
    // Defer the speak by a tick: calling speak() in the same frame as cancel()
    // triggers a Chrome bug where the new utterance fires 'end' immediately.
    window.setTimeout(() => synth.speak(u), 60)
  }, [])

  const pause = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    if (window.speechSynthesis.speaking) window.speechSynthesis.pause()
  }, [])

  const resume = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    if (window.speechSynthesis.paused) window.speechSynthesis.resume()
  }, [])

  const setMuted = useCallback((m: boolean) => {
    setMutedState(m)
    if (m && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
  }, [])

  return { supported, muted, setMuted, speak, cancel, pause, resume }
}
