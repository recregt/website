import { useEffect } from 'react'
import { useLocation } from 'react-router'

import type { Engagement } from '../../server/analytics.server'

type Vitals = Pick<Engagement, 'fcpMs' | 'lcpMs' | 'cls' | 'slowestInteractionMs'>
type Connection = { effectiveType?: string; downlink?: number; saveData?: boolean }
type LayoutShift = PerformanceEntry & { value: number; hadRecentInput: boolean }

const beacon = '/e'

let vitals: Vitals | null = null
let gpu: { vendor: string; renderer: string } | null = null
let firstView = true
let previousPath = ''

export function useEngagement() {
  const { pathname } = useLocation()

  useEffect(() => {
    vitals ??= observeVitals()
    gpu ??= graphics()
    const view = startView(pathname)
    return view.end
  }, [pathname])
}

function startView(path: string) {
  const first = firstView
  firstView = false
  const referrer = first ? document.referrer : previousPath
  previousPath = path

  const pageView = crypto.randomUUID()
  let visibleMs = 0
  let visibleSince = document.visibilityState === 'visible' ? performance.now() : null
  let scrollDepth = depth()

  const onScroll = () => {
    scrollDepth = Math.max(scrollDepth, depth())
  }
  const onVisibility = () => {
    if (document.visibilityState === 'visible') {
      visibleSince = performance.now()
      return
    }
    if (visibleSince !== null) visibleMs += performance.now() - visibleSince
    visibleSince = null
    send()
  }

  addEventListener('scroll', onScroll, { passive: true })
  addEventListener('pagehide', send)
  document.addEventListener('visibilitychange', onVisibility)

  function send() {
    const visible = visibleMs + (visibleSince === null ? 0 : performance.now() - visibleSince)
    navigator.sendBeacon(
      beacon,
      JSON.stringify(snapshot(pageView, path, referrer, first, visible, scrollDepth)),
    )
  }

  return {
    end() {
      removeEventListener('scroll', onScroll)
      removeEventListener('pagehide', send)
      document.removeEventListener('visibilitychange', onVisibility)
      send()
    },
  }
}

function snapshot(
  pageView: string,
  path: string,
  referrer: string,
  first: boolean,
  visibleMs: number,
  scrollDepth: number,
): Engagement {
  const navigation = performance
    .getEntriesByType('navigation')
    .find((entry) => entry instanceof PerformanceNavigationTiming)
  const connection = networkConnection()
  const measured = first && vitals ? vitals : null
  return {
    pageView,
    path,
    referrer,
    loadType: first ? (navigation?.type ?? '') : 'client',
    language: navigator.language,
    languages: navigator.languages.join(','),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    colorScheme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'reduce'
      : 'no-preference',
    connection: connection.effectiveType ?? '',
    gpuVendor: gpu?.vendor ?? '',
    gpuRenderer: gpu?.renderer ?? '',
    visibleMs: Math.round(visibleMs),
    scrollDepth,
    viewportWidth: innerWidth,
    viewportHeight: innerHeight,
    screenWidth: screen.width,
    screenHeight: screen.height,
    pixelRatio: devicePixelRatio,
    cpuCores: navigator.hardwareConcurrency ?? null,
    memoryGb: deviceMemory(),
    touch: navigator.maxTouchPoints > 0 ? 1 : 0,
    saveData: connection.saveData ? 1 : 0,
    downlinkMbps: connection.downlink ?? null,
    ttfbMs: first && navigation ? Math.round(navigation.responseStart) : null,
    fcpMs: measured?.fcpMs ?? null,
    lcpMs: measured?.lcpMs ?? null,
    cls: measured?.cls ?? null,
    slowestInteractionMs: measured?.slowestInteractionMs ?? null,
  }
}

function observeVitals(): Vitals {
  const measured: Vitals = { fcpMs: null, lcpMs: null, cls: 0, slowestInteractionMs: null }
  observe('paint', (entry) => {
    if (entry.name === 'first-contentful-paint') measured.fcpMs = Math.round(entry.startTime)
  })
  observe('largest-contentful-paint', (entry) => {
    measured.lcpMs = Math.round(entry.startTime)
  })
  observe('layout-shift', (entry) => {
    if (isLayoutShift(entry) && !entry.hadRecentInput)
      measured.cls = (measured.cls ?? 0) + entry.value
  })
  observe('event', (entry) => {
    measured.slowestInteractionMs = Math.max(
      measured.slowestInteractionMs ?? 0,
      Math.round(entry.duration),
    )
  })
  return measured
}

function observe(type: string, handle: (entry: PerformanceEntry) => void) {
  if (!PerformanceObserver.supportedEntryTypes.includes(type)) return
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) handle(entry)
  }).observe({ type, buffered: true })
}

function isLayoutShift(entry: PerformanceEntry): entry is LayoutShift {
  return 'value' in entry && 'hadRecentInput' in entry
}

function depth(): number {
  const scrollable = document.documentElement.scrollHeight
  if (scrollable <= 0) return 0
  return Math.min(100, Math.round(((scrollY + innerHeight) / scrollable) * 100))
}

function graphics(): { vendor: string; renderer: string } {
  const context = document.createElement('canvas').getContext('webgl')
  if (!context) return { vendor: '', renderer: '' }
  const unmasked = context.getExtension('WEBGL_debug_renderer_info')
  const read = (parameter: number) => String(context.getParameter(parameter) ?? '')
  const result = unmasked
    ? {
        vendor: read(unmasked.UNMASKED_VENDOR_WEBGL),
        renderer: read(unmasked.UNMASKED_RENDERER_WEBGL),
      }
    : { vendor: read(context.VENDOR), renderer: read(context.RENDERER) }
  context.getExtension('WEBGL_lose_context')?.loseContext()
  return result
}

function networkConnection(): Connection {
  return 'connection' in navigator ? (navigator.connection as Connection) : {}
}

function deviceMemory(): number | null {
  return 'deviceMemory' in navigator && typeof navigator.deviceMemory === 'number'
    ? navigator.deviceMemory
    : null
}
