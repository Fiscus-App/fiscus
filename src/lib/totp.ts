// ─────────────────────────────────────────────────────────────────────────────
// TOTP (RFC 6238) — self-contained, zero external dependencies.
// Used for two-factor authentication. Server-side only (uses Node `crypto`).
// ─────────────────────────────────────────────────────────────────────────────

import { createHmac, randomBytes } from 'crypto'

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

// ── Base32 (RFC 4648, no padding) ─────────────────────────────────────────────

export function base32Encode(buf: Buffer): string {
  let bits = 0
  let value = 0
  let out = ''
  for (let i = 0; i < buf.length; i++) {
    value = (value << 8) | buf[i]
    bits += 8
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) {
    out += BASE32_ALPHABET[(value << (5 - bits)) & 31]
  }
  return out
}

function base32Decode(input: string): Buffer {
  const clean = input.replace(/=+$/g, '').replace(/\s+/g, '').toUpperCase()
  let bits = 0
  let value = 0
  const bytes: number[] = []
  for (const ch of clean) {
    const idx = BASE32_ALPHABET.indexOf(ch)
    if (idx === -1) continue
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return Buffer.from(bytes)
}

// ── Secret generation ─────────────────────────────────────────────────────────

/** Generate a fresh base32 TOTP secret (default 20 random bytes = 160 bits). */
export function generateSecret(bytes = 20): string {
  return base32Encode(randomBytes(bytes))
}

// ── Core HOTP / TOTP ──────────────────────────────────────────────────────────

function hotp(secret: string, counter: number, digits = 6): string {
  const key = base32Decode(secret)

  // 8-byte big-endian counter. Using % / Math.floor (not bitwise ops) keeps
  // this exact for counters beyond 32 bits without needing BigInt literals.
  const buf = Buffer.alloc(8)
  let c = counter
  for (let i = 7; i >= 0; i--) {
    buf[i] = c % 256
    c = Math.floor(c / 256)
  }

  const hmac = createHmac('sha1', key).update(buf).digest()
  const offset = hmac[hmac.length - 1] & 0x0f
  const binCode =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)

  const code = (binCode % 10 ** digits).toString().padStart(digits, '0')
  return code
}

/** Generate the current TOTP code for a secret. */
export function generateToken(secret: string, period = 30, digits = 6, now = Date.now()): string {
  const counter = Math.floor(now / 1000 / period)
  return hotp(secret, counter, digits)
}

/**
 * Verify a user-supplied token against the secret.
 * Allows a ±`window` step drift (default ±1 step = ±30s) to tolerate clock skew.
 */
export function verifyToken(
  token: string,
  secret: string,
  opts: { period?: number; digits?: number; window?: number; now?: number } = {},
): boolean {
  const { period = 30, digits = 6, window = 1, now = Date.now() } = opts
  const cleaned = (token || '').replace(/\s+/g, '')
  if (!/^\d{6}$/.test(cleaned)) return false

  const counter = Math.floor(now / 1000 / period)
  for (let errorWindow = -window; errorWindow <= window; errorWindow++) {
    const candidate = hotp(secret, counter + errorWindow, digits)
    // constant-time-ish compare
    if (timingSafeEqualStr(candidate, cleaned)) return true
  }
  return false
}

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

// ── otpauth:// provisioning URI (for QR codes / manual entry) ──────────────────

export function buildOtpAuthUrl(opts: {
  secret: string
  accountName: string
  issuer?: string
  period?: number
  digits?: number
}): string {
  const { secret, accountName, issuer = 'Fiscus', period = 30, digits = 6 } = opts
  const label = encodeURIComponent(`${issuer}:${accountName}`)
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(digits),
    period: String(period),
  })
  return `otpauth://totp/${label}?${params.toString()}`
}

// ── Backup codes ──────────────────────────────────────────────────────────────

/** Generate `count` human-friendly backup codes, e.g. "3f9a-1c2b". */
export function generateBackupCodes(count = 10): string[] {
  const codes: string[] = []
  for (let i = 0; i < count; i++) {
    const raw = randomBytes(4).toString('hex') // 8 hex chars
    codes.push(`${raw.slice(0, 4)}-${raw.slice(4, 8)}`)
  }
  return codes
}
