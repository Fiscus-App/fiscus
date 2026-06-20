'use client'

import { useEffect } from 'react'
import { SessionProvider } from 'next-auth/react'

export function Providers({ children }: { children: React.ReactNode }) {
  // Register the push service worker once on load so it's ready when the user
  // enables notifications.
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])

  return <SessionProvider>{children}</SessionProvider>
}
