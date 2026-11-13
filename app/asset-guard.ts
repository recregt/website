import { createContext } from 'react'

// Browsers hide a nonce attribute once the page loads, but the property keeps it, so the
// client can hydrate with the same nonce the server rendered.
const renderedNonce =
  typeof document === 'undefined'
    ? undefined
    : document.querySelector<HTMLScriptElement>('script[nonce]')?.nonce || undefined

export const NonceContext = createContext<string | undefined>(renderedNonce)

function reloadOnAssetFailure() {
  const key = 'asset-reload'
  let failed = false

  const isAsset = (target: EventTarget | null) => {
    if (target instanceof HTMLScriptElement) return !target.src || isOwnAsset(target.src)
    if (target instanceof HTMLLinkElement) return isOwnAsset(target.href)
    return false
  }
  const isOwnAsset = (url: string) => url.startsWith(`${location.origin}/assets/`)

  addEventListener(
    'error',
    (event) => {
      if (!isAsset(event.target)) return
      failed = true
      const page = `${location.pathname}${location.search}`
      try {
        if (sessionStorage.getItem(key) === page) return
        sessionStorage.setItem(key, page)
      } catch {
        return
      }
      location.reload()
    },
    true,
  )

  addEventListener('load', () => {
    if (failed) return
    try {
      sessionStorage.removeItem(key)
    } catch {
      return
    }
  })
}

export const assetGuard = `(${reloadOnAssetFailure.toString()})()`
