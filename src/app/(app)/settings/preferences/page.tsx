'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Play, Captions, Sparkles, Gauge, Layers, Check } from 'lucide-react'
import { SettingsScaffold, Group, ToggleRow, Segmented, Row } from '@/components/settings/ui'
import {
  getFeedPrefs, setFeedPrefs, type FeedPrefs,
} from '@/lib/settings'
import {
  getLocalFollows, setLocalFollows, isFollowing, toggleFollow, syncFollowToAPI,
  FOLLOW_CATALOGUE, type Follow,
} from '@/lib/following'

const SECTORS = FOLLOW_CATALOGUE.sectors as Follow[]

export default function PreferencesSettingsPage() {
  const router = useRouter()
  const [prefs, setPrefs]     = useState<FeedPrefs | null>(null)
  const [follows, setFollows] = useState<Follow[]>([])

  useEffect(() => {
    setPrefs(getFeedPrefs())
    setFollows(getLocalFollows())
  }, [])

  function update<K extends keyof FeedPrefs>(key: K, value: FeedPrefs[K]) {
    setPrefs((prev) => {
      if (!prev) return prev
      const next = { ...prev, [key]: value }
      setFeedPrefs(next)
      return next
    })
  }

  const toggleTopic = useCallback((item: Follow) => {
    setFollows((prev) => {
      const wasFollowing = isFollowing(prev, item.type, item.value)
      const next = toggleFollow(prev, item)
      setLocalFollows(next)
      syncFollowToAPI(item, wasFollowing ? 'remove' : 'add')
      return next
    })
  }, [])

  if (!prefs) return null

  const sectorFollowCount = follows.filter((f) => f.type === 'SECTOR').length

  return (
    <SettingsScaffold eyebrow="Settings" title="Preferences">
      {/* ── Feed topics ──────────────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[9px] font-bold uppercase tracking-[0.18em] font-mono" style={{ color: 'var(--text-muted)' }}>
            Feed topics
          </span>
          <div className="flex-1 h-px" style={{ background: 'var(--line)' }} />
          <span className="text-[9px] font-mono" style={{ color: 'var(--text-faint)' }}>
            {sectorFollowCount} selected
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {SECTORS.map((s) => {
            const on = isFollowing(follows, s.type, s.value)
            const color = s.meta?.sectorColor ?? 'var(--gold)'
            return (
              <button
                key={s.value}
                onClick={() => toggleTopic(s)}
                className="flex items-center gap-1.5 rounded-full pl-2.5 pr-3 py-1.5 text-[12px] font-semibold transition-all"
                style={{
                  background: on ? `${color}1c` : 'var(--bg-2)',
                  border: `1px solid ${on ? color : 'var(--line)'}`,
                  color: on ? '#fff' : 'var(--text-muted)',
                }}
              >
                <span
                  className="flex items-center justify-center"
                  style={{ width: 14, height: 14, borderRadius: '50%', background: on ? color : 'var(--bg-4)' }}
                >
                  {on && <Check size={9} strokeWidth={3} style={{ color: '#05081a' }} />}
                </span>
                {s.label}
              </button>
            )
          })}
        </div>
        <p className="text-[10.5px] mt-2.5 px-1 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Pick the sectors you want surfaced in your feed. These shape your personalised briefings.
        </p>
      </div>

      {/* ── Manage full following ────────────────────────────────────────── */}
      <Group label="Following">
        <Row
          icon={Layers} label="Manage stocks & sources"
          sub={`${follows.length} ${follows.length === 1 ? 'item' : 'items'} followed`}
          chevron
          onClick={() => router.push('/profile?tab=following')}
        />
      </Group>

      {/* ── Default view ─────────────────────────────────────────────────── */}
      <div className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] font-mono mb-2 px-1" style={{ color: 'var(--text-muted)' }}>
          Open feed on
        </p>
        <Segmented
          value={prefs.defaultTab}
          onChange={(v) => update('defaultTab', v)}
          options={[{ value: 'forYou', label: 'For You' }, { value: 'following', label: 'Following' }]}
        />
      </div>

      {/* ── Briefing length ──────────────────────────────────────────────── */}
      <div className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] font-mono mb-2 px-1" style={{ color: 'var(--text-muted)' }}>
          Briefing depth
        </p>
        <Segmented
          value={prefs.briefingLength}
          onChange={(v) => update('briefingLength', v)}
          options={[
            { value: 'quick', label: 'Quick' },
            { value: 'standard', label: 'Standard' },
            { value: 'deep', label: 'Deep dive' },
          ]}
        />
      </div>

      {/* ── Region ───────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] font-mono mb-2 px-1" style={{ color: 'var(--text-muted)' }}>
          Market focus
        </p>
        <Segmented
          value={prefs.region}
          onChange={(v) => update('region', v)}
          options={[{ value: 'au', label: '🇦🇺 Australia' }, { value: 'global', label: '🌐 Global' }]}
        />
      </div>

      {/* ── Playback & layout ────────────────────────────────────────────── */}
      <Group label="Playback & display">
        <ToggleRow
          icon={Play} label="Autoplay briefings"
          sub="Start the next briefing automatically"
          checked={prefs.autoplay} onChange={(v) => update('autoplay', v)}
        />
        <ToggleRow
          icon={Captions} label="Captions by default"
          sub="Show on-screen text on every briefing"
          checked={prefs.captionsDefault} onChange={(v) => update('captionsDefault', v)}
        />
        <ToggleRow
          icon={Sparkles} label="Reduce motion"
          sub="Calmer animations and transitions"
          checked={prefs.reduceMotion} onChange={(v) => update('reduceMotion', v)}
        />
        <ToggleRow
          icon={Gauge} label="Data saver"
          sub="Lower-resolution media on mobile data"
          checked={prefs.dataSaver} onChange={(v) => update('dataSaver', v)}
        />
      </Group>
    </SettingsScaffold>
  )
}
