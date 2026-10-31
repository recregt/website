import type { ConnectionSignals } from '../../../server/leak.server'
import { type BrowserSignals, type FontHint, softwareRendering } from './browser'

export type Finding = { label: string; value: string | null; hide: string; guess?: boolean }
export type Group = { title: string; empty: string; findings: Finding[] }

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
}

const regions = new Intl.DisplayNames(['en'], { type: 'region' })
const languageNames = new Intl.DisplayNames(['en'], { type: 'language' })

export function buildStory(server: ConnectionSignals, browser: BrowserSignals): string[] {
  const place = placeName(server)
  const vpn = usesVpn(server, browser)
  const os = browser.os ?? osFromUserAgent(server.userAgent)
  const device = browser.model ?? macModel(browser, os)
  const fonts = new Set(browser.fonts.map((font) => font.hint))
  const languages = uniqueLanguages(browser.languages)

  const story = [
    `It's ${browser.time}${twentyFourHour(browser) ? ` ${partOfDay(browser.hour)}` : ''} for you${place && !vpn ? `, and you're in or near ${place}` : ''}.`,
  ]
  if (vpn && place) {
    story.push(
      `Your connection appears to come from ${place}, but your clock is set to ${readableZone(browser.timezone)}, a different time zone, which usually means a VPN or proxy.`,
    )
  } else if (server.network === 'hosting' && server.isp) {
    story.push(
      `You're connecting through ${server.isp}, a hosting network, which usually means a VPN or proxy.`,
    )
  } else if (server.isp) {
    story.push(
      `Your internet comes from ${server.isp}${server.network === 'mobile' ? ' over a mobile network' : ''}.`,
    )
  }
  if (os) {
    story.push(
      `You're on ${os}${device ? `, likely a ${device}` : ''}${graphicsPhrase(browser.gpu)}.`,
    )
  }
  if (browser.extendedDisplay) story.push('You have more than one screen connected.')
  if (browser.battery && !batteryAmbiguous(browser.battery)) {
    story.push(
      `Your battery is at ${Math.round(browser.battery.level * 100)}% and ${browser.battery.charging ? 'charging' : 'not charging'}.`,
    )
  }
  if (browser.keyboard) story.push(`You type on a ${browser.keyboard} keyboard.`)
  if (languages.length > 1) story.push(`You read ${list(languages)}.`)
  for (const hint of fonts) story.push(fontHintSentences[hint])
  if (browser.darkMode) story.push('You prefer dark mode.')
  if (browser.adBlocker) story.push('You run an ad blocker.')
  if (server.globalPrivacyControl)
    story.push('Your browser asks sites not to sell or share your data.')
  return story
}

export function connectionGroup(server: ConnectionSignals): Group {
  return {
    title: 'What your connection reveals',
    empty: 'Not available',
    findings: [
      {
        label: 'IP address',
        value: server.ip,
        hide: 'A VPN or Tor replaces it with another address.',
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
        label: 'Distance to our server',
        value:
          server.rttMs !== null
            ? `${server.rttMs} ms round trip${server.colo ? ` to Cloudflare's ${server.colo} data center` : ''}`
            : null,
        hide: 'Grows with distance. A VPN adds its own delay.',
      },
      {
        label: 'Connection',
        value: join([server.httpProtocol, server.tlsVersion, server.tlsCipher]),
        hide: 'The same for everyone on your browser version, so it says little on its own.',
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

export function browserGroup(server: ConnectionSignals, browser: BrowserSignals): Group {
  const os = browser.os ?? osFromUserAgent(server.userAgent)
  const mac = browser.model ? null : macModel(browser, os)
  return {
    title: 'What your browser reveals',
    empty: 'Hidden by your browser',
    findings: [
      {
        label: 'Local time',
        value: `${browser.time}, ${readableZone(browser.timezone)}, ${browser.hourCycle === 'h23' || browser.hourCycle === 'h24' ? '24-hour' : '12-hour'} clock`,
        hide: 'Tor Browser reports UTC. Otherwise, set your system timezone to match your VPN.',
      },
      {
        label: 'Operating system',
        value: os,
        hide: 'Tor Browser reports a generic value.',
      },
      {
        label: 'Browser',
        value: browser.browser ?? browserFromUserAgent(server.userAgent),
        hide: 'Sent with every request, so it is visible to every site.',
      },
      {
        label: 'Device model',
        value:
          browser.model ?? mac ?? (browser.mobile === false ? 'Not reported for computers' : null),
        guess: Boolean(mac),
        hide: 'Phones report their model to Chromium-based browsers. Laptops are guessed from the screen size.',
      },
      {
        label: 'Graphics chip',
        value: browser.gpu,
        hide: 'Firefox and Safari report a generic name. Chromium-based browsers show the exact chip.',
      },
      {
        label: 'Screen',
        value: `${browser.screen.width}×${browser.screen.height} at ${browser.screen.pixelRatio}x${browser.screen.wideGamut ? ', wide color' : ''}${browser.screen.hdr ? ', HDR' : ''}`,
        hide: 'Tor Browser and Firefox with fingerprinting resistance report standard sizes.',
      },
      {
        label: 'More than one screen',
        value: browser.extendedDisplay === null ? null : browser.extendedDisplay ? 'Yes' : 'No',
        hide: 'Only Chromium-based browsers report this.',
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
            : `${Math.round(browser.battery.level * 100)}%, ${browser.battery.charging ? 'charging' : 'not charging'}`
          : null,
        hide: 'Firefox and Safari do not expose battery status. Desktops without a battery report a full, charging one.',
      },
      {
        label: 'Keyboard layout',
        value: browser.keyboard,
        hide: 'Only Chromium-based browsers expose this.',
      },
      {
        label: 'Disk size',
        value: browser.diskGb ? storage(browser.diskGb) : null,
        guess: true,
        hide: 'Estimated from how much storage Chromium lets a site use. Private windows get far less, and other browsers do not tie it to disk size.',
      },
      {
        label: 'Network type',
        value: browser.connection
          ? `${browser.connection.type}${browser.connection.downlinkMbps ? `, about ${browser.connection.downlinkMbps} Mbps` : ''}`
          : null,
        hide: 'Only Chromium-based browsers report this.',
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
        label: 'Touch',
        value: browser.touchPoints > 0 ? `${browser.touchPoints} touch points` : 'No touch screen',
        hide: 'Reported by every browser.',
      },
      {
        label: 'Ad blocker',
        value: browser.adBlocker ? 'Detected' : 'Not detected',
        hide: 'Sites notice when their bait elements are hidden, so it cannot be hidden.',
      },
      {
        label: 'Appearance',
        value: `${browser.darkMode ? 'Dark' : 'Light'} mode${browser.reducedMotion ? ', reduced motion' : ''}`,
        hide: 'These follow your system settings.',
      },
    ],
  }
}

function usesVpn(server: ConnectionSignals, browser: BrowserSignals): boolean {
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

function batteryAmbiguous(battery: NonNullable<BrowserSignals['battery']>): boolean {
  return battery.level === 1 && battery.charging
}

function graphicsPhrase(gpu: string | null): string {
  if (!gpu) return ''
  if (gpu === softwareRendering) return ', with no graphics chip in use'
  return `, using the ${gpu} for graphics`
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

function storage(gb: number): string {
  return gb >= 1000 ? `${(gb / 1000).toFixed(1)} TB` : `${Math.round(gb)} GB`
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
