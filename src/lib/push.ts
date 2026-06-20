// ─────────────────────────────────────────────────────────────────────────────
// Client-side web push helpers. Registers the service worker, subscribes the
// device with the VAPID public key, and syncs the subscription + prefs to the
// server. All functions are browser-only and guard against SSR.
// ─────────────────────────────────────────────────────────────────────────────

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    typeof Notification !== 'undefined'
  )
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null
  try {
    return await navigator.serviceWorker.register('/sw.js')
  } catch {
    return null
  }
}

export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null
  try {
    const reg = await navigator.serviceWorker.getRegistration()
    return (await reg?.pushManager.getSubscription()) ?? null
  } catch {
    return null
  }
}

export type SubscribeResult = { ok: boolean; reason?: 'unsupported' | 'no-vapid' | 'denied' | 'default' | 'no-sw' | 'save-failed' }

export async function subscribeToPush(): Promise<SubscribeResult> {
  if (!pushSupported()) return { ok: false, reason: 'unsupported' }
  if (!VAPID_PUBLIC_KEY) return { ok: false, reason: 'no-vapid' }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    return { ok: false, reason: permission === 'denied' ? 'denied' : 'default' }
  }

  const reg = (await navigator.serviceWorker.getRegistration()) ?? (await registerServiceWorker())
  if (!reg) return { ok: false, reason: 'no-sw' }
  await navigator.serviceWorker.ready

  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    })
  }

  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription: sub.toJSON(), userAgent: navigator.userAgent }),
  }).catch(() => null)

  if (!res || !res.ok) return { ok: false, reason: 'save-failed' }
  return { ok: true }
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!pushSupported()) return
  try {
    const reg = await navigator.serviceWorker.getRegistration()
    const sub = await reg?.pushManager.getSubscription()
    if (sub) {
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      }).catch(() => {})
      await sub.unsubscribe().catch(() => {})
    }
  } catch {
    /* ignore */
  }
}

/** Persist the notification toggles server-side (so the alert engine sees them). */
export async function syncNotificationPrefs(prefs: unknown): Promise<void> {
  await fetch('/api/notifications/prefs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(prefs),
  }).catch(() => {})
}
