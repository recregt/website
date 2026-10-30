import { env } from 'cloudflare:workers'
import { z } from 'zod'

import { type Range, ranges } from '../app/admin/ranges'

import {
  engagementBlobs,
  engagementDoubles,
  requestBlobs,
  requestDoubles,
} from './analytics.server'

const request = columns(requestBlobs, requestDoubles)
const engagement = columns(engagementBlobs, engagementDoubles)

const count = z.coerce.number()
const ranked = z.object({ name: z.string(), count })

const stepMs = { hour: 3_600_000, day: 86_400_000 } as const
type Step = keyof typeof stepMs

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

export async function siteStats(range: Range) {
  const since = sinceClause(range)
  const documents = `${request.kind} IN ('document', 'navigation')`
  const sitePage = `${request.path} NOT LIKE '/auth/%' AND ${request.path} != '/admin' AND ${request.path} NOT LIKE '/admin/%'`
  const views = `${since} AND ${documents} AND ${request.status} = 200 AND ${request.bot} = 0 AND ${sitePage}`
  const step: Step = range === '1d' ? 'hour' : 'day'

  const top = (column: string, where = views) =>
    query(
      `SELECT ${column} AS name, SUM(_sample_interval) AS count FROM recregt_requests WHERE ${where} AND ${column} != '' GROUP BY name ORDER BY count DESC LIMIT 10`,
      ranked,
    )
  const vital = async (column: string) => {
    const [row] = await query(
      `SELECT quantileWeighted(0.75)(${column}, _sample_interval) AS p75 FROM recregt_engagement WHERE ${since} AND ${column} > 0`,
      z.object({ p75: z.coerce.number().nullable() }),
    )
    return row?.p75 ?? null
  }

  const [
    totals,
    bots,
    series,
    pages,
    referrers,
    countries,
    cities,
    languages,
    browsers,
    systems,
    devices,
    screens,
    slowest,
    vitals,
    recent,
  ] = await Promise.all([
    query(
      `SELECT SUM(_sample_interval) AS views, COUNT(DISTINCT index1) AS visitors, SUM(_sample_interval * ${request.signedIn}) AS signedIn FROM recregt_requests WHERE ${views}`,
      z.object({ views: count, visitors: count, signedIn: count }),
    ),
    query(
      `SELECT SUM(_sample_interval) AS bots FROM recregt_requests WHERE ${since} AND ${documents} AND ${request.bot} = 1`,
      z.object({ bots: count }),
    ),
    query(
      `SELECT ${step === 'hour' ? 'toStartOfHour' : 'toStartOfDay'}(timestamp) AS time, SUM(_sample_interval) AS views, COUNT(DISTINCT index1) AS visitors FROM recregt_requests WHERE ${views} GROUP BY time ORDER BY time`,
      z.object({ time: z.string(), views: count, visitors: count }),
    ),
    top(request.path),
    top(request.referrer, `${views} AND ${request.referrer} NOT LIKE '/%'`),
    top(request.country),
    query(
      `SELECT ${request.city} AS city, ${request.country} AS country, SUM(_sample_interval) AS count FROM recregt_requests WHERE ${views} AND ${request.city} != '' GROUP BY city, country ORDER BY count DESC LIMIT 10`,
      z.object({ city: z.string(), country: z.string(), count }),
    ),
    top(request.language),
    top(request.browser),
    top(request.os),
    top(request.device),
    query(
      `SELECT ${engagement.screenWidth} AS width, ${engagement.screenHeight} AS height, COUNT(DISTINCT ${engagement.pageView}) AS count FROM recregt_engagement WHERE ${since} GROUP BY width, height ORDER BY count DESC LIMIT 10`,
      z.object({ width: count, height: count, count }),
    ),
    query(
      `SELECT ${request.path} AS name, AVG(${request.durationMs}) AS ms, SUM(_sample_interval) AS count FROM recregt_requests WHERE ${since} AND ${request.durationMs} > 0 AND ${sitePage} GROUP BY name ORDER BY ms DESC LIMIT 10`,
      z.object({ name: z.string(), ms: count, count }),
    ),
    Promise.all([vital(engagement.ttfbMs), vital(engagement.fcpMs), vital(engagement.lcpMs)]),
    recentRequests(range, 10),
  ])

  return {
    totals: {
      views: totals[0]?.views ?? 0,
      visitors: totals[0]?.visitors ?? 0,
      signedIn: totals[0]?.signedIn ?? 0,
      bots: bots[0]?.bots ?? 0,
    },
    series: { step, points: timeline(series, step, ranges[range]) },
    pages,
    referrers,
    audience: {
      countries,
      cities: cities.map(({ city, country, count }) => ({ name: `${city}, ${country}`, count })),
      languages,
    },
    technology: {
      browsers,
      systems,
      devices,
      screens: screens.map(({ width, height, count }) => ({ name: `${width}×${height}`, count })),
    },
    performance: {
      vitals: { ttfbMs: vitals[0], fcpMs: vitals[1], lcpMs: vitals[2] },
      slowest,
    },
    recent,
  }
}

export type SiteStats = Awaited<ReturnType<typeof siteStats>>

export async function recentRequests(range: Range, limit: number) {
  return query(
    `SELECT timestamp, ${request.kind} AS kind, ${request.path} AS path, ${request.status} AS status, ${request.durationMs} AS durationMs, ${request.ip} AS ip, ${request.city} AS city, ${request.country} AS country, ${request.asOrganization} AS network, ${request.browser} AS browser, ${request.os} AS os, ${request.device} AS device, ${request.handle} AS handle, ${request.referrer} AS referrer, ${request.bot} AS bot FROM recregt_requests WHERE ${sinceClause(range)} ORDER BY timestamp DESC LIMIT ${limit}`,
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

function sinceClause(range: Range): string {
  return `timestamp > NOW() - INTERVAL '${ranges[range]}' DAY`
}

function timeline(
  rows: { time: string; views: number; visitors: number }[],
  step: Step,
  days: number,
) {
  const size = stepMs[step]
  const now = Date.now()
  const first = Math.floor((now - days * stepMs.day) / size) * size
  const last = Math.floor(now / size) * size
  const found = new Map(rows.map((row) => [Date.parse(`${row.time.replace(' ', 'T')}Z`), row]))
  return Array.from({ length: (last - first) / size + 1 }, (_, index) => {
    const time = first + index * size
    const row = found.get(time)
    return { time: time / 1000, views: row?.views ?? 0, visitors: row?.visitors ?? 0 }
  })
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
