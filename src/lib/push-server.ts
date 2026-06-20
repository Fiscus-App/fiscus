// ─────────────────────────────────────────────────────────────────────────────
// Server-side web push sender. Uses the `web-push` library (configure with the
// VAPID env vars). No-ops gracefully if the keys aren't set.
// ─────────────────────────────────────────────────────────────────────────────

import webpush from 'web-push'
import { db } from '@/lib/db'

export interface PushPayload {
  title: string
  body: string
  url?: string
  tag?: string
}

export function pushConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
}

let configured = false
function ensureConfigured() {
  if (configured || !pushConfigured()) return
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:support@fiscus.app',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string,
    process.env.VAPID_PRIVATE_KEY as string,
  )
  configured = true
}

/** Send a payload to every device the user has registered. Returns count sent. */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<number> {
  if (!pushConfigured()) return 0
  ensureConfigured()

  const subs = await db.pushSubscription.findMany({ where: { userId } })
  let sent = 0

  await Promise.all(
    subs.map(async (s: { endpoint: string; p256dh: string; auth: string }) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
          { TTL: 3600 },
        )
        sent++
      } catch (err) {
        const code = (err as { statusCode?: number })?.statusCode
        // 404/410 → the subscription is gone; prune it so we stop trying.
        if (code === 404 || code === 410) {
          await db.pushSubscription.delete({ where: { endpoint: s.endpoint } }).catch(() => {})
        }
      }
    }),
  )

  return sent
}
