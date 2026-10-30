import { Link } from 'react-router'

import { Page } from '~/components/page'
import { Section } from '~/components/section'
import { cn } from '~/lib/utils'

import { userContext } from '../../../server/session.server'
import { fullStats, loadAnalytics, publicStats, type SiteStats } from '../../../server/stats.server'
import { can } from '../../auth/access'
import { TrafficChart } from '../../stats/chart'
import { StatsHeader } from '../../stats/header'
import { type Metric, Metrics } from '../../stats/metrics'
import { AnalyticsNotice } from '../../stats/notice'
import { parseRange, rangeLabel } from '../../stats/ranges'
import { RankedList } from '../../stats/ranked-list'
import { RecentTable, SlowestTable } from '../../stats/tables'
import { type Rating, rate, type Vital } from '../../stats/vitals'
import type { Route } from './+types/index'

export const meta: Route.MetaFunction = () => [
  { title: 'Stats · recregt' },
  { name: 'description', content: 'Public, anonymized traffic numbers for recregt.' },
]

export async function loader({ context, request }: Route.LoaderArgs) {
  const site = new URL(request.url)
  const range = parseRange(site.searchParams.get('range'))
  const user = context.get(userContext)
  const full = can(user, 'stats:full')
  const stats = await loadAnalytics<SiteStats>(() =>
    full ? fullStats(range, site) : publicStats(range, site),
  )
  return { range, stats, full, admin: can(user, 'admin') }
}

export default function StatsPage({
  loaderData: { range, stats, full, admin },
}: Route.ComponentProps) {
  return (
    <Page>
      <StatsHeader
        range={range}
        admin={admin}
        description={
          full
            ? `Live numbers over ${rangeLabel(range)}, in UTC.`
            : `Anonymized traffic over ${rangeLabel(range)}. Complete ${range === '1d' ? 'hours' : 'days'} only, in UTC.`
        }
      />
      {stats.ok ? <Stats stats={stats.value} /> : <AnalyticsNotice reason={stats.reason} />}
    </Page>
  )
}

function Stats({ stats }: { stats: SiteStats }) {
  const total = stats.totals.views
  const details = stats.details
  const totals: Metric[] = [
    { label: 'Views', value: count(total) },
    { label: 'Visitors', value: count(stats.totals.visitors) },
    ...(details
      ? [
          { label: 'Signed-in views', value: count(details.signedInViews) },
          { label: 'Bot requests', value: count(details.botRequests) },
        ]
      : []),
  ]
  return (
    <>
      <Metrics items={totals} className={cn('grid-cols-2', details && 'lg:grid-cols-4')} />

      <Section title="Traffic">
        <TrafficChart series={stats.series} />
      </Section>

      <div className="gap-10 md:columns-2 [&>section]:mb-10 [&>section]:break-inside-avoid">
        <Ranking title="Pages" rows={stats.pages} total={total} />
        {details && <Ranking title="Referrers" rows={details.referrers} total={total} />}
        <Ranking title="Countries" rows={stats.countries} total={total} />
        {details && <Ranking title="Cities" rows={details.cities} total={total} />}
        <Ranking title="Browsers" rows={stats.browsers} total={total} />
        <Ranking title="Devices" rows={stats.devices} total={total} />
        {details && (
          <>
            <Ranking title="Operating systems" rows={details.systems} total={total} />
            <Ranking
              title="Screens"
              rows={details.screens.rows}
              total={details.screens.measuredViews}
            />
            <Ranking title="Languages" rows={details.languages} total={total} />
          </>
        )}
      </div>

      <Section
        title="Performance"
        description="75th percentile across page views, rated against Core Web Vitals thresholds."
      >
        <Metrics
          className="border-0 py-2 sm:grid-cols-3"
          items={[
            vital('Time to first byte', 'ttfbMs', stats.vitals.ttfbMs),
            vital('First contentful paint', 'fcpMs', stats.vitals.fcpMs),
            vital('Largest contentful paint', 'lcpMs', stats.vitals.lcpMs),
          ]}
        />
      </Section>

      {details && (
        <>
          <Section title="Slowest pages" description="Average response time per page view.">
            <SlowestTable rows={details.slowest} />
          </Section>
          <Section
            title="Recent requests"
            action={
              <Link to="/stats/requests" viewTransition className="hover:text-foreground">
                All requests
              </Link>
            }
          >
            <RecentTable rows={details.recent} />
          </Section>
        </>
      )}
    </>
  )
}

function Ranking({
  title,
  rows,
  total,
}: {
  title: string
  rows: { name: string; count: number }[]
  total: number
}) {
  return (
    <Section title={title} action="Views">
      <RankedList rows={rows} total={total} />
    </Section>
  )
}

const ratings: Record<Rating, { label: string; dot: string }> = {
  good: { label: 'Good', dot: 'bg-success' },
  'needs improvement': { label: 'Needs improvement', dot: 'bg-warning' },
  poor: { label: 'Poor', dot: 'bg-destructive' },
}

function vital(label: string, key: Vital, value: number | null): Metric {
  if (value === null) return { label, value: '—', detail: 'No data yet' }
  const rating = ratings[rate(key, value)]
  return {
    label,
    value: `${Math.round(value).toLocaleString('en')} ms`,
    detail: (
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        <span className={cn('size-1.5 rounded-full', rating.dot)} />
        {rating.label}
      </span>
    ),
  }
}

function count(value: number): string {
  return value.toLocaleString('en')
}
