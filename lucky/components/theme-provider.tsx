'use client'

import * as React from 'react'

type Theme = 'light' | 'dark'

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
  attribute?: string
  enableSystem?: boolean
}

type ThemeContextValue = {
  resolvedTheme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null)

export function ThemeProvider({
  children,
  defaultTheme = 'light',
  storageKey = 'theme',
}: ThemeProviderProps) {
  const [resolvedTheme, setResolvedTheme] = React.useState<Theme>(defaultTheme)

  React.useEffect(() => {
    const saved = window.localStorage.getItem(storageKey)
    const next = saved === 'light' || saved === 'dark' ? saved : defaultTheme
    // localStorage는 SSR에서 접근 불가 — 마운트 후 저장된 테마 복원이 필수다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResolvedTheme(next)
  }, [defaultTheme, storageKey])

  React.useEffect(() => {
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(resolvedTheme)
    window.localStorage.setItem(storageKey, resolvedTheme)
  }, [resolvedTheme, storageKey])

  const value = React.useMemo(
    () => ({
      resolvedTheme,
      setTheme: (theme: Theme) => setResolvedTheme(theme),
    }),
    [resolvedTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return ctx
}
