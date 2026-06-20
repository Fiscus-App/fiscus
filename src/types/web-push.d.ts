// Minimal ambient types for the `web-push` package (which ships no types of
// its own). Covers only what Fiscus uses. If you ever `npm install
// @types/web-push`, delete this file to avoid a duplicate declaration.
declare module 'web-push' {
  interface PushSubscriptionKeys {
    p256dh: string
    auth: string
  }
  interface PushSubscription {
    endpoint: string
    keys: PushSubscriptionKeys
  }
  interface RequestOptions {
    TTL?: number
    headers?: Record<string, string>
    urgency?: 'very-low' | 'low' | 'normal' | 'high'
    topic?: string
  }
  interface SendResult {
    statusCode: number
    body: string
    headers: Record<string, string>
  }
  function setVapidDetails(subject: string, publicKey: string, privateKey: string): void
  function sendNotification(
    subscription: PushSubscription,
    payload?: string | Buffer | null,
    options?: RequestOptions,
  ): Promise<SendResult>

  const webpush: {
    setVapidDetails: typeof setVapidDetails
    sendNotification: typeof sendNotification
  }
  export default webpush
  export { setVapidDetails, sendNotification }
}
