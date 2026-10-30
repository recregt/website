import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { type ReactNode, useMemo } from 'react'
import { Link } from 'react-router'

import { PageHeader } from '~/components/page-header'
import { Section } from '~/components/section'
import { Card, CardContent, CardHeader } from '~/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { cn } from '~/lib/utils'

import { listPosts } from '../../server/blog.server'
import { userContext } from '../../server/session.server'
import {
  fullStats,
  loadAnalytics,
  publicStats,
  type SiteStats,
  type StatsDetails,
} from '../../server/stats.server'
import { can } from '../auth/access'
import { Sparkline, seriesTokens, TrafficChart } from '../stats/chart'
import { AnalyticsNotice } from '../stats/notice'
import { RangeTabs } from '../stats/range-tabs'
import { parseRange, type Range, rangeLabel } from '../stats/ranges'
import { Ranked, Recent, Slowest } from '../stats/tables'
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
    full ? fullStats(range, site) : publicStats(range, site, publicPages),
  )
  return { range, stats }
}

async function publicPages(): Promise<string[]> {
  const posts = await listPosts()
  return ['/', '/blog', '/stats', ...posts.map((post) => `/blog/${post.slug}`)]
}

export default function StatsPage({ loaderData: { range, stats } }: Route.ComponentProps) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <PageHeader
        eyebrow="Analytics"
        title="Stats"
        description={
          stats.ok && stats.value.details
            ? `Everything over ${rangeLabel(range)}, live, in UTC.`
            : `Anonymized traffic over ${rangeLabel(range)}. Complete ${range === '1d' ? 'hours' : 'days'} only, in UTC.`
        }
        actions={<RangeTabs range={range} />}
      />
      {stats.ok ? <Stats stats={stats.value} /> : <AnalyticsNotice reason={stats.reason} />}
    </main>
  )
}

function Stats({ stats }: { stats: SiteStats }) {
  const points = stats.series.points
  const views = useMemo(() => points.map((point) => point.views), [points])
  const visitors = useMemo(() => points.map((point) => point.visitors), [points])
  const total = stats.totals.views
  const details = stats.details
  return (
    <>
      <div className={cn('grid gap-4 sm:grid-cols-2', details && 'xl:grid-cols-4')}>
        <StatCard
          label="Views"
          value={total}
          delta={delta(views)}
          spark={<Sparkline values={views} token={seriesTokens.views} />}
        />
        <StatCard
          label="Visitors"
          value={stats.totals.visitors}
          delta={delta(visitors)}
          spark={<Sparkline values={visitors} token={seriesTokens.visitors} />}
        />
        {details && (
          <>
            <StatCard label="Signed-in views" value={details.signedInViews} delta={null} />
            <StatCard label="Bot requests" value={details.botRequests} delta={null} />
          </>
        )}
      </div>

      <Section
        title="Traffic"
        action={
          <span className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
            <span className="size-2 rounded-full bg-chart-1" />
            Views
            <span className="ml-2 size-2 rounded-full bg-chart-2" />
            Visitors
          </span>
        }
      >
        <TrafficChart series={stats.series} />
      </Section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Top pages">
          <Ranked rows={stats.pages} total={total} />
        </Section>
        <Section title="Referrers">
          <Ranked rows={stats.referrers} total={total} />
        </Section>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <TabsSection
          title="Audience"
          tabs={[
            { label: 'Countries', content: <Ranked rows={stats.countries} total={total} /> },
            ...(details ? detailAudience(details, total) : []),
          ]}
        />
        <TabsSection
          title="Technology"
          tabs={[
            { label: 'Browsers', content: <Ranked rows={stats.browsers} total={total} /> },
            { label: 'Devices', content: <Ranked rows={stats.devices} total={total} /> },
            ...(details ? detailTechnology(details, total) : []),
          ]}
        />
      </div>

      <Section title="Performance" description="75th percentile across page views.">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            <Vital label="TTFB" value={stats.vitals.ttfbMs} />
            <Vital label="FCP" value={stats.vitals.fcpMs} />
            <Vital label="LCP" value={stats.vitals.lcpMs} />
          </div>
          {details && (
            <div className="border-t border-border pt-4">
              <p className="pb-2 text-xs text-muted-foreground">Slowest requests</p>
              <Slowest rows={details.slowest} />
            </div>
          )}
        </div>
      </Section>

      {details && (
        <Section
          title="Recent requests"
          action={
            <Link
              to="/admin"
              viewTransition
              className="font-mono text-xs text-muted-foreground hover:text-foreground"
            >
              View all →
            </Link>
          }
        >
          <Recent rows={details.recent} />
        </Section>
      )}
    </>
  )
}

function detailAudience(details: StatsDetails, total: number) {
  return [
    { label: 'Cities', content: <Ranked rows={details.cities} total={total} /> },
    { label: 'Languages', content: <Ranked rows={details.languages} total={total} /> },
  ]
}

function detailTechnology(details: StatsDetails, total: number) {
  return [
    { label: 'Operating systems', content: <Ranked rows={details.systems} total={total} /> },
    {
      label: 'Screens',
      content: <Ranked rows={details.screens.rows} total={details.screens.measuredViews} />,
    },
  ]
}

function StatCard({
  label,
  value,
  delta: change,
  spark,
}: {
  label: string
  value: number
  delta: number | null
  spark?: ReactNode
}) {
  return (
    <Card className="transition-shadow hover:ring-ring/30">
      <CardHeader className="p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs text-muted-foreground">{label}</p>
          <Trend value={change} />
        </div>
        <p className="text-2xl font-semibold tracking-tight tabular-nums">
          {value.toLocaleString()}
        </p>
      </CardHeader>
      {spark && <CardContent className="px-4 pt-0 pb-4">{spark}</CardContent>}
    </Card>
  )
}

function Trend({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-muted-foreground">—</span>
  const up = value >= 0
  const Icon = up ? ArrowUpRight : ArrowDownRight
  return (
    <span
      className={cn(
        'flex items-center gap-0.5 text-xs tabular-nums',
        up ? 'text-success' : 'text-destructive',
      )}
      title="Second half vs first half of the range"
    >
      <Icon className="size-3" />
      {Math.abs(value).toFixed(1)}%
    </span>
  )
}

function Vital({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-md border border-border bg-muted/40 p-3">
      <p className="font-mono text-[11px] tracking-wider text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold tabular-nums">
        {value === null ? '—' : `${Math.round(value)} ms`}
      </p>
    </div>
  )
}

function TabsSection({
  title,
  tabs,
}: {
  title: string
  tabs: { label: string; content: ReactNode }[]
}) {
  return (
    <Section title={title}>
      <Tabs defaultValue={tabs[0]?.label}>
        <TabsList>
          {tabs.map((tab) => (
            <TabsTrigger key={tab.label} value={tab.label} className="font-mono text-xs">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <div className="grid">
          {tabs.map((tab) => (
            <TabsContent
              key={tab.label}
              value={tab.label}
              forceMount
              className="[grid-area:1/1] data-[state=inactive]:invisible"
            >
              {tab.content}
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </Section>
  )
}

function delta(values: number[]): number | null {
  const half = Math.floor(values.length / 2)
  if (half === 0) return null
  const sum = (list: number[]) => list.reduce((total, value) => total + value, 0)
  const before = sum(values.slice(0, half))
  const after = sum(values.slice(half))
  if (!before) return null
  return ((after - before) / before) * 100
}
