import { useSyncExternalStore } from 'react'

type Scheme = 'light' | 'dark'

const query = '(prefers-color-scheme: dark)'

function subscribe(onChange: () => void) {
  const media = matchMedia(query)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

function readToken(token: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(token).trim()
}

const readers: Record<Scheme, (token: string) => string> = {
  light: (token) => readToken(token),
  dark: (token) => readToken(token),
}

export function useTheme(): (token: string) => string {
  const scheme = useSyncExternalStore<Scheme>(
    subscribe,
    () => (matchMedia(query).matches ? 'dark' : 'light'),
    () => 'light',
  )
  return readers[scheme]
}
