const hostingNetworks = [
  'amazon',
  'google',
  'microsoft',
  'digitalocean',
  'linode',
  'akamai',
  'ovh',
  'hetzner',
  'vultr',
  'oracle',
  'alibaba',
  'tencent',
  'cloudflare',
  'm247',
  'datacamp',
  'leaseweb',
  'choopa',
  'contabo',
  'scaleway',
  'mullvad',
  'proton',
  'nordvpn',
  'packethub',
  'hosting',
  'datacenter',
  'data center',
  'server',
]

const mobileNetworks = ['mobile', 'wireless', 'cellular', 'lte', 't-mobile', 'vodafone']

export type NetworkKind = 'hosting' | 'mobile' | 'home'

const dnsOverHttps = 'https://cloudflare-dns.com/dns-query'
const ptrRecord = 12

export type ConnectionSignals = {
  ip: string | null
  city: string | null
  region: string | null
  country: string | null
  postalCode: string | null
  timezone: string | null
  latitude: string | null
  longitude: string | null
  isp: string | null
  asn: number | null
  network: NetworkKind | null
  colo: string | null
  httpProtocol: string | null
  tlsVersion: string | null
  tlsCipher: string | null
  rttMs: number | null
  inEu: boolean
  ipVersion: 4 | 6 | null
  priority: string | null
  saveData: boolean
  hostname: string | null
  languages: string[]
  userAgent: string | null
  globalPrivacyControl: boolean
  doNotTrack: boolean
  referrer: string | null
}

export async function connectionSignals(request: Request): Promise<ConnectionSignals> {
  const cf = request.cf
  const headers = request.headers
  const isp = text(cf?.asOrganization)
  const ip = headers.get('cf-connecting-ip')
  return {
    hostname: ip ? await reverseDns(ip) : null,
    ip,
    city: text(cf?.city),
    region: text(cf?.region),
    country: text(cf?.country),
    postalCode: text(cf?.postalCode),
    timezone: text(cf?.timezone),
    latitude: text(cf?.latitude),
    longitude: text(cf?.longitude),
    isp,
    asn: typeof cf?.asn === 'number' ? cf.asn : null,
    network: isp ? networkKind(isp) : null,
    colo: text(cf?.colo),
    httpProtocol: text(cf?.httpProtocol),
    tlsVersion: text(cf?.tlsVersion),
    tlsCipher: text(cf?.tlsCipher),
    rttMs: typeof cf?.clientTcpRtt === 'number' && cf.clientTcpRtt > 0 ? cf.clientTcpRtt : null,
    inEu: cf?.isEUCountry === '1',
    ipVersion: ip ? (ip.includes(':') ? 6 : 4) : null,
    priority: text(cf?.requestPriority),
    saveData: headers.get('save-data') === 'on',
    languages: acceptedLanguages(headers.get('accept-language')),
    userAgent: headers.get('user-agent'),
    globalPrivacyControl: headers.get('sec-gpc') === '1',
    doNotTrack: headers.get('dnt') === '1',
    referrer: headers.get('referer'),
  }
}

async function reverseDns(ip: string): Promise<string | null> {
  const name = reverseName(ip)
  if (!name) return null
  const url = new URL(dnsOverHttps)
  url.searchParams.set('name', name)
  url.searchParams.set('type', 'PTR')
  try {
    const response = await fetch(url, { headers: { accept: 'application/dns-json' } })
    if (!response.ok) return null
    const body = (await response.json()) as { Answer?: { type: number; data: string }[] }
    const host = body.Answer?.find((answer) => answer.type === ptrRecord)?.data
    return host ? host.replace(/\.$/, '') : null
  } catch {
    return null
  }
}

function reverseName(ip: string): string | null {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return `${ip.split('.').reverse().join('.')}.in-addr.arpa`
  if (!ip.includes(':')) return null
  const [head = '', tail = ''] = ip.split('::')
  const left = head ? head.split(':') : []
  const right = tail ? tail.split(':') : []
  const groups = ip.includes('::')
    ? [...left, ...Array(8 - left.length - right.length).fill('0'), ...right]
    : left
  if (groups.length !== 8) return null
  const nibbles = groups.map((group) => group.padStart(4, '0')).join('')
  return `${[...nibbles].reverse().join('.')}.ip6.arpa`
}

function list(header: string | null): string[] {
  if (!header) return []
  return header
    .split(',')
    .map((part) => part.split(';')[0]?.trim() ?? '')
    .filter((part) => part.length > 0)
}

function networkKind(isp: string): NetworkKind {
  const name = isp.toLowerCase()
  if (hostingNetworks.some((word) => name.includes(word))) return 'hosting'
  if (mobileNetworks.some((word) => name.includes(word))) return 'mobile'
  return 'home'
}

function acceptedLanguages(header: string | null): string[] {
  return list(header).filter((tag) => tag !== '*')
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}
