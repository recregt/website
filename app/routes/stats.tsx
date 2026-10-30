import { Link } from 'react-router'

import { Page } from '~/components/page'
import { PageHeader } from '~/components/page-header'
import { Section } from '~/components/section'
import { cn } from '~/lib/utils'

import { userContext } from '../../server/session.server'
import {
  fullStats,
  loadAnalytics,
  publicStats,
  type SiteStats,
  type StatsDetails,
} from '../../server/stats.server'
import { can } from '../auth/access'
import { TrafficChart } from '../stats/chart'
import { type Metric, Metrics } from '../stats/metrics'
import { AnalyticsNotice } from '../stats/notice'
import { RangeTabs } from '../stats/range-tabs'
import { parseRange, rangeLabel } from '../stats/ranges'
import { RankedList } from '../stats/ranked-list'
import { RecentTable, SlowestTable } from '../stats/tables'
import { type Rating, rate, type Vital } from '../stats/vitals'
import type { Route } from './+types/stats'

export const meta: Route.MetaFunction = () => [
  { title: 'Stats · recregt' },
  { name: 'description', content: 'Public, anonymized traffic numbers for recregt.' },
]

export async function loader({ context, request }: Route.LoaderArgs) {
  const site = new URL(request.url)
  const range = parseRange(site.searchParams.get('range'))
  const full = can(context.get(userContext), 'stats:full')
  const stats = await loadAnalytics<SiteStats>(() =>
    full ? fullStats(range, site) : publicStats(range, site),
  )
  return { range, stats }
}

export default function StatsPage({ loaderData: { range, stats } }: Route.ComponentProps) {
  const live = stats.ok && stats.value.details !== null
  return (
    <Page>
      <PageHeader
        title="Stats"
        description={
          live
            ? `Live numbers over ${rangeLabel(range)}, in UTC.`
            : `Anonymized traffic over ${rangeLabel(range)}. Complete ${range === '1d' ? 'hours' : 'days'} only, in UTC.`
        }
        actions={<RangeTabs range={range} />}
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

      <div className="gap-6 md:columns-2 [&>section]:mb-6 [&>section]:break-inside-avoid">
        <Section title="Pages">
          <RankedList rows={stats.pages} total={total} />
        </Section>
        {details && (
          <Section title="Referrers">
            <RankedList rows={details.referrers} total={total} />
          </Section>
        )}
        <Section title="Countries">
          <RankedList rows={stats.countries} total={total} />
        </Section>
        {details && (
          <Section title="Cities">
            <RankedList rows={details.cities} total={total} />
          </Section>
        )}
        <Section title="Browsers">
          <RankedList rows={stats.browsers} total={total} />
        </Section>
        <Section title="Devices">
          <RankedList rows={stats.devices} total={total} />
        </Section>
        {details && <DetailLists details={details} total={total} />}
      </div>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-sm font-medium">Performance</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            75th percentile across page views, rated against Core Web Vitals thresholds.
          </p>
        </div>
        <Metrics
          className="sm:grid-cols-3"
          items={[
            vital('Time to first byte', 'ttfbMs', stats.vitals.ttfbMs),
            vital('First contentful paint', 'fcpMs', stats.vitals.fcpMs),
            vital('Largest contentful paint', 'lcpMs', stats.vitals.lcpMs),
          ]}
        />
      </section>

      {details && (
        <>
          <Section title="Slowest pages" description="Average response time per page view.">
            <SlowestTable rows={details.slowest} />
          </Section>
          <Section
            title="Recent requests"
            action={
              <Link
                to="/admin"
                viewTransition
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                All logs
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

function DetailLists({ details, total }: { details: StatsDetails; total: number }) {
  return (
    <>
      <Section title="Operating systems">
        <RankedList rows={details.systems} total={total} />
      </Section>
      <Section title="Screens">
        <RankedList rows={details.screens.rows} total={details.screens.measuredViews} />
      </Section>
      <Section title="Languages">
        <RankedList rows={details.languages} total={total} />
      </Section>
    </>
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
