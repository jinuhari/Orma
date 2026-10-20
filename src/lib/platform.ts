export type Platform = 'ios' | 'android' | 'mac' | 'windows' | 'other'

export function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'other'
  const ua = navigator.userAgent
  // iPadOS reports itself as a Mac but has a touch screen.
  if (/iPhone|iPad|iPod/.test(ua) || (/Mac/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios'
  if (/Android/.test(ua)) return 'android'
  if (/Mac/.test(ua)) return 'mac'
  if (/Win/.test(ua)) return 'windows'
  return 'other'
}

// True inside an installed PWA or the desktop app, where the marketing site is not needed.
export function isStandalone() {
  if (typeof window === 'undefined') return false
  return (
    Boolean(window.ormaDesktop) ||
    Boolean(window.matchMedia?.('(display-mode: standalone)').matches) ||
    (navigator as { standalone?: boolean }).standalone === true
  )
}
