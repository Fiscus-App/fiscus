// ── Follow types ─────────────────────────────────────────────────────────────

export type FollowType = 'STOCK' | 'SECTOR' | 'SOURCE' | 'COMPANY' | 'INDEX'

export interface Follow {
  type:  FollowType
  value: string   // ticker / sector name / source name
  label: string   // display name
  meta?: {
    sectorColor?: string
    exchange?: string
  }
}

const STORAGE_KEY = 'fiscus_follows'

// ── Local storage helpers (client-side only) ─────────────────────────────────

export function getLocalFollows(): Follow[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch { return [] }
}

export function setLocalFollows(follows: Follow[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(follows))
}

export function isFollowing(follows: Follow[], type: FollowType, value: string) {
  return follows.some(f => f.type === type && f.value === value)
}

export function toggleFollow(follows: Follow[], follow: Follow): Follow[] {
  const exists = isFollowing(follows, follow.type, follow.value)
  if (exists) return follows.filter(f => !(f.type === follow.type && f.value === follow.value))
  return [...follows, follow]
}

// ── API sync (fire and forget — localStorage is source of truth for now) ─────

export async function syncFollowToAPI(follow: Follow, action: 'add' | 'remove') {
  try {
    if (action === 'add') {
      await fetch('/api/following', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(follow),
      })
    } else {
      await fetch('/api/following', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: follow.type, value: follow.value }),
      })
    }
  } catch { /* fire and forget */ }
}

// ── Curated follow catalogue ──────────────────────────────────────────────────

export const FOLLOW_CATALOGUE = {
  stocks: [
    { type: 'STOCK' as FollowType, value: 'CBA',  label: 'Commonwealth Bank',   meta: { sectorColor: '#5b8af5' } },
    { type: 'STOCK' as FollowType, value: 'BHP',  label: 'BHP Group',           meta: { sectorColor: '#2ed494' } },
    { type: 'STOCK' as FollowType, value: 'CSL',  label: 'CSL Limited',         meta: { sectorColor: '#a78bfa' } },
    { type: 'STOCK' as FollowType, value: 'NAB',  label: 'National Australia Bank', meta: { sectorColor: '#5b8af5' } },
    { type: 'STOCK' as FollowType, value: 'WBC',  label: 'Westpac',             meta: { sectorColor: '#5b8af5' } },
    { type: 'STOCK' as FollowType, value: 'ANZ',  label: 'ANZ Group',           meta: { sectorColor: '#5b8af5' } },
    { type: 'STOCK' as FollowType, value: 'MQG',  label: 'Macquarie Group',     meta: { sectorColor: '#e8b84b' } },
    { type: 'STOCK' as FollowType, value: 'WDS',  label: 'Woodside Energy',     meta: { sectorColor: '#f97316' } },
    { type: 'STOCK' as FollowType, value: 'RIO',  label: 'Rio Tinto',           meta: { sectorColor: '#2ed494' } },
    { type: 'STOCK' as FollowType, value: 'FMG',  label: 'Fortescue',           meta: { sectorColor: '#2ed494' } },
    { type: 'STOCK' as FollowType, value: 'PLS',  label: 'Pilbara Minerals',    meta: { sectorColor: '#22d48a' } },
    { type: 'STOCK' as FollowType, value: 'WES',  label: 'Wesfarmers',          meta: { sectorColor: '#22d48a' } },
    { type: 'STOCK' as FollowType, value: 'WOW',  label: 'Woolworths',          meta: { sectorColor: '#22d48a' } },
    { type: 'STOCK' as FollowType, value: 'TLS',  label: 'Telstra',             meta: { sectorColor: '#5b8af5' } },
    { type: 'STOCK' as FollowType, value: 'GMG',  label: 'Goodman Group',       meta: { sectorColor: '#a78bfa' } },
    { type: 'STOCK' as FollowType, value: 'NXT',  label: 'NextDC',              meta: { sectorColor: '#a78bfa' } },
    { type: 'STOCK' as FollowType, value: 'XRO',  label: 'Xero',                meta: { sectorColor: '#a78bfa' } },
    { type: 'STOCK' as FollowType, value: 'AAPL', label: 'Apple',               meta: { sectorColor: '#a78bfa', exchange: 'NASDAQ' } },
    { type: 'STOCK' as FollowType, value: 'NVDA', label: 'NVIDIA',              meta: { sectorColor: '#22d48a', exchange: 'NASDAQ' } },
    { type: 'STOCK' as FollowType, value: 'MSFT', label: 'Microsoft',           meta: { sectorColor: '#5b8af5', exchange: 'NASDAQ' } },
    { type: 'STOCK' as FollowType, value: 'TSLA', label: 'Tesla',               meta: { sectorColor: '#ff4f4f', exchange: 'NASDAQ' } },
  ],
  sectors: [
    { type: 'SECTOR' as FollowType, value: 'Banking',       label: 'Banking',       meta: { sectorColor: '#5b8af5' } },
    { type: 'SECTOR' as FollowType, value: 'Mining',        label: 'Mining',        meta: { sectorColor: '#2ed494' } },
    { type: 'SECTOR' as FollowType, value: 'Energy',        label: 'Energy',        meta: { sectorColor: '#f97316' } },
    { type: 'SECTOR' as FollowType, value: 'Technology',    label: 'Technology',    meta: { sectorColor: '#a78bfa' } },
    { type: 'SECTOR' as FollowType, value: 'Healthcare',    label: 'Healthcare',    meta: { sectorColor: '#a78bfa' } },
    { type: 'SECTOR' as FollowType, value: 'Finance',       label: 'Finance',       meta: { sectorColor: '#e8b84b' } },
    { type: 'SECTOR' as FollowType, value: 'Property',      label: 'Property',      meta: { sectorColor: '#a78bfa' } },
    { type: 'SECTOR' as FollowType, value: 'Retail',        label: 'Retail',        meta: { sectorColor: '#22d48a' } },
    { type: 'SECTOR' as FollowType, value: 'Commodities',   label: 'Commodities',   meta: { sectorColor: '#e8b84b' } },
    { type: 'SECTOR' as FollowType, value: 'Lithium',       label: 'Lithium',       meta: { sectorColor: '#22d48a' } },
    { type: 'SECTOR' as FollowType, value: 'Gold',          label: 'Gold',          meta: { sectorColor: '#e8b84b' } },
    { type: 'SECTOR' as FollowType, value: 'Monetary Policy', label: 'Monetary Policy', meta: { sectorColor: '#e8b84b' } },
  ],
  sources: [
    { type: 'SOURCE' as FollowType, value: 'afr',    label: 'Australian Financial Review', meta: {} },
    { type: 'SOURCE' as FollowType, value: 'abc',    label: 'ABC News Business',           meta: {} },
    { type: 'SOURCE' as FollowType, value: 'rba',    label: 'Reserve Bank of Australia',   meta: {} },
    { type: 'SOURCE' as FollowType, value: 'asx',    label: 'ASX Announcements',           meta: {} },
    { type: 'SOURCE' as FollowType, value: 'smh',    label: 'Sydney Morning Herald',       meta: {} },
    { type: 'SOURCE' as FollowType, value: 'reuters', label: 'Reuters',                    meta: {} },
    { type: 'SOURCE' as FollowType, value: 'bloomberg', label: 'Bloomberg',                meta: {} },
    { type: 'SOURCE' as FollowType, value: 'theaustralian', label: 'The Australian',       meta: {} },
  ],
}
