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
  languages: string[]
  userAgent: string | null
  globalPrivacyControl: boolean
  doNotTrack: boolean
  referrer: string | null
}

export function connectionSignals(request: Request): ConnectionSignals {
  const cf = request.cf
  const headers = request.headers
  const isp = text(cf?.asOrganization)
  const ip = headers.get('cf-connecting-ip')
  return {
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
    rttMs: typeof cf?.clientTcpRtt === 'number' ? cf.clientTcpRtt : null,
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

function networkKind(isp: string): NetworkKind {
  const name = isp.toLowerCase()
  if (hostingNetworks.some((word) => name.includes(word))) return 'hosting'
  if (mobileNetworks.some((word) => name.includes(word))) return 'mobile'
  return 'home'
}

function acceptedLanguages(header: string | null): string[] {
  if (!header) return []
  return header
    .split(',')
    .map((part) => part.split(';')[0]?.trim() ?? '')
    .filter((tag) => tag.length > 0 && tag !== '*')
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}
