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

type Battery = { level: number; charging: boolean; chargingTime: number; dischargingTime: number }

type ExtendedNavigator = Navigator & {
  userAgentData?: UserAgentData
  keyboard?: { getLayoutMap(): Promise<Map<string, string>> }
  getBattery?: () => Promise<Battery>
  deviceMemory?: number
  brave?: { isBrave(): Promise<boolean> }
  gpu?: {
    requestAdapter(options?: { powerPreference?: 'low-power' | 'high-performance' }): Promise<{
      info?: { vendor: string; architecture: string }
    } | null>
  }
}

type ExtendedScreen = Screen & {
  isExtended?: boolean
  availTop?: number
  availLeft?: number
  top?: number
  left?: number
}

type WeekLocale = Intl.Locale & {
  getWeekInfo?: () => { firstDay: number }
  weekInfo?: { firstDay: number }
}

type Wallet = {
  isMetaMask?: boolean
  isCoinbaseWallet?: boolean
  isBraveWallet?: boolean
  isRabby?: boolean
}

export type FontHint = 'developer' | 'office' | 'adobe' | 'latex'
export type ExtensionKind = 'developer' | 'wallet' | 'writing' | 'reading'
export type ScrollDevice = 'trackpad' | 'mouse wheel'
export type Adapter = { vendor: string; architecture: string }
export type Addresses = { public: string[]; localHidden: boolean }

export type BrowserSignals = {
  timezone: string
  hour: number
  time: string
  hourCycle: string | null
  languages: string[]
  screen: { width: number; height: number; pixelRatio: number; wideGamut: boolean; hdr: boolean }
  extendedDisplay: boolean | null
  refreshHz: number | null
  taskbar: {
    name: 'Dock' | 'taskbar'
    side: 'top' | 'bottom' | 'left' | 'right' | null
    size: number
  } | null
  window: { maximized: boolean; share: number } | null
  touchPoints: number
  pointers: { fine: boolean; coarse: boolean }
  cores: number | null
  memoryGb: number | null
  gpu: string | null
  battery: { level: number; charging: boolean; minutesLeft: number | null } | null
  keyboard: string | null
  os: string | null
  model: string | null
  mobile: boolean | null
  architecture: string | null
  browser: string | null
  brave: boolean
  voices: { count: number; languages: number } | null
  fonts: { name: string; hint: FontHint }[]
  extensions: { name: string; kind: ExtensionKind }[]
  adBlocker: boolean
  darkMode: boolean
  reducedMotion: boolean
  accessibility: string[]
  adapters: { integrated: Adapter | null; performance: Adapter | null }
  historyLength: number
  audio: { channels: number; sampleRateKhz: number } | null
  videoDecoding: string[] | null
  weekStart: number | null
  region: string | null
}

const fontCandidates: { name: string; hint: FontHint }[] = [
  { name: 'JetBrains Mono', hint: 'developer' },
  { name: 'Fira Code', hint: 'developer' },
  { name: 'Iosevka', hint: 'developer' },
  { name: 'Hack', hint: 'developer' },
  { name: 'Victor Mono', hint: 'developer' },
  { name: 'Century Gothic', hint: 'office' },
  { name: 'Gill Sans MT', hint: 'office' },
  { name: 'Tw Cen MT', hint: 'office' },
  { name: 'Rockwell', hint: 'office' },
  { name: 'Bookman Old Style', hint: 'office' },
  { name: 'Myriad Pro', hint: 'adobe' },
  { name: 'Minion Pro', hint: 'adobe' },
  { name: 'Adobe Garamond Pro', hint: 'adobe' },
  { name: 'Latin Modern Roman', hint: 'latex' },
  { name: 'CMU Serif', hint: 'latex' },
]

const videoCodecs = [
  { name: 'AV1', contentType: 'video/mp4; codecs="av01.0.08M.08"' },
  { name: 'HEVC', contentType: 'video/mp4; codecs="hvc1.1.6.L120.90"' },
  { name: 'VP9', contentType: 'video/webm; codecs="vp09.00.40.08"' },
]

const sampleVideo = { width: 1920, height: 1080, bitrate: 8_000_000, framerate: 30 }

const accessibilitySettings = [
  { name: 'High contrast', query: '(prefers-contrast: more)' },
  { name: 'Forced colors', query: '(forced-colors: active)' },
  { name: 'Reduced transparency', query: '(prefers-reduced-transparency: reduce)' },
  { name: 'Inverted colors', query: '(inverted-colors: inverted)' },
]

const stunServer = 'stun:stun.cloudflare.com:3478'

const commonRefreshRates = [30, 48, 50, 60, 75, 90, 100, 120, 144, 165, 180, 240, 360]
const refreshSamples = 30
const wheelSamples = 3

export async function readBrowser(): Promise<BrowserSignals> {
  const nav = navigator as ExtendedNavigator
  const now = new Date()
  const format = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })
  const fine = matchMedia('(any-pointer: fine)').matches
  const coarse = matchMedia('(any-pointer: coarse)').matches
  const [highEntropy, battery, keyboard, adBlocker, refreshHz, brave, videoDecoding, adapters] =
    await Promise.all([
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
      detectAdBlocker(),
      measureRefreshRate(),
      nav.brave?.isBrave().catch(() => false) ?? false,
      readVideoDecoding(),
      readAdapters(nav),
    ])
  const os = describeOs(nav.userAgentData?.platform ?? null, highEntropy?.platformVersion ?? null)
  const desktop = fine && !nav.userAgentData?.mobile
  const locale = new Intl.Locale(navigator.language).maximize() as WeekLocale
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
    extendedDisplay: (screen as ExtendedScreen).isExtended ?? null,
    refreshHz,
    taskbar: desktop ? readTaskbar(os ?? navigator.userAgent) : null,
    window: desktop
      ? {
          maximized: outerWidth >= screen.availWidth && outerHeight >= screen.availHeight,
          share: Math.round(
            ((outerWidth * outerHeight) / (screen.availWidth * screen.availHeight)) * 100,
          ),
        }
      : null,
    touchPoints: navigator.maxTouchPoints,
    pointers: { fine, coarse },
    cores: navigator.hardwareConcurrency || null,
    memoryGb: nav.deviceMemory ?? null,
    gpu: readGpu(),
    battery: battery
      ? {
          level: battery.level,
          charging: battery.charging,
          minutesLeft: minutes(battery.charging ? battery.chargingTime : battery.dischargingTime),
        }
      : null,
    keyboard,
    os,
    model: highEntropy?.model || null,
    mobile: nav.userAgentData?.mobile ?? null,
    architecture: highEntropy?.architecture
      ? `${highEntropy.architecture}${highEntropy.bitness ? ` ${highEntropy.bitness}-bit` : ''}`
      : null,
    browser: describeBrowser(highEntropy?.fullVersionList ?? nav.userAgentData?.brands ?? null),
    brave,
    voices: readVoices(),
    fonts: fontCandidates.filter((font) => fontInstalled(font.name)),
    extensions: detectExtensions(),
    adBlocker,
    darkMode: matchMedia('(prefers-color-scheme: dark)').matches,
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    accessibility: accessibilitySettings
      .filter((setting) => matchMedia(setting.query).matches)
      .map((setting) => setting.name),
    adapters,
    historyLength: history.length,
    audio: readAudio(),
    videoDecoding,
    weekStart: (locale.getWeekInfo?.() ?? locale.weekInfo)?.firstDay ?? null,
    region: locale.region ?? null,
  }
}

export function listenForVoices(onChange: (voices: BrowserSignals['voices']) => void): () => void {
  if (!('speechSynthesis' in window)) return () => {}
  const update = () => onChange(readVoices())
  speechSynthesis.addEventListener('voiceschanged', update)
  return () => speechSynthesis.removeEventListener('voiceschanged', update)
}

export function discoverAddresses(onDone: (addresses: Addresses | null) => void): () => void {
  if (!('RTCPeerConnection' in window)) {
    onDone(null)
    return () => {}
  }
  const connection = new RTCPeerConnection({ iceServers: [{ urls: stunServer }] })
  const found = new Set<string>()
  let localHidden = false
  let finished = false
  const finish = () => {
    if (finished) return
    finished = true
    connection.close()
    onDone({ public: [...found], localHidden })
  }
  connection.addEventListener('icecandidate', (event) => {
    if (!event.candidate) {
      finish()
      return
    }
    const { address, type } = event.candidate
    if (type === 'srflx' && address) found.add(address)
    if (type === 'host' && address?.endsWith('.local')) localHidden = true
  })
  connection.createDataChannel('')
  connection
    .createOffer()
    .then((offer) => connection.setLocalDescription(offer))
    .catch(finish)
  return () => {
    finished = true
    connection.close()
  }
}

async function readAdapters(nav: ExtendedNavigator): Promise<BrowserSignals['adapters']> {
  const read = async (powerPreference: 'low-power' | 'high-performance') => {
    const adapter = await nav.gpu?.requestAdapter({ powerPreference }).catch(() => null)
    const info = adapter?.info
    return info && (info.vendor || info.architecture)
      ? { vendor: info.vendor, architecture: info.architecture }
      : null
  }
  const [integrated, performance] = await Promise.all([read('low-power'), read('high-performance')])
  return { integrated, performance }
}

export function listenForScrolling(onDetect: (device: ScrollDevice) => void): () => void {
  const events: WheelEvent[] = []
  const handle = (event: WheelEvent) => {
    events.push(event)
    if (events.length < wheelSamples) return
    window.removeEventListener('wheel', handle)
    const first = events[0] as WheelEvent
    const steady = events.every(
      (e) =>
        e.deltaX === 0 &&
        e.deltaMode === first.deltaMode &&
        Math.abs(e.deltaY) === Math.abs(first.deltaY),
    )
    onDetect(steady ? 'mouse wheel' : 'trackpad')
  }
  window.addEventListener('wheel', handle, { passive: true })
  return () => window.removeEventListener('wheel', handle)
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

async function measureRefreshRate(): Promise<number | null> {
  const stamps: number[] = []
  await new Promise<void>((resolve) => {
    const tick = (time: number) => {
      stamps.push(time)
      if (stamps.length > refreshSamples) resolve()
      else requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
  const gaps = stamps
    .slice(1)
    .map((time, i) => time - (stamps[i] as number))
    .sort((a, b) => a - b)
  const median = gaps[Math.floor(gaps.length / 2)]
  if (!median) return null
  const hz = 1000 / median
  return commonRefreshRates.reduce((best, rate) =>
    Math.abs(rate - hz) < Math.abs(best - hz) ? rate : best,
  )
}

function readTaskbar(os: string): BrowserSignals['taskbar'] {
  const s = screen as ExtendedScreen
  const top = (s.availTop ?? 0) - (s.top ?? 0)
  const left = (s.availLeft ?? 0) - (s.left ?? 0)
  const insets = {
    top,
    left,
    bottom: s.height - s.availHeight - top,
    right: s.width - s.availWidth - left,
  }
  if (Object.values(insets).some((inset) => inset < 0 || inset >= s.height / 2)) return null
  const mac = os.includes('mac') || os.includes('Mac')
  const candidates = Object.entries(insets).filter(([side]) => !(mac && side === 'top'))
  const [side, size] = candidates.reduce((best, entry) => (entry[1] > best[1] ? entry : best))
  if (size === 0 && /linux/i.test(os)) return null
  return {
    name: mac ? 'Dock' : 'taskbar',
    side: size > 0 ? (side as 'top' | 'bottom' | 'left' | 'right') : null,
    size,
  }
}

function detectExtensions(): BrowserSignals['extensions'] {
  const page = window as unknown as Record<string, unknown>
  const found: BrowserSignals['extensions'] = []
  const reactHook = page.__REACT_DEVTOOLS_GLOBAL_HOOK__ as { checkDCE?: unknown } | undefined
  if (typeof reactHook?.checkDCE === 'function')
    found.push({ name: 'React Developer Tools', kind: 'developer' })
  if (page.__VUE_DEVTOOLS_GLOBAL_HOOK__) found.push({ name: 'Vue.js devtools', kind: 'developer' })
  if (page.__REDUX_DEVTOOLS_EXTENSION__) found.push({ name: 'Redux DevTools', kind: 'developer' })
  const wallet = page.ethereum as Wallet | undefined
  if (wallet) {
    const name = wallet.isBraveWallet
      ? 'Brave Wallet'
      : wallet.isRabby
        ? 'Rabby'
        : wallet.isCoinbaseWallet
          ? 'Coinbase Wallet'
          : wallet.isMetaMask
            ? 'MetaMask'
            : 'a crypto wallet'
    found.push({ name, kind: 'wallet' })
  }
  if (page.phantom) found.push({ name: 'Phantom', kind: 'wallet' })
  if (
    document.body.hasAttribute('data-gr-ext-installed') ||
    document.querySelector('grammarly-desktop-integration')
  )
    found.push({ name: 'Grammarly', kind: 'writing' })
  if (
    document.querySelector('meta[name="darkreader"]') ||
    document.documentElement.hasAttribute('data-darkreader-scheme')
  )
    found.push({ name: 'Dark Reader', kind: 'reading' })
  return found
}

function readAudio(): BrowserSignals['audio'] {
  if (!('AudioContext' in window)) return null
  const context = new AudioContext()
  const audio = {
    channels: context.destination.maxChannelCount,
    sampleRateKhz: context.sampleRate / 1000,
  }
  void context.close()
  return audio
}

async function readVideoDecoding(): Promise<string[] | null> {
  if (!navigator.mediaCapabilities) return null
  const results = await Promise.all(
    videoCodecs.map(async (codec) => {
      const info = await navigator.mediaCapabilities
        .decodingInfo({
          type: 'media-source',
          video: { contentType: codec.contentType, ...sampleVideo },
        })
        .catch(() => null)
      return info?.supported && info.powerEfficient ? codec.name : null
    }),
  )
  return results.filter((name): name is string => name !== null)
}

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

function minutes(seconds: number): number | null {
  return Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds / 60) : null
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
