/**
 * Premium voiceover via ElevenLabs.
 *
 * Synthesises a script into natural, broadcaster-grade audio and returns it as
 * a base64 data URL the player can drop straight into an <audio> element.
 * Voice + delivery adapt to the story's tone (urgent for a selloff, warm for
 * earnings, calm for economic data, …). Everything degrades to null when no
 * ELEVENLABS_API_KEY is set or the call fails — the player then uses the free
 * browser voice, so nothing breaks without a key.
 */

const ELEVEN_BASE = 'https://api.elevenlabs.io/v1/text-to-speech'

interface VoiceSettings {
  stability: number
  similarity_boost: number
  style: number
  use_speaker_boost: boolean
}

export interface VoiceOption {
  /** ElevenLabs voice id. Override any of these via env if you prefer others. */
  id: string
  label: string
  description: string
}

/**
 * A curated RANGE of premium voices — exciting, professional and inviting.
 * Swap any id for one from your own ElevenLabs library (GET /v1/voices), or set
 * ELEVENLABS_VOICE_ID to force a single default across every story.
 */
export const VOICES: Record<string, VoiceOption> = {
  adam:   { id: 'pNInz6obpgDQGcFmaJgB', label: 'Adam',   description: 'Deep, authoritative — commands attention' },
  antoni: { id: 'ErXwobaYiN019PkySvjV', label: 'Antoni', description: 'Warm, polished, inviting' },
  rachel: { id: '21m00Tcm4TlvDq8ikWAM', label: 'Rachel', description: 'Calm, intelligent, clear' },
  josh:   { id: 'TxGEqnHWrfWFTfGW9XjX', label: 'Josh',   description: 'Energetic, youthful, urgent' },
  domi:   { id: 'AZnzlk1XvdvUeBnXmlld', label: 'Domi',   description: 'Confident, punchy' },
  bella:  { id: 'EXAVITQu4vr4xnSDxMaL', label: 'Bella',  description: 'Smooth, engaging' },
}

/** Map a story tone → a voice + an expressive delivery for it. */
function deliveryForTone(tone: string): { voice: VoiceOption; settings: VoiceSettings } {
  const t = tone.toLowerCase()
  const settings = (stability: number, style: number): VoiceSettings => ({
    stability, similarity_boost: 0.8, style, use_speaker_boost: true,
  })
  if (/sell|crash|plunge|rout|urgent|tumble/.test(t)) return { voice: VOICES.josh,   settings: settings(0.32, 0.55) }
  if (/earn|results|beat|profit/.test(t))             return { voice: VOICES.antoni, settings: settings(0.45, 0.45) }
  if (/econ|inflation|data|macro|rate|rba|fed/.test(t)) return { voice: VOICES.rachel, settings: settings(0.6, 0.3) }
  if (/m&a|deal|acqui|merger|takeover/.test(t))       return { voice: VOICES.adam,   settings: settings(0.45, 0.45) }
  return { voice: VOICES.antoni, settings: settings(0.45, 0.45) } // exciting + inviting default
}

/** True when premium voices are configured. */
export function ttsAvailable(): boolean {
  return !!process.env.ELEVENLABS_API_KEY
}

export interface SynthResult {
  audioUrl: string // data:audio/mpeg;base64,…
  voice: string    // voice label used
}

export async function synthesizeScript(text: string, tone = 'neutral'): Promise<SynthResult | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey || !text.trim()) return null

  const { voice, settings } = deliveryForTone(tone)
  const voiceId = process.env.ELEVENLABS_VOICE_ID || voice.id
  const modelId = process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2'

  try {
    const res = await fetch(`${ELEVEN_BASE}/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({ text, model_id: modelId, voice_settings: settings }),
    })
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length === 0) return null
    return {
      audioUrl: `data:audio/mpeg;base64,${buf.toString('base64')}`,
      voice: process.env.ELEVENLABS_VOICE_ID ? 'custom' : voice.label,
    }
  } catch {
    return null // any failure → browser-voice fallback
  }
}
