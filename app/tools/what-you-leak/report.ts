import type { ConnectionSignals } from '../../../server/leak.server'
import {
  type Adapter,
  type Addresses,
  type BrowserSignals,
  type ExtensionKind,
  type FontHint,
  type ScrollDevice,
  softwareRendering,
} from './browser'

export type Finding = { label: string; value: string | null; hide: string; guess?: boolean }
export type Group = { title: string; empty: string; findings: Finding[] }
export type Live = { scrolling: ScrollDevice | null; addresses: Addresses | null | 'pending' }

const gpuVendors: Record<string, string> = {
  nvidia: 'NVIDIA',
  amd: 'AMD',
  intel: 'Intel',
  apple: 'Apple',
  qualcomm: 'Qualcomm',
  arm: 'Arm',
}

const anVendors = new Set(['nvidia', 'amd', 'intel', 'apple', 'arm'])
const gpuAcronyms = new Set(['rdna', 'gcn', 'lpg', 'hpg', 'lp', 'hp'])

const gpuSeries: { vendor: string; architecture: string; series: string }[] = [
  { vendor: 'nvidia', architecture: 'blackwell', series: 'RTX 50 series' },
  { vendor: 'nvidia', architecture: 'lovelace', series: 'RTX 40 series' },
  { vendor: 'nvidia', architecture: 'ampere', series: 'RTX 30 series' },
  { vendor: 'nvidia', architecture: 'turing', series: 'RTX 20 or GTX 16 series' },
  { vendor: 'nvidia', architecture: 'pascal', series: 'GTX 10 series' },
  { vendor: 'amd', architecture: 'rdna-4', series: 'Radeon RX 9000 series' },
  { vendor: 'amd', architecture: 'rdna-3', series: 'Radeon RX 7000 series' },
  { vendor: 'amd', architecture: 'rdna-2', series: 'Radeon RX 6000 series' },
  { vendor: 'amd', architecture: 'rdna-1', series: 'Radeon RX 5000 series' },
]

const macDisplays: Record<string, string> = {
  '1440x900': '13-inch MacBook',
  '1470x956': '13-inch MacBook Air',
  '1710x1107': '15-inch MacBook Air',
  '1512x982': '14-inch MacBook Pro',
  '1728x1117': '16-inch MacBook Pro',
}

const fontHintSentences: Record<FontHint, string> = {
  developer: 'Your installed fonts suggest you write code.',
  office: 'You have Microsoft Office fonts installed.',
  adobe: 'You have Adobe fonts installed, so you probably use their design apps.',
  latex: 'You have LaTeX fonts installed, so you probably write papers or technical documents.',
}

const extensionReasons: Record<ExtensionKind, string> = {
  developer: 'so you probably build websites',
  wallet: 'so you likely hold crypto',
  writing: 'to check your writing',
  reading: 'to darken the sites you read',
}

const standardRefreshHz = 60
const firstMonday = Date.UTC(2024, 0, 1)
const day = 86_400_000

const regions = new Intl.DisplayNames(['en'], { type: 'region' })
const languageNames = new Intl.DisplayNames(['en'], { type: 'language' })
const weekdays = new Intl.DateTimeFormat('en', { weekday: 'long', timeZone: 'UTC' })

export function buildStory(
  server: ConnectionSignals,
  browser: BrowserSignals,
  live: Live,
): string[] {
  return [
    [...where(server, browser), ...network(server, live)],
    machine(server, browser),
    habits(server, browser, live.scrolling),
  ]
    .map((sentences) => sentences.join(' '))
    .filter((paragraph) => paragraph.length > 0)
}

function network(server: ConnectionSignals, live: Live): string[] {
  const sentences: string[] = []
  if (server.hostname) sentences.push(`Your address has a name too: ${server.hostname}.`)
  if (live.addresses && live.addresses !== 'pending' && server.ip) {
    const family = (ip: string) => (ip.includes(':') ? 6 : 4)
    const others = live.addresses.public.filter((address) => address !== server.ip)
    const sameFamily = others.find((address) => family(address) === family(server.ip as string))
    const otherFamily = others.find((address) => family(address) !== family(server.ip as string))
    if (sameFamily) {
      sentences.push(
        `WebRTC reveals another public address, ${sameFamily}. If you use a VPN, that is probably your real one.`,
      )
    }
    if (otherFamily) {
      sentences.push(
        `WebRTC also gives away your IPv${family(otherFamily)} address, ${otherFamily}, which this page never asked for.`,
      )
    }
  }
  return sentences
}

function where(server: ConnectionSignals, browser: BrowserSignals): string[] {
  const place = placeName(server)
  const mismatch = clockMismatch(server, browser)
  const hosting = server.network === 'hosting'
  const zone = readableZone(browser.timezone)
  if (mismatch && place && server.timezone) {
    return [
      hosting && server.isp
        ? `You're connecting through ${server.isp}, a hosting network, from ${place}, but your clock is set to ${zone}. That combination usually means a VPN or proxy.`
        : `Your clock says ${browser.time}, but you're in or near ${place}, where it's ${timeIn(server.timezone)}. Your computer is set to the ${zone} time zone.`,
      ...(!hosting && server.isp ? [`Your internet comes from ${server.isp}.`] : []),
      ...(server.inEu ? ["You're in the EU, so GDPR limits what sites may do with this."] : []),
    ]
  }
  const sentences = [
    `It's ${browser.time}${twentyFourHour(browser) ? ` ${partOfDay(browser.hour)}` : ''} for you${place ? `, and you're in or near ${place}` : ''}.`,
  ]
  if (hosting && server.isp) {
    sentences.push(
      `You're connecting through ${server.isp}, a hosting network, which usually means a VPN or proxy.`,
    )
  } else if (server.isp) {
    sentences.push(
      `Your internet comes from ${server.isp}${server.network === 'mobile' ? ' over a mobile network' : ''}.`,
    )
  }
  if (server.inEu) sentences.push("You're in the EU, so GDPR limits what sites may do with this.")
  return sentences
}

function machine(server: ConnectionSignals, browser: BrowserSignals): string[] {
  const os = browser.os ?? osFromUserAgent(server.userAgent)
  const device = browser.model ?? macModel(browser, os) ?? (laptop(browser) ? 'laptop' : null)
  const sentences: string[] = []
  if (os) {
    sentences.push(
      `You're on ${os}${device ? `, likely a ${device}` : ''}${graphicsPhrase(browser.gpu)}.`,
    )
  }
  const card = secondGraphics(browser.adapters)
  if (card) sentences.push(`You also have ${card}.`)
  if (browser.screen.pixelRatio !== 1) {
    sentences.push(`Your display is ${display(browser).replace('×', ' by ')}.`)
  }
  if (browser.refreshHz && browser.refreshHz > standardRefreshHz) {
    sentences.push(`Your screen refreshes ${browser.refreshHz} times a second, faster than most.`)
  }
  if (browser.extendedDisplay) sentences.push('You have more than one screen connected.')
  if (browser.taskbar) sentences.push(taskbarSentence(browser.taskbar))
  if (browser.window) {
    sentences.push(
      browser.window.maximized
        ? 'Your browser window fills the screen.'
        : `Your browser window covers about ${browser.window.share}% of your screen.`,
    )
  }
  if (browser.battery && !batteryAmbiguous(browser.battery)) {
    sentences.push(
      `Your battery is at ${Math.round(browser.battery.level * 100)}% and ${browser.battery.charging ? 'charging' : 'not charging'}${batteryTime(browser.battery)}.`,
    )
  }
  if (browser.keyboard) sentences.push(`You type on a ${browser.keyboard} keyboard.`)
  return sentences
}

function habits(
  server: ConnectionSignals,
  browser: BrowserSignals,
  scrolling: ScrollDevice | null,
): string[] {
  const sentences: string[] = []
  if (browser.brave) sentences.push("You use Brave, even though it tells sites it's Chrome.")
  const kinds = new Set(browser.extensions.map((extension) => extension.kind))
  for (const kind of kinds) {
    const names = browser.extensions.filter((e) => e.kind === kind).map((e) => e.name)
    sentences.push(
      `You ${kind === 'writing' || kind === 'reading' ? 'use' : 'have'} ${list(names)}${kind === 'writing' || kind === 'reading' ? '' : ' installed'}, ${extensionReasons[kind]}.`,
    )
  }
  for (const hint of new Set(browser.fonts.map((font) => font.hint)))
    sentences.push(fontHintSentences[hint])
  const languages = uniqueLanguages(browser.languages)
  if (languages.length > 1) sentences.push(`You read ${list(languages)}.`)
  if (browser.darkMode) sentences.push('You prefer dark mode.')
  if (browser.accessibility.length > 0) {
    sentences.push(
      `You turned on ${list(browser.accessibility.map((name) => name.toLowerCase()))}.`,
    )
  }
  if (browser.adBlocker) sentences.push('You run an ad blocker.')
  if (server.globalPrivacyControl)
    sentences.push('Your browser asks sites not to sell or share your data.')
  if (browser.historyLength > 1)
    sentences.push(`This tab has been through ${browser.historyLength} pages so far.`)
  if (scrolling) sentences.push(`You scroll with a ${scrolling}.`)
  return sentences
}

export function connectionGroup(server: ConnectionSignals): Group {
  return {
    title: 'What your connection reveals',
    empty: 'Not available',
    findings: [
      {
        label: 'IP address',
        value: server.ip
          ? `${server.ip}${server.ipVersion ? `, IPv${server.ipVersion}` : ''}`
          : null,
        hide: 'A VPN or Tor replaces it with another address.',
      },
      {
        label: 'Name of your address',
        value: server.hostname ?? (server.ip ? 'None registered' : null),
        hide: 'Providers name their addresses, and the name often reveals the connection type or area. A VPN shows its own.',
      },
      {
        label: 'Location',
        value: join([
          server.city,
          server.region,
          server.country && regions.of(server.country),
          server.postalCode,
        ]),
        hide: 'Looked up from your IP address. A VPN or Tor changes it.',
      },
      {
        label: 'Approximate coordinates',
        value:
          server.latitude && server.longitude ? `${server.latitude}, ${server.longitude}` : null,
        hide: 'Also from your IP address, usually accurate to the city.',
      },
      {
        label: 'In the EU',
        value: server.country ? (server.inEu ? 'Yes, GDPR applies' : 'No') : null,
        hide: 'Also from your IP address.',
      },
      {
        label: 'Internet provider',
        value: server.isp
          ? `${server.isp}${server.asn ? ` (AS${server.asn})` : ''}, ${networkLabel(server.network)}`
          : null,
        hide: 'A VPN shows its own provider instead, which is recognizable as a VPN.',
      },
      {
        label: 'Timezone of your IP',
        value: server.timezone ? readableZone(server.timezone) : null,
        hide: 'Compared with your clock, it exposes VPNs that do not match your location.',
      },
      {
        label: 'Cloudflare data center',
        value: server.colo
          ? `${server.colo}${server.rttMs !== null ? `, ${server.rttMs} ms round trip` : ''}`
          : null,
        hide: 'Round trip time grows with distance, and a VPN adds its own delay. It is not measured over HTTP/3.',
      },
      {
        label: 'Connection',
        value: join([server.httpProtocol, server.tlsVersion, server.tlsCipher]),
        hide: 'The same for everyone on your browser version, so it says little on its own.',
      },
      {
        label: 'Request priority',
        value: server.priority,
        hide: 'Each browser engine prioritizes requests its own way, which can expose the real browser behind a faked user agent.',
      },
      {
        label: 'Data saver',
        value: server.saveData ? 'On' : 'Off',
        hide: 'Sent as a header when you turn on data saving.',
      },
      {
        label: 'Compression your browser accepts',
        value: server.compression.length > 0 ? server.compression.join(', ') : null,
        hide: 'Newer browsers add zstd, which narrows down your browser version.',
      },
      {
        label: 'Languages you accept',
        value: server.languages.length > 0 ? server.languages.join(', ') : null,
        hide: 'Limit your browser to a single language.',
      },
      {
        label: 'Privacy signals',
        value: `Global Privacy Control ${server.globalPrivacyControl ? 'on' : 'off'}, Do Not Track ${server.doNotTrack ? 'on' : 'off'}`,
        hide: 'Global Privacy Control is worth turning on. Most sites ignore Do Not Track.',
      },
      {
        label: 'Page you came from',
        value: server.referrer ?? 'None',
        hide: 'Sent by your browser with each click. Most browsers now trim it to the site name.',
      },
    ],
  }
}

export function browserGroup(
  server: ConnectionSignals,
  browser: BrowserSignals,
  { scrolling, addresses }: Live,
): Group {
  const os = browser.os ?? osFromUserAgent(server.userAgent)
  const mac = browser.model ? null : macModel(browser, os)
  const browserName = browser.browser ?? browserFromUserAgent(server.userAgent)
  return {
    title: 'What your browser reveals',
    empty: 'Hidden by your browser',
    findings: [
      {
        label: 'Local time',
        value: `${browser.time}, ${readableZone(browser.timezone)}, ${twentyFourHour(browser) ? '24-hour' : '12-hour'} clock`,
        hide: 'Tor Browser reports UTC. Otherwise, set your system timezone to match your VPN.',
      },
      {
        label: 'Region of your browser language',
        value: browser.region ? (regions.of(browser.region) ?? browser.region) : null,
        hide: 'Comes from your browser language, so it can differ from where you live.',
      },
      {
        label: 'Week starts on',
        value: browser.weekStart
          ? weekdays.format(firstMonday + (browser.weekStart - 1) * day)
          : null,
        hide: 'Follows your browser language. Only Chromium-based browsers and Safari report it.',
      },
      {
        label: 'Operating system',
        value: os,
        hide: 'Tor Browser reports a generic value.',
      },
      {
        label: 'Browser',
        value: browser.brave ? `Brave, identifying as ${browserName ?? 'Chrome'}` : browserName,
        hide: 'Sent with every request, so it is visible to every site.',
      },
      {
        label: 'Device model',
        value:
          browser.model ??
          mac ??
          (laptop(browser)
            ? 'A laptop, since it reports a battery'
            : browser.mobile === false
              ? 'Not reported for computers'
              : null),
        guess: Boolean(mac) || (!browser.model && laptop(browser)),
        hide: 'Phones report their model to Chromium-based browsers. Macs are guessed from the screen size, and laptops from the battery.',
      },
      {
        label: 'Graphics chip',
        value: browser.gpu,
        hide: 'Firefox and Safari report a generic name. Chromium-based browsers show the exact chip.',
      },
      {
        label: 'Graphics adapters',
        value: adapterList(browser.adapters),
        guess: Boolean(browser.adapters.performance),
        hide: 'WebGPU reports the vendor and architecture of each graphics chip, including one this page does not use. Firefox and Safari report less.',
      },
      {
        label: 'Hardware video decoding',
        value: browser.videoDecoding
          ? browser.videoDecoding.length > 0
            ? browser.videoDecoding.join(', ')
            : 'None of the formats we checked'
          : null,
        hide: 'Shows which video formats your graphics hardware can decode.',
      },
      {
        label: 'Screen',
        value: `${display(browser)}${browser.screen.wideGamut ? ', wide color' : ''}${browser.screen.hdr ? ', HDR' : ''}`,
        hide: 'Tor Browser and Firefox with fingerprinting resistance report standard sizes. Zooming the page changes the scaling we see.',
      },
      {
        label: 'Refresh rate',
        value: browser.refreshHz ? `${browser.refreshHz} Hz` : null,
        guess: true,
        hide: 'Measured from animation timing. No browser hides it.',
      },
      {
        label: 'More than one screen',
        value: browser.extendedDisplay === null ? null : browser.extendedDisplay ? 'Yes' : 'No',
        hide: 'Only Chromium-based browsers report this.',
      },
      {
        label: 'Taskbar or Dock',
        value: browser.taskbar
          ? browser.taskbar.side
            ? `${capitalize(browser.taskbar.name)} ${placement(browser.taskbar.side)}, ${browser.taskbar.size} pixels`
            : `${capitalize(browser.taskbar.name)} hidden`
          : null,
        hide: 'Read from the part of the screen windows may use. Firefox with fingerprinting resistance hides it.',
      },
      {
        label: 'Browser window',
        value: browser.window
          ? browser.window.maximized
            ? 'Fills the screen'
            : `Covers about ${browser.window.share}% of the screen`
          : null,
        hide: 'Every browser reports the window size.',
      },
      {
        label: 'Processor and memory',
        value: join([
          browser.cores ? `${browser.cores} cores` : null,
          browser.memoryGb ? `at least ${browser.memoryGb} GB of memory` : null,
          browser.architecture,
        ]),
        hide: 'Firefox with fingerprinting resistance reports fixed values. Memory is only reported by Chromium-based browsers.',
      },
      {
        label: 'Battery',
        value: browser.battery
          ? batteryAmbiguous(browser.battery)
            ? '100%, charging, or no battery at all'
            : `${Math.round(browser.battery.level * 100)}%, ${browser.battery.charging ? 'charging' : 'not charging'}${batteryTime(browser.battery)}`
          : null,
        hide: 'Firefox and Safari do not expose battery status. Desktops without a battery report a full, charging one.',
      },
      {
        label: 'Keyboard layout',
        value: browser.keyboard,
        hide: 'Only Chromium-based browsers expose this.',
      },
      {
        label: 'Pointing devices',
        value:
          join([
            browser.pointers.fine ? 'Mouse or trackpad' : null,
            browser.pointers.coarse
              ? browser.pointers.fine
                ? 'touchscreen'
                : 'Touchscreen'
              : null,
          ]) ?? 'None reported',
        hide: 'Reported by every browser.',
      },
      {
        label: 'Scrolling',
        value: scrolling ? capitalize(scrolling) : 'Scroll the page to find out',
        guess: Boolean(scrolling),
        hide: 'Scroll events reveal the device. Every browser shares them.',
      },
      {
        label: 'Public addresses seen by WebRTC',
        value:
          addresses === 'pending'
            ? 'Checking…'
            : addresses
              ? addresses.public.length > 0
                ? addresses.public.join(', ')
                : 'None found'
              : null,
        hide: `Found with a STUN request to Cloudflare. A VPN that does not cover WebRTC exposes your real address here.${addresses && addresses !== 'pending' && addresses.localHidden ? ' Your browser hides your local network address behind a random name.' : ''}`,
      },
      {
        label: 'Extensions we spotted',
        value:
          browser.extensions.length > 0
            ? browser.extensions.map((extension) => extension.name).join(', ')
            : 'None that leave traces',
        hide: 'Extensions that add objects or markers to every page can be spotted by any site.',
      },
      {
        label: 'Installed fonts we found',
        value:
          browser.fonts.length > 0
            ? browser.fonts.map((font) => font.name).join(', ')
            : 'None of the ones we checked',
        hide: 'Safari and Firefox with fingerprinting protection only reveal fonts that ship with the system.',
      },
      {
        label: 'Speech voices',
        value: browser.voices
          ? `${browser.voices.count} voices in ${browser.voices.languages} languages`
          : null,
        hide: 'Reveals installed language packs. Firefox with fingerprinting resistance hides them.',
      },
      {
        label: 'Audio output',
        value: browser.audio
          ? `${browser.audio.channels} channels at ${browser.audio.sampleRateKhz} kHz`
          : null,
        hide: 'Reported by every browser that plays sound.',
      },
      {
        label: 'Touch',
        value: browser.touchPoints > 0 ? `${browser.touchPoints} touch points` : 'No touch screen',
        hide: 'Reported by every browser.',
      },
      {
        label: 'Tab history',
        value: `${browser.historyLength} ${browser.historyLength === 1 ? 'page' : 'pages'} in this tab`,
        hide: 'Counts pages, not which ones. A new tab starts at one.',
      },
      {
        label: 'Ad blocker',
        value: browser.adBlocker ? 'Detected' : 'Not detected',
        hide: 'Sites notice when their bait elements are hidden, so it cannot be hidden.',
      },
      {
        label: 'Appearance',
        value: join([
          `${browser.darkMode ? 'Dark' : 'Light'} mode`,
          browser.reducedMotion ? 'reduced motion' : null,
          ...browser.accessibility.map((name) => name.toLowerCase()),
        ]),
        hide: 'These follow your system settings.',
      },
    ],
  }
}

function taskbarSentence(taskbar: NonNullable<BrowserSignals['taskbar']>): string {
  if (!taskbar.side) return `You keep your ${taskbar.name} hidden.`
  const vertical = taskbar.side === 'left' || taskbar.side === 'right'
  return `Your ${taskbar.name} sits ${placement(taskbar.side)} of the screen, ${taskbar.size} pixels ${vertical ? 'wide' : 'tall'}.`
}

function placement(side: 'top' | 'bottom' | 'left' | 'right'): string {
  return `${side === 'left' || side === 'right' ? 'on' : 'at'} the ${side}`
}

function display(browser: BrowserSignals): string {
  const { width, height, pixelRatio } = browser.screen
  if (pixelRatio === 1) return `${width}×${height}`
  return `${evenPixels(width * pixelRatio)}×${evenPixels(height * pixelRatio)}, scaled to ${Math.round(pixelRatio * 100)}%`
}

function evenPixels(size: number): number {
  return Math.round(size / 2) * 2
}

function timeIn(zone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: zone,
  }).format(new Date())
}

function batteryTime(battery: NonNullable<BrowserSignals['battery']>): string {
  if (battery.minutesLeft === null) return ''
  const hours = Math.floor(battery.minutesLeft / 60)
  const rest = battery.minutesLeft % 60
  const span = hours > 0 ? `${hours} h ${rest} min` : `${rest} min`
  return battery.charging ? `, full in about ${span}` : `, with about ${span} left`
}

function clockMismatch(server: ConnectionSignals, browser: BrowserSignals): boolean {
  if (!server.timezone) return false
  const connection = utcOffset(server.timezone)
  return connection !== null && connection !== utcOffset(browser.timezone)
}

function utcOffset(zone: string): string | null {
  try {
    return (
      new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'longOffset' })
        .formatToParts(new Date())
        .find((part) => part.type === 'timeZoneName')?.value ?? null
    )
  } catch {
    return null
  }
}

function twentyFourHour(browser: BrowserSignals): boolean {
  return browser.hourCycle === 'h23' || browser.hourCycle === 'h24'
}

function laptop(browser: BrowserSignals): boolean {
  return (
    browser.battery !== null &&
    !batteryAmbiguous(browser.battery) &&
    browser.mobile !== true &&
    browser.pointers.fine
  )
}

function describeAdapter(adapter: Adapter): string {
  const vendorKey = adapter.vendor.toLowerCase()
  const vendor = gpuVendors[vendorKey] ?? capitalize(adapter.vendor)
  const architecture = adapter.architecture
    ? adapter.architecture.split('-').map(architectureWord).join(' ')
    : null
  const series = seriesOf(adapter)
  return join([vendor || null, architecture, series ? `likely ${series}` : null]) ?? 'Unknown'
}

function architectureWord(word: string): string {
  if (gpuAcronyms.has(word)) return word.toUpperCase()
  const suffixed = word.match(/^(\d+)([a-z]+)$/)
  if (suffixed) return `${suffixed[1]}${suffixed[2]?.toUpperCase()}`
  return capitalize(word)
}

function seriesOf(adapter: Adapter): string | undefined {
  const vendor = adapter.vendor.toLowerCase()
  return gpuSeries.find(
    (entry) => vendor === entry.vendor && adapter.architecture.includes(entry.architecture),
  )?.series
}

function secondGraphics(adapters: BrowserSignals['adapters']): string | null {
  const { integrated, performance } = adapters
  if (!integrated || !performance || integrated.vendor === performance.vendor) return null
  const key = performance.vendor.toLowerCase()
  const vendor = gpuVendors[key] ?? performance.vendor
  const series = seriesOf(performance)
  return `${anVendors.has(key) ? 'an' : 'a'} ${vendor} graphics card${series ? `, likely ${series}` : ''}`
}

function adapterList(adapters: BrowserSignals['adapters']): string | null {
  const described = [adapters.integrated, adapters.performance]
    .filter((adapter): adapter is Adapter => adapter !== null)
    .map(describeAdapter)
  const unique = [...new Set(described)]
  return unique.length > 0 ? unique.join('; ') : null
}

function batteryAmbiguous(battery: NonNullable<BrowserSignals['battery']>): boolean {
  return battery.level === 1 && battery.charging
}

function graphicsPhrase(gpu: string | null): string {
  if (!gpu) return ''
  if (gpu === softwareRendering) return ', with no graphics chip in use'
  return `, and your graphics chip is ${gpu}`
}

function placeName(server: ConnectionSignals): string | null {
  return join([server.city, server.country ? regions.of(server.country) : null])
}

function macModel(browser: BrowserSignals, os: string | null): string | null {
  if (!os?.startsWith('macOS') || browser.screen.pixelRatio !== 2) return null
  return macDisplays[`${browser.screen.width}x${browser.screen.height}`] ?? null
}

function osFromUserAgent(agent: string | null): string | null {
  if (!agent) return null
  if (/iPhone|iPad/.test(agent)) return 'iOS'
  if (/Android/.test(agent)) return 'Android'
  if (/Mac OS X/.test(agent)) return 'macOS'
  if (/Windows/.test(agent)) return 'Windows'
  if (/Linux/.test(agent)) return 'Linux'
  return null
}

function browserFromUserAgent(agent: string | null): string | null {
  if (!agent) return null
  const match =
    agent.match(/(Firefox)\/(\d+)/) ??
    agent.match(/(Edg)\/(\d+)/) ??
    agent.match(/(Chrome)\/(\d+)/) ??
    agent.match(/Version\/(\d+).*(Safari)/)
  if (!match) return null
  if (match[2] === 'Safari') return `Safari ${match[1]}`
  return `${match[1] === 'Edg' ? 'Edge' : match[1]} ${match[2]}`
}

function partOfDay(hour: number): string {
  if (hour < 5) return 'at night'
  if (hour < 12) return 'in the morning'
  if (hour < 17) return 'in the afternoon'
  if (hour < 22) return 'in the evening'
  return 'at night'
}

function networkLabel(kind: ConnectionSignals['network']): string {
  if (kind === 'hosting') return 'a hosting network, often a VPN'
  if (kind === 'mobile') return 'a mobile network'
  return 'likely a home or office connection'
}

function uniqueLanguages(tags: string[]): string[] {
  const names = tags.map((tag) => languageNames.of(tag.split('-')[0] ?? tag) ?? tag)
  return [...new Set(names)]
}

function readableZone(zone: string): string {
  return zone.replaceAll('_', ' ')
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function list(items: string[]): string {
  return items.length <= 1
    ? (items[0] ?? '')
    : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`
}

function join(parts: (string | null | undefined)[]): string | null {
  const present = parts.filter((part): part is string => Boolean(part))
  return present.length > 0 ? present.join(', ') : null
}
