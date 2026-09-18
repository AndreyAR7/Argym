'use client'

import { useEffect } from 'react'

// Fire-and-forget registration for the no-op SW in public/sw.js — see that
// file for why it exists (installability only, no caching).
export function RegisterServiceWorker() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])
  return null
}
