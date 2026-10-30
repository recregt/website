const origin = 'http://next.invalid'

export function nextPath(value: string | null): string {
  const url = value ? URL.parse(value, origin) : null
  if (!url || url.origin !== origin) return '/'
  return `${url.pathname}${url.search}${url.hash}`
}

export function signInHref(next: string): string {
  return `/signin?next=${encodeURIComponent(next)}`
}
