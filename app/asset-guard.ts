import { createContext } from 'react'

export const NonceContext = createContext<string | undefined>(undefined)

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
