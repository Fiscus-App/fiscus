'use client'

import { useEffect, useState } from 'react'
import {
  Bell, BellOff, Video, FileText, TrendingUp, TrendingDown,
  Zap, Landmark, CalendarClock, Users, Mail, Megaphone, Smartphone,
} from 'lucide-react'
import {
  SettingsScaffold, Group, ToggleRow, Segmented, Banner,
} from '@/components/settings/ui'
import {
  getNotificationPrefs, setNotificationPrefs, type NotificationPrefs,
  getPushPermission, systemSettingsHint, type PushPermission,
} from '@/lib/settings'
import {
  subscribeToPush, unsubscribeFromPush, syncNotificationPrefs, pushSupported,
} from '@/lib/push'

export default function NotificationsSettingsPage() {
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null)
  const [perm, setPerm]   = useState<PushPermission>('default')
  const [busy, setBusy]   = useState(false)
  const [note, setNote]   = useState('')

  useEffect(() => {
    const local = getNotificationPrefs()
    setPrefs(local)
    setPerm(pushSupported() ? getPushPermission() : 'unsupported')
    // Mirror on-device prefs to the server so the alert engine can respect them.
    syncNotificationPrefs(local)
  }, [])

  function update<K extends keyof NotificationPrefs>(key: K, value: NotificationPrefs[K]) {
    setPrefs((prev) => {
      if (!prev) return prev
      const next = { ...prev, [key]: value }
      setNotificationPrefs(next)
      syncNotificationPrefs(next)
      return next
    })
  }

  async function enablePush() {
    setBusy(true)
    setNote('')
    const result = await subscribeToPush()
    setPerm(pushSupported() ? getPushPermission() : 'unsupported')
    setBusy(false)
    if (result.ok) { update('pushEnabled', true); return }
    if (result.reason === 'denied') { setPerm('denied'); return }
    if (result.reason === 'no-vapid')          setNote('Push isn’t set up yet — add your VAPID key, then try again.')
    else if (result.reason === 'unsupported')  setNote('This browser doesn’t support push notifications.')
    else if (result.reason === 'save-failed')  setNote('Couldn’t save your subscription. Please try again.')
  }

  async function togglePush() {
    if (!prefs) return
    if (prefs.pushEnabled) {
      await unsubscribeFromPush()
      update('pushEnabled', false)
    } else {
      const r = await subscribeToPush()
      if (r.ok) update('pushEnabled', true)
    }
  }

  if (!prefs) return null

  const pushOn = perm === 'granted' && prefs.pushEnabled

  return (
    <SettingsScaffold eyebrow="Settings" title="Notifications">
      {/* ── Push status card ─────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-4 mb-6"
        style={{
          background: pushOn
            ? 'linear-gradient(135deg, rgba(34,212,138,0.10) 0%, rgba(34,212,138,0.03) 100%)'
            : 'linear-gradient(135deg, rgba(232,184,75,0.10) 0%, rgba(232,184,75,0.03) 100%)',
          border: `1px solid ${pushOn ? 'rgba(34,212,138,0.25)' : 'rgba(232,184,75,0.22)'}`,
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{
              width: 42, height: 42, borderRadius: 12,
              background: pushOn ? 'rgba(34,212,138,0.12)' : 'rgba(232,184,75,0.12)',
              border: `1px solid ${pushOn ? 'rgba(34,212,138,0.3)' : 'rgba(232,184,75,0.28)'}`,
            }}
          >
            {pushOn
              ? <Bell size={18} strokeWidth={2} style={{ color: 'var(--green)' }} />
              : <BellOff size={18} strokeWidth={2} style={{ color: 'var(--gold)' }} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-serif font-semibold text-[15px]">
              {pushOn ? 'Push notifications are on' : 'Push notifications are off'}
            </div>
            <p className="text-[11.5px] mt-0.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              {perm === 'unsupported'
                ? 'This browser doesn’t support push notifications.'
                : perm === 'denied'
                ? 'Notifications are blocked. Turn them on for Fiscus in your device settings.'
                : pushOn
                ? 'You’ll get real-time alerts on this device based on the choices below.'
                : 'Enable push to receive alerts even when Fiscus isn’t open.'}
            </p>

            {/* Action */}
            {perm === 'default' && (
              <button
                onClick={enablePush}
                disabled={busy}
                className="mt-3 px-3.5 py-1.5 rounded-xl text-[11px] font-bold inline-flex items-center gap-1.5"
                style={{ background: 'linear-gradient(135deg, #e8b84b 0%, #f5cc5a 100%)', color: '#05081a' }}
              >
                <Smartphone size={11} strokeWidth={2.5} />
                {busy ? 'Requesting…' : 'Enable push'}
              </button>
            )}

            {perm === 'granted' && (
              <button
                onClick={togglePush}
                className="mt-3 px-3.5 py-1.5 rounded-xl text-[11px] font-bold inline-flex items-center gap-1.5"
                style={{
                  background: prefs.pushEnabled ? 'var(--bg-3)' : 'linear-gradient(135deg, #e8b84b 0%, #f5cc5a 100%)',
                  color: prefs.pushEnabled ? 'var(--text-secondary)' : '#05081a',
                  border: prefs.pushEnabled ? '1px solid var(--line-2)' : 'none',
                }}
              >
                {prefs.pushEnabled ? 'Pause push on this device' : 'Resume push'}
              </button>
            )}

            {perm === 'denied' && (
              <div
                className="mt-3 rounded-xl px-3 py-2 text-[11px] leading-relaxed"
                style={{ background: 'var(--bg-3)', border: '1px solid var(--line)', color: 'var(--text-secondary)' }}
              >
                <span style={{ color: 'var(--text-muted)' }}>To turn alerts back on: </span>
                {systemSettingsHint()}
              </div>
            )}

            {note && (
              <p className="mt-2 text-[11px] leading-relaxed" style={{ color: 'var(--gold)' }}>{note}</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Following ────────────────────────────────────────────────────── */}
      <Group label="From accounts you follow" footer="Alerts when stocks, sectors and sources you follow publish something new.">
        <ToggleRow
          icon={Video} label="New video briefings"
          sub="When a follow drops a new briefing"
          checked={prefs.followNewVideo} onChange={(v) => update('followNewVideo', v)}
        />
        <ToggleRow
          icon={FileText} label="New articles"
          sub="Fresh coverage matching your follows"
          checked={prefs.followNewArticle} onChange={(v) => update('followNewArticle', v)}
        />
      </Group>

      {/* ── Price alerts ─────────────────────────────────────────────────── */}
      <Group label="Price movements">
        <ToggleRow
          icon={TrendingUp} iconColor="var(--green)" label="Price rises"
          sub="A followed stock or index jumps"
          checked={prefs.stockMovesUp} onChange={(v) => update('stockMovesUp', v)}
        />
        <ToggleRow
          icon={TrendingDown} iconColor="var(--red)" label="Price drops"
          sub="A followed stock or index falls"
          checked={prefs.stockMovesDown} onChange={(v) => update('stockMovesDown', v)}
        />
      </Group>

      <div className="mb-6 -mt-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] font-mono mb-2 px-1" style={{ color: 'var(--text-muted)' }}>
          Alert me on moves of at least
        </p>
        <Segmented
          value={String(prefs.moveThreshold) as '2' | '5' | '10'}
          onChange={(v) => update('moveThreshold', Number(v) as 2 | 5 | 10)}
          options={[{ value: '2', label: '2%' }, { value: '5', label: '5%' }, { value: '10', label: '10%' }]}
        />
      </div>

      {/* ── Markets & macro ──────────────────────────────────────────────── */}
      <Group label="Markets & macro">
        <ToggleRow
          icon={Zap} iconColor="var(--gold)" label="Breaking news"
          sub="Major market-moving headlines"
          checked={prefs.breakingNews} onChange={(v) => update('breakingNews', v)}
        />
        <ToggleRow
          icon={Landmark} label="RBA & rate decisions"
          sub="Cash rate and monetary policy"
          checked={prefs.rbaAnnouncements} onChange={(v) => update('rbaAnnouncements', v)}
        />
        <ToggleRow
          icon={CalendarClock} label="Weekly digest"
          sub="Your week in markets, every Sunday"
          checked={prefs.weeklyDigest} onChange={(v) => update('weeklyDigest', v)}
        />
      </Group>

      {/* ── Teams ────────────────────────────────────────────────────────── */}
      <Group label="Teams">
        <ToggleRow
          icon={Users} label="Team activity"
          sub="Shares and messages in your teams"
          checked={prefs.teamActivity} onChange={(v) => update('teamActivity', v)}
        />
      </Group>

      {/* ── Email ────────────────────────────────────────────────────────── */}
      <Group label="Email" footer="Sent to your account email. You can unsubscribe at any time.">
        <ToggleRow
          icon={Mail} label="Email briefings"
          sub="A daily roundup in your inbox"
          checked={prefs.emailBriefings} onChange={(v) => update('emailBriefings', v)}
        />
        <ToggleRow
          icon={Megaphone} label="Product & feature news"
          sub="Occasional updates from Fiscus"
          checked={prefs.emailProduct} onChange={(v) => update('emailProduct', v)}
        />
      </Group>

      <Banner icon={Bell} tone="gold">
        Notification delivery is managed by your device. The master on/off switch lives in your phone or browser settings — these controls choose <em>which</em> alerts you want.
      </Banner>
    </SettingsScaffold>
  )
}
