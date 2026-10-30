import { type RefObject, useCallback, useEffect, useRef, useState } from 'react'

const script = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

let loading: Promise<Turnstile.Turnstile> | undefined

export function useTurnstile(container: RefObject<HTMLElement | null>, siteKey: string) {
  const [token, setToken] = useState<string | null>(null)
  const widget = useRef<string | null>(null)

  useEffect(() => {
    let unmounted = false
    void load().then((api) => {
      if (unmounted || !container.current) return
      widget.current =
        api.render(container.current, {
          sitekey: siteKey,
          appearance: 'interaction-only',
          callback: setToken,
          'expired-callback': () => setToken(null),
          'error-callback': () => setToken(null),
        }) ?? null
    })
    return () => {
      unmounted = true
      if (widget.current) turnstile.remove(widget.current)
      widget.current = null
    }
  }, [container, siteKey])

  const reset = useCallback(() => {
    setToken(null)
    if (widget.current) turnstile.reset(widget.current)
  }, [])

  return { token, reset }
}

function load(): Promise<Turnstile.Turnstile> {
  loading ??= new Promise((resolve, reject) => {
    const element = document.createElement('script')
    element.src = script
    element.async = true
    element.onload = () => resolve(turnstile)
    element.onerror = () => reject(new Error('turnstile failed to load'))
    document.head.appendChild(element)
  })
  return loading
}
