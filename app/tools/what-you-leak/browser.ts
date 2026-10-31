type UserAgentData = {
  brands: { brand: string; version: string }[]
  mobile: boolean
  platform: string
  getHighEntropyValues(hints: string[]): Promise<{
    architecture?: string
    bitness?: string
    model?: string
    platformVersion?: string
    fullVersionList?: { brand: string; version: string }[]
  }>
}

type ExtendedNavigator = Navigator & {
  userAgentData?: UserAgentData
  keyboard?: { getLayoutMap(): Promise<Map<string, string>> }
  getBattery?: () => Promise<{ level: number; charging: boolean }>
  connection?: { effectiveType?: string; downlink?: number }
  deviceMemory?: number
}

export type FontHint = 'developer' | 'office' | 'adobe'

export type BrowserSignals = {
  timezone: string
  hour: number
  time: string
  hourCycle: string | null
  languages: string[]
  screen: { width: number; height: number; pixelRatio: number; wideGamut: boolean; hdr: boolean }
  extendedDisplay: boolean | null
  touchPoints: number
  cores: number | null
  memoryGb: number | null
  gpu: string | null
  battery: { level: number; charging: boolean } | null
  keyboard: string | null
  os: string | null
  model: string | null
  mobile: boolean | null
  architecture: string | null
  browser: string | null
  connection: { type: string; downlinkMbps: number | null } | null
  diskGb: number | null
  voices: { count: number; languages: number } | null
  fonts: { name: string; hint: FontHint }[]
  adBlocker: boolean
  darkMode: boolean
  reducedMotion: boolean
}

const fontCandidates: { name: string; hint: FontHint }[] = [
  { name: 'JetBrains Mono', hint: 'developer' },
  { name: 'Fira Code', hint: 'developer' },
  { name: 'Cascadia Code', hint: 'developer' },
  { name: 'Source Code Pro', hint: 'developer' },
  { name: 'Iosevka', hint: 'developer' },
  { name: 'Hack', hint: 'developer' },
  { name: 'Calibri', hint: 'office' },
  { name: 'Cambria', hint: 'office' },
  { name: 'Aptos', hint: 'office' },
  { name: 'Candara', hint: 'office' },
  { name: 'Myriad Pro', hint: 'adobe' },
  { name: 'Minion Pro', hint: 'adobe' },
  { name: 'Adobe Garamond Pro', hint: 'adobe' },
]

const chromiumQuotaShareOfDisk = 0.6

export async function readBrowser(): Promise<BrowserSignals> {
  const nav = navigator as ExtendedNavigator
  const now = new Date()
  const format = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })
  const [highEntropy, battery, keyboard, diskGb, adBlocker] = await Promise.all([
    nav.userAgentData
      ?.getHighEntropyValues([
        'architecture',
        'bitness',
        'model',
        'platformVersion',
        'fullVersionList',
      ])
      .catch(() => null) ?? null,
    nav.getBattery?.().catch(() => null) ?? null,
    readKeyboard(nav),
    readDisk(nav),
    detectAdBlocker(),
  ])
  return {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    hour: now.getHours(),
    time: format.format(now),
    hourCycle: format.resolvedOptions().hourCycle ?? null,
    languages: [...navigator.languages],
    screen: {
      width: screen.width,
      height: screen.height,
      pixelRatio: devicePixelRatio,
      wideGamut: matchMedia('(color-gamut: p3)').matches,
      hdr: matchMedia('(dynamic-range: high)').matches,
    },
    extendedDisplay: (screen as Screen & { isExtended?: boolean }).isExtended ?? null,
    touchPoints: navigator.maxTouchPoints,
    cores: navigator.hardwareConcurrency || null,
    memoryGb: nav.deviceMemory ?? null,
    gpu: readGpu(),
    battery: battery ? { level: battery.level, charging: battery.charging } : null,
    keyboard,
    os: describeOs(nav.userAgentData?.platform ?? null, highEntropy?.platformVersion ?? null),
    model: highEntropy?.model || null,
    mobile: nav.userAgentData?.mobile ?? null,
    architecture: highEntropy?.architecture
      ? `${highEntropy.architecture}${highEntropy.bitness ? ` ${highEntropy.bitness}-bit` : ''}`
      : null,
    browser: describeBrowser(highEntropy?.fullVersionList ?? nav.userAgentData?.brands ?? null),
    connection: nav.connection?.effectiveType
      ? { type: nav.connection.effectiveType, downlinkMbps: nav.connection.downlink ?? null }
      : null,
    diskGb,
    voices: readVoices(),
    fonts: fontCandidates.filter((font) => fontInstalled(font.name)),
    adBlocker,
    darkMode: matchMedia('(prefers-color-scheme: dark)').matches,
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
  }
}

export function listenForVoices(onChange: (voices: BrowserSignals['voices']) => void): () => void {
  if (!('speechSynthesis' in window)) return () => {}
  const update = () => onChange(readVoices())
  speechSynthesis.addEventListener('voiceschanged', update)
  return () => speechSynthesis.removeEventListener('voiceschanged', update)
}

function readVoices(): BrowserSignals['voices'] {
  if (!('speechSynthesis' in window)) return null
  const voices = speechSynthesis.getVoices()
  if (voices.length === 0) return null
  return {
    count: voices.length,
    languages: new Set(voices.map((voice) => voice.lang.split('-')[0])).size,
  }
}

function readGpu(): string | null {
  const gl = document.createElement('canvas').getContext('webgl')
  if (!gl) return null
  const debug = gl.getExtension('WEBGL_debug_renderer_info')
  const renderer = gl.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : gl.RENDERER)
  return typeof renderer === 'string' && renderer.length > 0 ? cleanGpu(renderer) : null
}

export function cleanGpu(renderer: string): string {
  if (/SwiftShader|llvmpipe|Software/i.test(renderer)) return softwareRendering
  const inner = renderer.match(/^ANGLE \((.*)\)$/)?.[1]
  const device = inner?.split(', ')[1] ?? renderer
  return device
    .replace(/^ANGLE Metal Renderer: /, '')
    .replace(/ \(0x[0-9A-Fa-f]+\)/g, '')
    .replace(/ Direct3D.*$/, '')
    .replace(/\((R|TM)\)/g, '')
    .trim()
}

export const softwareRendering = 'Software rendering, no graphics chip'

async function readKeyboard(nav: ExtendedNavigator): Promise<string | null> {
  const map = await nav.keyboard?.getLayoutMap().catch(() => null)
  if (!map || map.size === 0) return null
  const key = (code: string) => map.get(code)
  if (key('KeyQ') === 'a') return 'AZERTY'
  if (key('KeyQ') === 'f') return 'Turkish F'
  if (key('Semicolon') === 'ş' || key('KeyI') === 'ı') return 'Turkish Q'
  if (key('KeyY') === 'z' && key('KeyZ') === 'y') return 'QWERTZ'
  if (key('KeyQ') === "'") return 'Dvorak'
  const row = ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY']
    .map((code) => key(code) ?? '')
    .join('')
  return row === 'qwerty' ? 'QWERTY' : row.toUpperCase()
}

async function readDisk(nav: ExtendedNavigator): Promise<number | null> {
  if (!nav.userAgentData || !navigator.storage?.estimate) return null
  const { quota } = await navigator.storage.estimate().catch(() => ({ quota: undefined }))
  return quota ? quota / chromiumQuotaShareOfDisk / 1e9 : null
}

async function detectAdBlocker(): Promise<boolean> {
  const bait = document.createElement('div')
  bait.className = 'ad ads adsbox ad-banner ad-placement doubleclick'
  bait.style.cssText = 'position:absolute;left:-100vw;width:1px;height:1px'
  document.body.appendChild(bait)
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  const blocked = bait.offsetHeight === 0 || getComputedStyle(bait).display === 'none'
  bait.remove()
  return blocked
}

function fontInstalled(name: string): boolean {
  const context = document.createElement('canvas').getContext('2d')
  if (!context) return false
  const sample = 'mmmmmmmmmwwwwwlli10'
  return ['monospace', 'sans-serif', 'serif'].some((fallback) => {
    context.font = `72px ${fallback}`
    const base = context.measureText(sample).width
    context.font = `72px "${name}", ${fallback}`
    return context.measureText(sample).width !== base
  })
}

function describeOs(platform: string | null, version: string | null): string | null {
  if (!platform) return null
  const major = version ? Number.parseInt(version, 10) : Number.NaN
  if (platform === 'Windows' && !Number.isNaN(major))
    return major >= 13 ? 'Windows 11' : 'Windows 10'
  if (platform === 'macOS' && version) return `macOS ${version.split('.').slice(0, 2).join('.')}`
  if (platform === 'Android' && version) return `Android ${version.split('.')[0]}`
  return platform
}

function describeBrowser(brands: { brand: string; version: string }[] | null): string | null {
  const named = brands?.find((b) => !/Not.?A.?Brand|Chromium/i.test(b.brand))
  if (!named) return null
  return `${named.brand} ${named.version.split('.')[0]}`
}
