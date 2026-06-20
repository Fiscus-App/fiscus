// ─────────────────────────────────────────────────────────────────────────────
// Client-side user settings (notifications, feed preferences, privacy).
// Persisted in localStorage — the same source-of-truth pattern Fiscus uses for
// Following. All helpers are SSR-safe (guard against `window` being undefined).
// ─────────────────────────────────────────────────────────────────────────────

// ── Notification preferences ──────────────────────────────────────────────────

export interface NotificationPrefs {
  /** Master in-app switch — independent of the OS/browser permission. */
  pushEnabled: boolean
  followNewVideo: boolean
  followNewArticle: boolean
  stockMovesUp: boolean
  stockMovesDown: boolean
  /** Percentage move that triggers a price alert. */
  moveThreshold: 2 | 5 | 10
  breakingNews: boolean
  rbaAnnouncements: boolean
  weeklyDigest: boolean
  teamActivity: boolean
  emailBriefings: boolean
  emailProduct: boolean
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  pushEnabled: false,
  followNewVideo: true,
  followNewArticle: true,
  stockMovesUp: true,
  stockMovesDown: true,
  moveThreshold: 5,
  breakingNews: true,
  rbaAnnouncements: true,
  weeklyDigest: true,
  teamActivity: true,
  emailBriefings: false,
  emailProduct: false,
}

// ── Feed / content preferences ────────────────────────────────────────────────

export interface FeedPrefs {
  autoplay: boolean
  defaultTab: 'forYou' | 'following'
  briefingLength: 'quick' | 'standard' | 'deep'
  region: 'au' | 'global'
  dataSaver: boolean
  reduceMotion: boolean
  captionsDefault: boolean
}

export const DEFAULT_FEED_PREFS: FeedPrefs = {
  autoplay: true,
  defaultTab: 'forYou',
  briefingLength: 'standard',
  region: 'au',
  dataSaver: false,
  reduceMotion: false,
  captionsDefault: true,
}

// ── Privacy preferences ───────────────────────────────────────────────────────

export interface PrivacyPrefs {
  privateAccount: boolean
  discoverable: boolean
  personalizedRecs: boolean
  personalizedAds: boolean
  activityStatus: boolean
  shareUsageData: boolean
  allowAnalytics: boolean
  whoCanMessage: 'everyone' | 'team' | 'none'
  whoCanSeeSaves: 'everyone' | 'team' | 'onlyMe'
}

export const DEFAULT_PRIVACY_PREFS: PrivacyPrefs = {
  privateAccount: false,
  discoverable: true,
  personalizedRecs: true,
  personalizedAds: false,
  activityStatus: true,
  shareUsageData: true,
  allowAnalytics: true,
  whoCanMessage: 'team',
  whoCanSeeSaves: 'onlyMe',
}

// ── Generic localStorage helpers ──────────────────────────────────────────────

const KEYS = {
  notif: 'fiscus_notif_prefs',
  feed: 'fiscus_feed_prefs',
  privacy: 'fiscus_privacy_prefs',
} as const

function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    // Merge so newly-added fields fall back to defaults
    return { ...fallback, ...(JSON.parse(raw) as Partial<T>) }
  } catch {
    return fallback
  }
}

function write<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* quota / private mode — ignore */
  }
}

export const getNotificationPrefs = () => read(KEYS.notif, DEFAULT_NOTIFICATION_PREFS)
export const setNotificationPrefs = (p: NotificationPrefs) => write(KEYS.notif, p)

export const getFeedPrefs = () => read(KEYS.feed, DEFAULT_FEED_PREFS)
export const setFeedPrefs = (p: FeedPrefs) => write(KEYS.feed, p)

export const getPrivacyPrefs = () => read(KEYS.privacy, DEFAULT_PRIVACY_PREFS)
export const setPrivacyPrefs = (p: PrivacyPrefs) => write(KEYS.privacy, p)

// ── Local history (client-stored) ─────────────────────────────────────────────

export function clearLocalSearchHistory(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem('fiscus_search_history')
    window.localStorage.removeItem('fiscus_recent_searches')
  } catch {
    /* ignore */
  }
}

// ── Web push permission ───────────────────────────────────────────────────────

export type PushPermission = 'granted' | 'denied' | 'default' | 'unsupported'

export function getPushPermission(): PushPermission {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission as PushPermission
}

/**
 * Request OS/browser notification permission. The browser surfaces its native
 * permission prompt (which is what hands off to the device's Settings app when
 * the user manages it). Returns the resulting permission state.
 */
export async function requestPushPermission(): Promise<PushPermission> {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return 'unsupported'
  try {
    const result = await Notification.requestPermission()
    return result as PushPermission
  } catch {
    return 'denied'
  }
}

/**
 * Best-effort guidance for re-enabling notifications once they've been blocked.
 * The browser sandbox can't deep-link into OS settings, so we return the path
 * the user should follow in their device/browser settings.
 */
export function systemSettingsHint(): string {
  if (typeof navigator === 'undefined') return 'Open your device settings to manage notifications.'
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/.test(ua)) return 'Settings → Notifications → Safari, or Settings → Fiscus.'
  if (/Android/.test(ua)) return 'Settings → Apps → Fiscus → Notifications.'
  if (/Mac/.test(ua)) return 'System Settings → Notifications → your browser.'
  return 'Open your browser site settings (lock icon → Notifications) to allow alerts.'
}
