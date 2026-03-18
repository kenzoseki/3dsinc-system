'use client'

import { useEffect } from 'react'

export default function PwaRegistrar() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.warn('Service Worker não registrado:', err)
      })
    }
  }, [])

  return null
}
