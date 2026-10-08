import { useState, useEffect, useCallback } from 'react'

export type ThemeMode = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'claude-clone-theme'

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'dark'
}

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null
    return saved || 'dark'
  })

  const resolved = mode === 'system' ? getSystemTheme() : mode

  useEffect(() => {
    const root = document.documentElement
    if (resolved === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem(STORAGE_KEY, mode)
  }, [mode, resolved])

  // Listen to system theme changes
  useEffect(() => {
    if (mode !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      const root = document.documentElement
      root.classList.toggle('dark', mq.matches)
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [mode])

  const cycleTheme = useCallback(() => {
    setMode((prev) => (prev === 'dark' ? 'light' : prev === 'light' ? 'system' : 'dark'))
  }, [])

  return { mode, resolved, setMode, cycleTheme }
}
