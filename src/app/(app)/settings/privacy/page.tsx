'use client'

import { useEffect, useState, useCallback } from 'react'
import { signOut } from 'next-auth/react'
import {
  Mail, KeyRound, ShieldCheck, Smartphone, LogOut, Lock, UserPlus, Activity,
  Sparkles, Megaphone, BarChart3, Ban, Download, Eraser, Trash2, Copy, Check,
  AlertTriangle, ExternalLink, CheckCircle2,
} from 'lucide-react'
import {
  SettingsScaffold, Group, Row, ToggleRow, Segmented, Banner, Modal,
  GoldButton, GhostButton, TextField,
} from '@/components/settings/ui'
import {
  getPrivacyPrefs, setPrivacyPrefs, type PrivacyPrefs, clearLocalSearchHistory,
} from '@/lib/settings'

interface Security {
  email: string | null
  emailVerified: boolean
  hasPassword: boolean
  twoFactorEnabled: boolean
  createdAt: string | null
}

function deviceLabel(): string {
  if (typeof navigator === 'undefined') return 'This device'
  const ua = navigator.userAgent
  const os = /iPhone|iPad|iPod/.test(ua) ? 'iOS'
    : /Android/.test(ua) ? 'Android'
    : /Mac/.test(ua) ? 'macOS'
    : /Win/.test(ua) ? 'Windows' : 'Web'
  const br = /Edg/.test(ua) ? 'Edge'
    : /Chrome/.test(ua) ? 'Chrome'
    : /Firefox/.test(ua) ? 'Firefox'
    : /Safari/.test(ua) ? 'Safari' : 'Browser'
  return `${br} on ${os}`
}

export default function PrivacySettingsPage() {
  const [sec, setSec]     = useState<Security | null>(null)
  const [prefs, setPrefs] = useState<PrivacyPrefs | null>(null)
  const [modal, setModal] = useState<null | 'password' | '2fa' | 'delete' | 'blocked'>(null)
  const [toast, setToast] = useState('')

  const loadSecurity = useCallback(() => {
    fetch('/api/account/security')
      .then((r) => r.json())
      .then((d) => { if (!d.error) setSec(d) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    setPrefs(getPrivacyPrefs())
    loadSecurity()
  }, [loadSecurity])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 3200)
    return () => clearTimeout(t)
  }, [toast])

  function update<K extends keyof PrivacyPrefs>(key: K, value: PrivacyPrefs[K]) {
    setPrefs((prev) => {
      if (!prev) return prev
      const next = { ...prev, [key]: value }
      setPrivacyPrefs(next)
      return next
    })
  }

  async function exportData() {
    setToast('Preparing your data…')
    try {
      const res = await fetch('/api/account/export')
      if (!res.ok) { setToast('Could not export your data'); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `fiscus-data-export-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setToast('Your data download has started')
    } catch {
      setToast('Could not export your data')
    }
  }

  if (!prefs) return null

  return (
    <SettingsScaffold eyebrow="Settings" title="Privacy & Security">
      {/* Toast */}
      {toast && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-[70] px-4 py-2.5 rounded-xl text-[12px] font-medium flex items-center gap-2 fade-up"
          style={{ bottom: 86, background: 'var(--bg-4)', border: '1px solid var(--line-2)', color: 'var(--text-primary)', boxShadow: '0 8px 30px rgba(0,0,0,0.4)' }}
        >
          <CheckCircle2 size={14} style={{ color: 'var(--green)' }} />
          {toast}
        </div>
      )}

      {/* ── Account ──────────────────────────────────────────────────────── */}
      <Group label="Account">
        <Row
          icon={Mail} label={sec?.email ?? 'Your email'}
          sub="Account email"
          right={
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
              style={
                sec?.emailVerified
                  ? { background: 'var(--green-a)', color: 'var(--green)', border: '1px solid var(--green-b)' }
                  : { background: 'var(--bg-4)', color: 'var(--text-muted)', border: '1px solid var(--line)' }
              }
            >
              {sec?.emailVerified ? 'Verified' : 'Unverified'}
            </span>
          }
        />
        <Row
          icon={KeyRound} label="Password"
          sub={sec?.hasPassword ? 'Change your password' : 'Set a password for email sign-in'}
          chevron onClick={() => setModal('password')}
        />
        <Row
          icon={ShieldCheck} label="Two-factor authentication"
          sub="Add an authenticator-app code at sign-in"
          value={sec?.twoFactorEnabled ? 'On' : 'Off'}
          chevron onClick={() => setModal('2fa')}
        />
      </Group>

      {/* ── Login & devices ──────────────────────────────────────────────── */}
      <Group label="Where you're logged in">
        <Row icon={Smartphone} label={deviceLabel()} sub="This device · active now"
          right={<span className="live-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />}
        />
        <Row icon={LogOut} label="Sign out" sub="End your session on this device"
          onClick={() => signOut({ callbackUrl: '/login' })} chevron
        />
      </Group>

      {/* ── Privacy ──────────────────────────────────────────────────────── */}
      <Group label="Privacy" footer="A private account means only people you approve can see your activity and saves.">
        <ToggleRow icon={Lock} label="Private account"
          sub="Hide your profile and activity from others"
          checked={prefs.privateAccount} onChange={(v) => update('privateAccount', v)}
        />
        <ToggleRow icon={UserPlus} label="Suggest your account to others"
          sub="Let Fiscus recommend you to teammates"
          checked={prefs.discoverable} onChange={(v) => update('discoverable', v)}
        />
        <ToggleRow icon={Activity} label="Activity status"
          sub="Show when you’re active to your teams"
          checked={prefs.activityStatus} onChange={(v) => update('activityStatus', v)}
        />
      </Group>

      {/* ── Interactions ─────────────────────────────────────────────────── */}
      <div className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] font-mono mb-2 px-1" style={{ color: 'var(--text-muted)' }}>
          Who can message you
        </p>
        <Segmented
          value={prefs.whoCanMessage}
          onChange={(v) => update('whoCanMessage', v)}
          options={[{ value: 'everyone', label: 'Everyone' }, { value: 'team', label: 'Teams' }, { value: 'none', label: 'No one' }]}
        />
      </div>

      <div className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] font-mono mb-2 px-1" style={{ color: 'var(--text-muted)' }}>
          Who can see your saves
        </p>
        <Segmented
          value={prefs.whoCanSeeSaves}
          onChange={(v) => update('whoCanSeeSaves', v)}
          options={[{ value: 'everyone', label: 'Everyone' }, { value: 'team', label: 'Teams' }, { value: 'onlyMe', label: 'Only me' }]}
        />
      </div>

      {/* ── Personalisation ──────────────────────────────────────────────── */}
      <Group label="Personalisation & ads" footer="Turning these off makes recommendations less tailored but never limits your access.">
        <ToggleRow icon={Sparkles} label="Personalised recommendations"
          sub="Use your activity to tune your feed"
          checked={prefs.personalizedRecs} onChange={(v) => update('personalizedRecs', v)}
        />
        <ToggleRow icon={Megaphone} label="Personalised ads"
          sub="Use your activity to tailor ads"
          checked={prefs.personalizedAds} onChange={(v) => update('personalizedAds', v)}
        />
        <ToggleRow icon={BarChart3} label="Share usage data"
          sub="Help improve Fiscus with anonymised stats"
          checked={prefs.shareUsageData} onChange={(v) => update('shareUsageData', v)}
        />
        <ToggleRow icon={Activity} label="Analytics & crash reports"
          sub="Send diagnostics to fix problems faster"
          checked={prefs.allowAnalytics} onChange={(v) => update('allowAnalytics', v)}
        />
      </Group>

      {/* ── Safety ───────────────────────────────────────────────────────── */}
      <Group label="Safety">
        <Row icon={Ban} label="Blocked accounts" value="0" chevron onClick={() => setModal('blocked')} />
      </Group>

      {/* ── Your data ────────────────────────────────────────────────────── */}
      <Group label="Your data">
        <Row icon={Download} label="Download your data"
          sub="Export your account, follows & activity as JSON"
          chevron onClick={exportData}
        />
        <Row icon={Eraser} label="Clear search history"
          sub="Remove recent searches on this device"
          chevron onClick={() => { clearLocalSearchHistory(); setToast('Search history cleared') }}
        />
      </Group>

      {/* ── Danger zone ──────────────────────────────────────────────────── */}
      <Group label="Danger zone">
        <Row icon={Trash2} label="Delete account" danger
          sub="Permanently erase your account and data"
          chevron onClick={() => setModal('delete')}
        />
      </Group>

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      <PasswordModal
        open={modal === 'password'}
        hasPassword={!!sec?.hasPassword}
        onClose={() => setModal(null)}
        onDone={() => { setModal(null); setToast('Password updated'); loadSecurity() }}
      />

      <TwoFactorModal
        open={modal === '2fa'}
        enabled={!!sec?.twoFactorEnabled}
        hasPassword={!!sec?.hasPassword}
        onClose={() => setModal(null)}
        onChanged={(msg) => { setModal(null); setToast(msg); loadSecurity() }}
      />

      <DeleteModal
        open={modal === 'delete'}
        hasPassword={!!sec?.hasPassword}
        onClose={() => setModal(null)}
      />

      <Modal open={modal === 'blocked'} onClose={() => setModal(null)} title="Blocked accounts">
        <div className="flex flex-col items-center text-center py-8">
          <div className="flex items-center justify-center mb-3" style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--bg-3)', border: '1px solid var(--line)' }}>
            <Ban size={24} strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
          </div>
          <p className="text-[13px] font-medium">No blocked accounts</p>
          <p className="text-[11.5px] mt-1 leading-relaxed" style={{ color: 'var(--text-muted)', maxWidth: 240 }}>
            When you block someone, they’ll appear here and won’t be able to message you or see your activity.
          </p>
        </div>
      </Modal>
    </SettingsScaffold>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Change password
// ─────────────────────────────────────────────────────────────────────────────

function PasswordModal({
  open, hasPassword, onClose, onDone,
}: {
  open: boolean
  hasPassword: boolean
  onClose: () => void
  onDone: () => void
}) {
  const [current, setCurrent] = useState('')
  const [next, setNext]       = useState('')
  const [confirm, setConfirm] = useState('')
  const [err, setErr]         = useState('')
  const [busy, setBusy]       = useState(false)

  async function submit() {
    setErr('')
    if (next.length < 8) { setErr('New password must be at least 8 characters'); return }
    if (next !== confirm) { setErr('Passwords don’t match'); return }
    setBusy(true)
    try {
      const res = await fetch('/api/account/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      })
      const data = await res.json()
      if (!res.ok) { setErr(data.error ?? 'Could not update password'); return }
      setCurrent(''); setNext(''); setConfirm('')
      onDone()
    } catch {
      setErr('Something went wrong')
    } finally { setBusy(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title={hasPassword ? 'Change password' : 'Set password'}>
      <div className="space-y-3">
        {err && <ErrorNote>{err}</ErrorNote>}
        {hasPassword && (
          <TextField label="Current password" type="password" value={current} onChange={setCurrent} autoFocus />
        )}
        <TextField label="New password" type="password" value={next} onChange={setNext} placeholder="At least 8 characters" />
        <TextField label="Confirm new password" type="password" value={confirm} onChange={setConfirm} />
        <div className="pt-1">
          <GoldButton onClick={submit} disabled={busy}>{busy ? 'Saving…' : 'Save password'}</GoldButton>
        </div>
      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Two-factor authentication
// ─────────────────────────────────────────────────────────────────────────────

function TwoFactorModal({
  open, enabled, hasPassword, onClose, onChanged,
}: {
  open: boolean
  enabled: boolean
  hasPassword: boolean
  onClose: () => void
  onChanged: (msg: string) => void
}) {
  type Step = 'intro' | 'verify' | 'codes'
  const [step, setStep]           = useState<Step>('intro')
  const [manualKey, setManualKey] = useState('')
  const [otpauthUrl, setOtpauth]  = useState('')
  const [code, setCode]           = useState('')
  const [codes, setCodes]         = useState<string[]>([])
  const [err, setErr]             = useState('')
  const [busy, setBusy]           = useState(false)
  const [copied, setCopied]       = useState('')

  // disable form
  const [disableSecret, setDisableSecret] = useState('')

  function reset() {
    setStep('intro'); setManualKey(''); setOtpauth(''); setCode('')
    setCodes([]); setErr(''); setDisableSecret('')
  }

  async function startSetup() {
    setErr(''); setBusy(true)
    try {
      const res = await fetch('/api/account/2fa/setup', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setErr(data.error ?? 'Could not start setup'); return }
      setManualKey(data.manualKey); setOtpauth(data.otpauthUrl); setStep('verify')
    } catch { setErr('Something went wrong') } finally { setBusy(false) }
  }

  async function verify() {
    setErr(''); setBusy(true)
    try {
      const res = await fetch('/api/account/2fa/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: code }),
      })
      const data = await res.json()
      if (!res.ok) { setErr(data.error ?? 'Invalid code'); return }
      setCodes(data.backupCodes ?? []); setStep('codes')
    } catch { setErr('Something went wrong') } finally { setBusy(false) }
  }

  async function disable() {
    setErr(''); setBusy(true)
    try {
      const res = await fetch('/api/account/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: hasPassword ? disableSecret : undefined, token: disableSecret }),
      })
      const data = await res.json()
      if (!res.ok) { setErr(data.error ?? 'Could not disable 2FA'); return }
      reset(); onChanged('Two-factor authentication turned off')
    } catch { setErr('Something went wrong') } finally { setBusy(false) }
  }

  function copy(text: string, tag: string) {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(tag); setTimeout(() => setCopied(''), 1500)
    }).catch(() => {})
  }

  function close() { reset(); onClose() }

  return (
    <Modal open={open} onClose={close} title="Two-factor authentication">
      {/* ── Already enabled → disable ──────────────────────────────────── */}
      {enabled ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2.5 rounded-xl px-3.5 py-3" style={{ background: 'var(--green-a)', border: '1px solid var(--green-b)' }}>
            <ShieldCheck size={16} style={{ color: 'var(--green)' }} />
            <span className="text-[12.5px] font-medium" style={{ color: 'var(--text-primary)' }}>2FA is active on your account</span>
          </div>
          {err && <ErrorNote>{err}</ErrorNote>}
          <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            To turn off two-factor authentication, confirm with your {hasPassword ? 'password' : 'a current authenticator code'}.
          </p>
          <TextField
            label={hasPassword ? 'Password' : 'Authenticator or backup code'}
            type={hasPassword ? 'password' : 'text'}
            value={disableSecret} onChange={setDisableSecret} autoFocus
          />
          <GoldButton danger onClick={disable} disabled={busy || !disableSecret}>
            {busy ? 'Turning off…' : 'Turn off 2FA'}
          </GoldButton>
        </div>
      ) : step === 'intro' ? (
        <div className="space-y-4">
          <p className="text-[12.5px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Protect your account with a one-time code from an authenticator app (Google Authenticator, Authy, 1Password and others).
          </p>
          <ol className="space-y-2.5">
            {['Generate a setup key', 'Add it to your authenticator app', 'Enter the 6-digit code to confirm'].map((t, i) => (
              <li key={i} className="flex items-center gap-2.5">
                <span className="flex items-center justify-center text-[11px] font-bold" style={{ width: 22, height: 22, borderRadius: 7, background: 'rgba(232,184,75,0.12)', border: '1px solid rgba(232,184,75,0.28)', color: 'var(--gold)' }}>{i + 1}</span>
                <span className="text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>{t}</span>
              </li>
            ))}
          </ol>
          {err && <ErrorNote>{err}</ErrorNote>}
          <GoldButton onClick={startSetup} disabled={busy}>{busy ? 'Starting…' : 'Start setup'}</GoldButton>
        </div>
      ) : step === 'verify' ? (
        <div className="space-y-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>Setup key</p>
            <button
              onClick={() => copy(manualKey.replace(/\s/g, ''), 'key')}
              className="w-full flex items-center justify-between gap-2 rounded-xl px-3.5 py-3"
              style={{ background: 'var(--bg-3)', border: '1px solid var(--line-2)' }}
            >
              <span className="font-mono text-[13px] tracking-wider text-left break-all" style={{ color: 'var(--text-primary)' }}>{manualKey}</span>
              {copied === 'key' ? <Check size={14} style={{ color: 'var(--green)' }} /> : <Copy size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
            </button>
            <p className="text-[10.5px] mt-1.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              In your authenticator app choose “Enter a setup key”, paste this, and use account name <span style={{ color: 'var(--text-secondary)' }}>Fiscus</span>.
            </p>
          </div>

          <a
            href={otpauthUrl}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-semibold no-underline"
            style={{ background: 'var(--bg-3)', border: '1px solid var(--line-2)', color: 'var(--gold)' }}
          >
            <ExternalLink size={13} strokeWidth={2} />
            Open in authenticator app
          </a>

          {err && <ErrorNote>{err}</ErrorNote>}

          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>Enter the 6-digit code</p>
            <input
              autoFocus value={code} onChange={(e) => setCode(e.target.value)}
              inputMode="numeric" maxLength={6} placeholder="123456"
              className="w-full px-3.5 py-3 rounded-xl text-center font-mono text-[20px] tracking-[0.4em] outline-none"
              style={{ background: 'var(--bg-3)', border: '1px solid var(--line-2)', color: 'var(--text-primary)' }}
            />
          </div>
          <GoldButton onClick={verify} disabled={busy || code.length < 6}>{busy ? 'Verifying…' : 'Verify & enable'}</GoldButton>
        </div>
      ) : (
        // step === 'codes'
        <div className="space-y-4">
          <div className="flex items-center gap-2.5 rounded-xl px-3.5 py-3" style={{ background: 'var(--green-a)', border: '1px solid var(--green-b)' }}>
            <ShieldCheck size={16} style={{ color: 'var(--green)' }} />
            <span className="text-[12.5px] font-medium">Two-factor authentication is on</span>
          </div>
          <div>
            <p className="text-[12.5px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
              Save these backup codes somewhere safe. Each works once if you lose access to your authenticator.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {codes.map((c) => (
                <div key={c} className="font-mono text-[13px] text-center py-2 rounded-lg" style={{ background: 'var(--bg-3)', border: '1px solid var(--line)', color: 'var(--text-primary)' }}>{c}</div>
              ))}
            </div>
            <button
              onClick={() => copy(codes.join('\n'), 'codes')}
              className="w-full mt-2.5 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-semibold"
              style={{ background: 'var(--bg-3)', border: '1px solid var(--line-2)', color: 'var(--text-secondary)' }}
            >
              {copied === 'codes' ? <Check size={13} style={{ color: 'var(--green)' }} /> : <Copy size={13} />}
              {copied === 'codes' ? 'Copied' : 'Copy all codes'}
            </button>
          </div>
          <GoldButton onClick={() => { const done = codes.length; reset(); onChanged(done ? 'Two-factor authentication enabled' : 'Done') }}>
            I’ve saved my codes
          </GoldButton>
        </div>
      )}
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete account
// ─────────────────────────────────────────────────────────────────────────────

function DeleteModal({
  open, hasPassword, onClose,
}: {
  open: boolean
  hasPassword: boolean
  onClose: () => void
}) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [err, setErr]           = useState('')
  const [busy, setBusy]         = useState(false)

  const ready = confirm.trim().toUpperCase() === 'DELETE' && (!hasPassword || password.length > 0)

  async function submit() {
    setErr(''); setBusy(true)
    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, confirm: true }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(data.error ?? 'Could not delete account'); setBusy(false); return }
      await signOut({ callbackUrl: '/signup' })
    } catch {
      setErr('Something went wrong'); setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Delete account">
      <div className="space-y-4">
        <div className="flex gap-2.5 rounded-xl px-3.5 py-3" style={{ background: 'var(--red-a)', border: '1px solid var(--red-b)' }}>
          <AlertTriangle size={16} style={{ color: 'var(--red)', flexShrink: 0, marginTop: 1 }} />
          <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            This is permanent. Your profile, follows, saves, votes and team memberships will be erased and can’t be recovered.
          </p>
        </div>
        {err && <ErrorNote>{err}</ErrorNote>}
        {hasPassword && (
          <TextField label="Password" type="password" value={password} onChange={setPassword} autoFocus />
        )}
        <TextField label='Type "DELETE" to confirm' value={confirm} onChange={setConfirm} placeholder="DELETE" />
        <GoldButton danger onClick={submit} disabled={!ready || busy}>
          {busy ? 'Deleting…' : 'Delete my account'}
        </GoldButton>
        <GhostButton onClick={onClose} disabled={busy}>Keep my account</GhostButton>
      </div>
    </Modal>
  )
}

// ── Small shared error note ───────────────────────────────────────────────────

function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="px-3 py-2.5 rounded-xl text-[12px]"
      style={{ background: 'var(--red-a)', border: '1px solid var(--red-b)', color: 'var(--red)' }}
    >
      {children}
    </div>
  )
}
