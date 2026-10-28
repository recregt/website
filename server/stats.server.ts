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

export function analyticsConfigured(): boolean {
  return Boolean(env.ANALYTICS_TOKEN)
}

export async function siteStats(range: Range) {
  const since = `timestamp > NOW() - INTERVAL '${ranges[range]}' DAY`
  const views = `${since} AND ${request.kind} IN ('document', 'navigation') AND ${request.status} = 200 AND ${request.bot} = 0 AND ${request.path} NOT LIKE '/auth/%'`
  const top = (column: string, where = views, limit = 10) =>
    query(
      `SELECT ${column} AS name, SUM(_sample_interval) AS count FROM recregt_requests WHERE ${where} AND ${column} != '' GROUP BY name ORDER BY count DESC LIMIT ${limit}`,
      ranked,
    )
  const vital = async (column: string, where: string) => {
    const [row] = await query(
      `SELECT quantileWeighted(0.75)(${column}, _sample_interval) AS p75 FROM recregt_engagement WHERE ${since} AND ${where}`,
      z.object({ p75: z.coerce.number().nullable() }),
    )
    return row?.p75 ?? null
  }
  const topEngagement = (column: string, limit = 10) =>
    query(
      `SELECT ${column} AS name, COUNT(DISTINCT ${engagement.pageView}) AS count FROM recregt_engagement WHERE ${since} AND ${column} != '' GROUP BY name ORDER BY count DESC LIMIT ${limit}`,
      ranked,
    )

  const [
    totals,
    daily,
    pages,
    referrers,
    campaigns,
    countries,
    cities,
    networks,
    browsers,
    systems,
    devices,
    languages,
    notFound,
    slowest,
    reading,
    vitals,
    gpus,
    screens,
    timezones,
    colorSchemes,
    connections,
    recent,
  ] = await Promise.all([
    query(
      `SELECT SUM(_sample_interval) AS views, COUNT(DISTINCT index1) AS visitors, SUM(_sample_interval * ${request.signedIn}) AS signedIn, SUM(_sample_interval * ${request.bot}) AS bots FROM recregt_requests WHERE ${since} AND ${request.kind} IN ('document', 'navigation')`,
      z.object({ views: count, visitors: count, signedIn: count, bots: count }),
    ),
    query(
      `SELECT toStartOfDay(timestamp) AS day, SUM(_sample_interval) AS views, COUNT(DISTINCT index1) AS visitors FROM recregt_requests WHERE ${views} GROUP BY day ORDER BY day`,
      z.object({ day: z.string(), views: count, visitors: count }),
    ),
    top(request.path),
    top(request.referrer, `${views} AND ${request.referrer} NOT LIKE '/%'`),
    top(request.campaign),
    top(request.country),
    query(
      `SELECT ${request.city} AS city, ${request.country} AS country, SUM(_sample_interval) AS count FROM recregt_requests WHERE ${views} AND ${request.city} != '' GROUP BY city, country ORDER BY count DESC LIMIT 10`,
      z.object({ city: z.string(), country: z.string(), count }),
    ),
    top(request.asOrganization),
    top(request.browser),
    top(request.os),
    top(request.device),
    top(request.language),
    top(request.path, `${since} AND ${request.status} = 404`, 20),
    query(
      `SELECT ${request.path} AS name, AVG(${request.durationMs}) AS ms, SUM(_sample_interval) AS count FROM recregt_requests WHERE ${since} AND ${request.durationMs} > 0 GROUP BY name ORDER BY ms DESC LIMIT 10`,
      z.object({ name: z.string(), ms: count, count }),
    ),
    query(
      `SELECT path AS name, COUNT() AS views, AVG(visible) AS visibleMs, AVG(depth) AS scrollDepth FROM (SELECT ${engagement.pageView}, ${engagement.path} AS path, MAX(${engagement.visibleMs}) AS visible, MAX(${engagement.scrollDepth}) AS depth FROM recregt_engagement WHERE ${since} GROUP BY ${engagement.pageView}, path) GROUP BY name ORDER BY views DESC LIMIT 10`,
      z.object({ name: z.string(), views: count, visibleMs: count, scrollDepth: count }),
    ),
    Promise.all([
      vital(engagement.ttfbMs, `${engagement.ttfbMs} > 0`),
      vital(engagement.fcpMs, `${engagement.fcpMs} > 0`),
      vital(engagement.lcpMs, `${engagement.lcpMs} > 0`),
      vital(engagement.cls, `${engagement.loadType} != 'client'`),
      vital(engagement.slowestInteractionMs, `${engagement.slowestInteractionMs} > 0`),
    ]),
    topEngagement(engagement.gpuRenderer),
    query(
      `SELECT ${engagement.screenWidth} AS width, ${engagement.screenHeight} AS height, COUNT(DISTINCT ${engagement.pageView}) AS count FROM recregt_engagement WHERE ${since} GROUP BY width, height ORDER BY count DESC LIMIT 10`,
      z.object({ width: count, height: count, count }),
    ),
    topEngagement(engagement.timezone),
    topEngagement(engagement.colorScheme),
    topEngagement(engagement.connection),
    query(
      `SELECT timestamp, ${request.kind} AS kind, ${request.path} AS path, ${request.status} AS status, ${request.ip} AS ip, ${request.city} AS city, ${request.country} AS country, ${request.asOrganization} AS network, ${request.browser} AS browser, ${request.os} AS os, ${request.device} AS device, ${request.handle} AS handle, ${request.referrer} AS referrer FROM recregt_requests WHERE ${since} ORDER BY timestamp DESC LIMIT 50`,
      z.object({
        timestamp: z.string(),
        kind: z.string(),
        path: z.string(),
        status: count,
        ip: z.string(),
        city: z.string(),
        country: z.string(),
        network: z.string(),
        browser: z.string(),
        os: z.string(),
        device: z.string(),
        handle: z.string(),
        referrer: z.string(),
      }),
    ),
  ])

  return {
    totals: totals[0] ?? { views: 0, visitors: 0, signedIn: 0, bots: 0 },
    daily,
    audience: {
      countries,
      cities: cities.map(({ city, country, count }) => ({ name: `${city}, ${country}`, count })),
      networks,
      languages,
      timezones,
    },
    sources: { referrers, campaigns },
    content: { pages, reading, notFound },
    technology: {
      browsers,
      systems,
      devices,
      gpus,
      screens: screens.map(({ width, height, count }) => ({ name: `${width}×${height}`, count })),
      colorSchemes,
      connections,
    },
    performance: {
      vitals: {
        ttfbMs: vitals[0],
        fcpMs: vitals[1],
        lcpMs: vitals[2],
        cls: vitals[3],
        interactionMs: vitals[4],
      },
      slowest,
    },
    recent,
  }
}

export type SiteStats = Awaited<ReturnType<typeof siteStats>>

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
