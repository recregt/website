import { env } from 'cloudflare:workers'
import { isbot } from 'isbot'
import { z } from 'zod'

export const requestBlobs = [
  'kind',
  'path',
  'method',
  'referrer',
  'campaign',
  'userAgent',
  'browser',
  'os',
  'device',
  'country',
  'region',
  'city',
  'postalCode',
  'timezone',
  'continent',
  'asOrganization',
  'colo',
  'language',
  'ip',
  'handle',
] as const

export const requestDoubles = [
  'status',
  'durationMs',
  'tcpRttMs',
  'latitude',
  'longitude',
  'asn',
  'bot',
  'signedIn',
  'eu',
] as const

export const engagementBlobs = [
  'pageView',
  'path',
  'referrer',
  'loadType',
  'language',
  'languages',
  'timezone',
  'colorScheme',
  'reducedMotion',
  'connection',
  'gpuVendor',
  'gpuRenderer',
  'browser',
  'os',
  'device',
  'country',
  'city',
] as const

export const engagementDoubles = [
  'visibleMs',
  'scrollDepth',
  'viewportWidth',
  'viewportHeight',
  'screenWidth',
  'screenHeight',
  'pixelRatio',
  'cpuCores',
  'memoryGb',
  'touch',
  'saveData',
  'downlinkMbps',
  'ttfbMs',
  'fcpMs',
  'lcpMs',
  'cls',
  'slowestInteractionMs',
] as const

type Fields<Names extends readonly string[], Value> = Record<Names[number], Value>

const beaconPath = '/e'
const manifestPath = '/__manifest'

const browsers: [RegExp, string][] = [
  [/Edg\/(\d+)/, 'Edge'],
  [/OPR\/(\d+)/, 'Opera'],
  [/SamsungBrowser\/(\d+)/, 'Samsung Internet'],
  [/(?:Firefox|FxiOS)\/(\d+)/, 'Firefox'],
  [/(?:Chrome|CriOS)\/(\d+)/, 'Chrome'],
  [/Version\/(\d+).*Safari/, 'Safari'],
]

const metric = z.number().finite().nonnegative().max(1e9).nullable()
const label = z.string().max(512)

const engagement = z.object({
  pageView: z.string().max(64),
  path: label,
  referrer: label,
  loadType: label,
  language: label,
  languages: label,
  timezone: label,
  colorScheme: label,
  reducedMotion: label,
  connection: label,
  gpuVendor: label,
  gpuRenderer: label,
  visibleMs: metric,
  scrollDepth: metric,
  viewportWidth: metric,
  viewportHeight: metric,
  screenWidth: metric,
  screenHeight: metric,
  pixelRatio: metric,
  cpuCores: metric,
  memoryGb: metric,
  touch: metric,
  saveData: metric,
  downlinkMbps: metric,
  ttfbMs: metric,
  fcpMs: metric,
  lcpMs: metric,
  cls: metric,
  slowestInteractionMs: metric,
})

export type Engagement = z.infer<typeof engagement>

export async function recordEngagement(request: Request): Promise<Response> {
  const body = engagement.safeParse(await request.json().catch(() => undefined))
  if (!body.success) return new Response(null, { status: 400 })

  const cf = request.cf
  const agent = describeAgent(request.headers.get('user-agent') ?? '')
  const blobs: Fields<typeof engagementBlobs, string> = {
    ...body.data,
    browser: agent.browser,
    os: agent.os,
    device: agent.device,
    country: text(cf?.country),
    city: text(cf?.city),
  }
  env.ENGAGEMENT.writeDataPoint({
    blobs: engagementBlobs.map((name) => blobs[name]),
    doubles: engagementDoubles.map((name) => body.data[name] ?? 0),
    indexes: [await visitor(request)],
  })
  return new Response(null, { status: 204 })
}

export async function recordRequest(
  request: Request,
  status: number,
  durationMs: number,
  handle: string,
): Promise<void> {
  const url = new URL(request.url)
  if (url.pathname === beaconPath) return
  const cf = request.cf
  const headers = request.headers
  const agent = describeAgent(headers.get('user-agent') ?? '')
  const blobs: Fields<typeof requestBlobs, string> = {
    kind: requestKind(request.method, url.pathname),
    path: pagePath(url.pathname),
    method: request.method,
    referrer: referrer(headers.get('referer'), url),
    campaign: campaign(url.searchParams),
    userAgent: agent.raw,
    browser: agent.browser,
    os: agent.os,
    device: agent.device,
    country: text(cf?.country),
    region: text(cf?.region),
    city: text(cf?.city),
    postalCode: text(cf?.postalCode),
    timezone: text(cf?.timezone),
    continent: text(cf?.continent),
    asOrganization: text(cf?.asOrganization),
    colo: text(cf?.colo),
    language: (headers.get('accept-language') ?? '').split(',')[0]?.trim() ?? '',
    ip: headers.get('cf-connecting-ip') ?? '',
    handle,
  }
  const doubles: Fields<typeof requestDoubles, number> = {
    status,
    durationMs,
    tcpRttMs: number(cf?.clientTcpRtt),
    latitude: number(cf?.latitude),
    longitude: number(cf?.longitude),
    asn: number(cf?.asn),
    bot: agent.bot ? 1 : 0,
    signedIn: handle ? 1 : 0,
    eu: cf?.isEUCountry === '1' ? 1 : 0,
  }
  env.REQUESTS.writeDataPoint({
    blobs: requestBlobs.map((name) => blobs[name]),
    doubles: requestDoubles.map((name) => doubles[name]),
    indexes: [await visitor(request)],
  })
}

function requestKind(method: string, pathname: string): string {
  if (method !== 'GET') return 'action'
  if (pathname === manifestPath) return 'manifest'
  return pathname.endsWith('.data') ? 'navigation' : 'document'
}

function pagePath(pathname: string): string {
  if (pathname === '/_.data' || pathname === '/_root.data') return '/'
  return pathname.endsWith('.data') ? pathname.slice(0, -'.data'.length) : pathname
}

function referrer(header: string | null, url: URL): string {
  if (!header) return ''
  const from = URL.parse(header)
  if (!from) return ''
  return siteHost(from.hostname) === siteHost(url.hostname)
    ? from.pathname
    : from.href.slice(0, 512)
}

export function siteHost(hostname: string): string {
  return hostname.replace(/^www\./, '')
}

function campaign(params: URLSearchParams): string {
  const parts = ['utm_source', 'utm_medium', 'utm_campaign'].map((name) => params.get(name) ?? '')
  if (parts.some(Boolean)) return parts.join('|')
  return params.get('ref') ?? ''
}

async function visitor(request: Request): Promise<string> {
  const key = `${request.headers.get('cf-connecting-ip') ?? ''}\n${request.headers.get('user-agent') ?? ''}`
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key))
  return [...new Uint8Array(digest).slice(0, 16)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function describeAgent(userAgent: string) {
  return {
    raw: userAgent.slice(0, 512),
    browser: browser(userAgent),
    os: operatingSystem(userAgent),
    device: device(userAgent),
    bot: isbot(userAgent),
  }
}

function browser(ua: string): string {
  for (const [pattern, name] of browsers) {
    const version = pattern.exec(ua)?.[1]
    if (version) return `${name} ${version}`
  }
  return 'other'
}

function operatingSystem(ua: string): string {
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS'
  if (/Android/.test(ua)) return 'Android'
  if (/CrOS/.test(ua)) return 'ChromeOS'
  if (/Windows/.test(ua)) return 'Windows'
  if (/Mac OS X|Macintosh/.test(ua)) return 'macOS'
  if (/Linux/.test(ua)) return 'Linux'
  return 'other'
}

function device(ua: string): string {
  if (isbot(ua)) return 'bot'
  if (/iPad|Tablet/.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua))) return 'tablet'
  if (/Mobi|iPhone|iPod/.test(ua)) return 'mobile'
  return 'desktop'
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function number(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}
