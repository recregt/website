import { env } from 'cloudflare:workers'
import { z } from 'zod'

import { type Range, ranges } from '../app/stats/ranges'

import {
  engagementBlobs,
  engagementDoubles,
  requestBlobs,
  requestDoubles,
} from './analytics.server'
import { cached } from './cache.server'

const request = columns(requestBlobs, requestDoubles)
const engagement = columns(engagementBlobs, engagementDoubles)

const count = z.coerce.number()
const ranked = z.object({ name: z.string(), count })
const listSize = 10

const documents = `${request.kind} IN ('document', 'navigation')`
const sitePage = `${request.path} NOT LIKE '/auth/%' AND ${request.path} != '/admin' AND ${request.path} NOT LIKE '/admin/%'`
const pagePath = /^\/[a-z0-9/-]*$/

const stepMs = { hour: 3_600_000, day: 86_400_000 } as const
type Step = keyof typeof stepMs

type Window = { step: Step; first: number; last: number; until: number | null; next: number }

export type AnalyticsProblem = 'unconfigured' | 'unavailable'
export type AnalyticsResult<T> = { ok: true; value: T } | { ok: false; reason: AnalyticsProblem }

export async function loadAnalytics<T>(load: () => Promise<T>): Promise<AnalyticsResult<T>> {
  if (!env.ANALYTICS_TOKEN) return { ok: false, reason: 'unconfigured' }
  try {
    return { ok: true, value: await load() }
  } catch (error) {
    console.error(error)
    return { ok: false, reason: 'unavailable' }
  }
}

export async function publicStats(range: Range, cacheKey: URL, pages: () => Promise<string[]>) {
  const window = windowFor(range, true)
  return cached(cacheKey, window.next, async () => ({
    ...(await overview(window, { kind: 'public', pages: await pages() })),
    details: null,
  }))
}

export async function fullStats(range: Range) {
  const window = windowFor(range, false)
  const [summary, extra] = await Promise.all([overview(window, { kind: 'full' }), details(window)])
  return { ...summary, details: extra }
}

export type SiteStats =
  | Awaited<ReturnType<typeof publicStats>>
  | Awaited<ReturnType<typeof fullStats>>
export type StatsDetails = Awaited<ReturnType<typeof details>>

export async function recentRequests(range: Range, limit: number) {
  return requestLog(within(windowFor(range, false)), limit)
}

type Scope = { kind: 'public'; pages: readonly string[] } | { kind: 'full' }

async function overview(window: Window, scope: Scope) {
  const since = within(window)
  const views = pageViews(since)
  const top = (column: string, where = views) =>
    query(
      `SELECT ${column} AS name, SUM(_sample_interval) AS count FROM recregt_requests WHERE ${where} AND ${column} != '' GROUP BY name ORDER BY count DESC LIMIT ${listSize}`,
      ranked,
    )
  const every = (column: string, where = views) =>
    query(
      `SELECT ${column} AS name, SUM(_sample_interval) AS count FROM recregt_requests WHERE ${where} AND ${column} != '' GROUP BY name`,
      ranked,
    )
  const external = `${views} AND ${request.referrer} NOT LIKE '/%'`
  const listed =
    scope.kind === 'public'
      ? `${views} AND ${request.path} IN (${scope.pages
          .filter((page) => pagePath.test(page))
          .map((page) => `'${page}'`)
          .join(', ')})`
      : views
  const vital = async (column: string) => {
    const [row] = await query(
      `SELECT quantileWeighted(0.75)(${column}, _sample_interval) AS p75 FROM recregt_engagement WHERE ${since} AND ${column} > 0`,
      z.object({ p75: z.coerce.number().nullable() }),
    )
    return row?.p75 ?? null
  }

  const [totals, series, pages, referrers, countries, browsers, devices, vitals] =
    await Promise.all([
      query(
        `SELECT SUM(_sample_interval) AS views, COUNT(DISTINCT index1) AS visitors FROM recregt_requests WHERE ${views}`,
        z.object({ views: count, visitors: count }),
      ),
      query(
        `SELECT ${window.step === 'hour' ? 'toStartOfHour' : 'toStartOfDay'}(timestamp) AS time, SUM(_sample_interval) AS views, COUNT(DISTINCT index1) AS visitors FROM recregt_requests WHERE ${views} GROUP BY time ORDER BY time`,
        z.object({ time: z.string(), views: count, visitors: count }),
      ),
      top(request.path, listed),
      scope.kind === 'public'
        ? every(request.referrer, external).then((rows) => regroup(rows, referrerHost))
        : top(request.referrer, external),
      top(request.country),
      scope.kind === 'public'
        ? every(request.browser).then((rows) => regroup(rows, browserFamily))
        : top(request.browser),
      top(request.device),
      Promise.all([vital(engagement.ttfbMs), vital(engagement.fcpMs), vital(engagement.lcpMs)]),
    ])

  return {
    totals: { views: totals[0]?.views ?? 0, visitors: totals[0]?.visitors ?? 0 },
    series: { step: window.step, points: timeline(series, window) },
    pages,
    referrers,
    countries,
    browsers,
    devices,
    vitals: { ttfbMs: vitals[0], fcpMs: vitals[1], lcpMs: vitals[2] },
  }
}

async function details(window: Window) {
  const since = within(window)
  const views = pageViews(since)
  const top = (column: string) =>
    query(
      `SELECT ${column} AS name, SUM(_sample_interval) AS count FROM recregt_requests WHERE ${views} AND ${column} != '' GROUP BY name ORDER BY count DESC LIMIT ${listSize}`,
      ranked,
    )

  const [signedIn, bots, cities, languages, systems, screens, measured, slowest, recent] =
    await Promise.all([
      query(
        `SELECT SUM(_sample_interval * ${request.signedIn}) AS views FROM recregt_requests WHERE ${views}`,
        z.object({ views: count }),
      ),
      query(
        `SELECT SUM(_sample_interval) AS requests FROM recregt_requests WHERE ${since} AND ${documents} AND ${request.bot} = 1`,
        z.object({ requests: count }),
      ),
      query(
        `SELECT ${request.city} AS city, ${request.country} AS country, SUM(_sample_interval) AS count FROM recregt_requests WHERE ${views} AND ${request.city} != '' GROUP BY city, country ORDER BY count DESC LIMIT ${listSize}`,
        z.object({ city: z.string(), country: z.string(), count }),
      ),
      top(request.language),
      top(request.os),
      query(
        `SELECT ${engagement.screenWidth} AS width, ${engagement.screenHeight} AS height, COUNT(DISTINCT ${engagement.pageView}) AS count FROM recregt_engagement WHERE ${since} GROUP BY width, height ORDER BY count DESC LIMIT ${listSize}`,
        z.object({ width: count, height: count, count }),
      ),
      query(
        `SELECT COUNT(DISTINCT ${engagement.pageView}) AS views FROM recregt_engagement WHERE ${since}`,
        z.object({ views: count }),
      ),
      query(
        `SELECT ${request.path} AS name, AVG(${request.durationMs}) AS ms, SUM(_sample_interval) AS count FROM recregt_requests WHERE ${since} AND ${request.durationMs} > 0 AND ${sitePage} GROUP BY name ORDER BY ms DESC LIMIT ${listSize}`,
        z.object({ name: z.string(), ms: count, count }),
      ),
      requestLog(since, listSize),
    ])

  return {
    signedInViews: signedIn[0]?.views ?? 0,
    botRequests: bots[0]?.requests ?? 0,
    cities: cities.map(({ city, country, count }) => ({ name: `${city}, ${country}`, count })),
    languages,
    systems,
    screens: {
      measuredViews: measured[0]?.views ?? 0,
      rows: screens.map(({ width, height, count }) => ({ name: `${width}×${height}`, count })),
    },
    slowest,
    recent,
  }
}

function pageViews(since: string): string {
  return `${since} AND ${documents} AND ${request.status} = 200 AND ${request.bot} = 0 AND ${sitePage}`
}

function requestLog(since: string, limit: number) {
  return query(
    `SELECT timestamp, ${request.kind} AS kind, ${request.path} AS path, ${request.status} AS status, ${request.durationMs} AS durationMs, ${request.ip} AS ip, ${request.city} AS city, ${request.country} AS country, ${request.asOrganization} AS network, ${request.browser} AS browser, ${request.os} AS os, ${request.device} AS device, ${request.handle} AS handle, ${request.referrer} AS referrer, ${request.bot} AS bot FROM recregt_requests WHERE ${since} ORDER BY timestamp DESC LIMIT ${limit}`,
    z.object({
      timestamp: z.string(),
      kind: z.string(),
      path: z.string(),
      status: count,
      durationMs: count,
      ip: z.string(),
      city: z.string(),
      country: z.string(),
      network: z.string(),
      browser: z.string(),
      os: z.string(),
      device: z.string(),
      handle: z.string(),
      referrer: z.string(),
      bot: count,
    }),
  )
}

function windowFor(range: Range, complete: boolean): Window {
  const step: Step = range === '1d' ? 'hour' : 'day'
  const size = stepMs[step]
  const now = Date.now()
  const first = Math.floor((now - ranges[range] * stepMs.day) / size) * size
  const current = Math.floor(now / size) * size
  const next = current + size
  return complete
    ? { step, first, last: current - size, until: current, next }
    : { step, first, last: current, until: null, next }
}

function within(window: Window): string {
  const from = `timestamp >= toDateTime(${window.first / 1000})`
  return window.until === null ? from : `${from} AND timestamp < toDateTime(${window.until / 1000})`
}

function timeline(rows: { time: string; views: number; visitors: number }[], window: Window) {
  const size = stepMs[window.step]
  const found = new Map(rows.map((row) => [Date.parse(`${row.time.replace(' ', 'T')}Z`), row]))
  return Array.from({ length: (window.last - window.first) / size + 1 }, (_, index) => {
    const time = window.first + index * size
    const row = found.get(time)
    return { time: time / 1000, views: row?.views ?? 0, visitors: row?.visitors ?? 0 }
  })
}

function regroup(rows: { name: string; count: number }[], key: (name: string) => string | null) {
  const totals = new Map<string, number>()
  for (const row of rows) {
    const name = key(row.name)
    if (name) totals.set(name, (totals.get(name) ?? 0) + row.count)
  }
  return [...totals]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, listSize)
}

function referrerHost(referrer: string): string | null {
  return URL.parse(referrer)?.hostname || null
}

function browserFamily(browser: string): string {
  return browser.replace(/ \d+$/, '')
}

const reply = z.object({ data: z.array(z.unknown()) })

async function query<T>(sql: string, row: z.ZodType<T>): Promise<T[]> {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/analytics_engine/sql`,
    {
      method: 'POST',
      headers: { authorization: `Bearer ${env.ANALYTICS_TOKEN}` },
      body: `${sql} FORMAT JSON`,
    },
  )
  if (!response.ok) throw new Error(`analytics engine ${response.status}: ${await response.text()}`)
  return z.array(row).parse(reply.parse(await response.json()).data)
}

function columns<B extends readonly string[], D extends readonly string[]>(blobs: B, doubles: D) {
  return {
    ...Object.fromEntries(blobs.map((name, i) => [name, `blob${i + 1}`])),
    ...Object.fromEntries(doubles.map((name, i) => [name, `double${i + 1}`])),
  } as Record<B[number] | D[number], string>
}
