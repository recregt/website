import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { type ReactNode, useMemo } from 'react'
import { Link, useNavigation } from 'react-router'

import { PageHeader } from '~/components/page-header'
import { Section } from '~/components/section'
import { Card, CardContent, CardHeader } from '~/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { cn } from '~/lib/utils'

import { requireAdmin } from '../../server/session.server'
import { loadAnalytics, type SiteStats, siteStats } from '../../server/stats.server'
import { Sparkline, seriesTokens, TrafficChart } from '../admin/chart'
import { AnalyticsNotice } from '../admin/notice'
import { parseRange, type Range, rangeLabel } from '../admin/ranges'
import { AdminShell, RangeTabs } from '../admin/shell'
import { Ranked, Recent, Slowest } from '../admin/tables'
import type { Route } from './+types/admin'

export const meta: Route.MetaFunction = () => [
  { title: 'Admin · recregt' },
  { name: 'robots', content: 'noindex' },
]

export async function loader({ context, request }: Route.LoaderArgs) {
  const user = requireAdmin(context)
  const range = parseRange(new URL(request.url).searchParams.get('range'))
  return { range, stats: await loadAnalytics(() => siteStats(range)), user }
}

export default function Admin({ loaderData: { range, stats, user } }: Route.ComponentProps) {
  const loading = useNavigation().state === 'loading'
  return (
    <AdminShell user={user}>
      <div
        aria-busy={loading}
        className={cn(
          'mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-6 transition-opacity duration-150',
          loading && 'opacity-60',
        )}
      >
        <PageHeader eyebrow="Analytics" title="Dashboard" actions={<RangeTabs range={range} />} />
        {stats.ok ? (
          <Dashboard range={range} stats={stats.value} />
        ) : (
          <AnalyticsNotice reason={stats.reason} />
        )}
      </div>
    </AdminShell>
  )
}

function Dashboard({ range, stats }: { range: Range; stats: SiteStats }) {
  const points = stats.series.points
  const views = useMemo(() => points.map((point) => point.views), [points])
  const visitors = useMemo(() => points.map((point) => point.visitors), [points])
  const vitals = stats.performance.vitals
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Views"
          value={stats.totals.views}
          delta={delta(views)}
          spark={<Sparkline values={views} token={seriesTokens.views} />}
        />
        <StatCard
          label="Visitors"
          value={stats.totals.visitors}
          delta={delta(visitors)}
          spark={<Sparkline values={visitors} token={seriesTokens.visitors} />}
        />
        <StatCard label="Signed-in views" value={stats.totals.signedIn} delta={null} />
        <StatCard label="Bot requests" value={stats.totals.bots} delta={null} />
      </div>

      <Section
        title="Traffic"
        description={`Views and visitors over ${rangeLabel(range)}, in UTC.`}
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
          <Ranked rows={stats.pages} />
        </Section>
        <Section title="Referrers">
          <Ranked rows={stats.referrers} />
        </Section>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <TabsSection
          title="Audience"
          tabs={[
            { label: 'Countries', content: <Ranked rows={stats.audience.countries} /> },
            { label: 'Cities', content: <Ranked rows={stats.audience.cities} /> },
            { label: 'Languages', content: <Ranked rows={stats.audience.languages} /> },
          ]}
        />
        <TabsSection
          title="Technology"
          tabs={[
            { label: 'Browsers', content: <Ranked rows={stats.technology.browsers} /> },
            { label: 'Operating systems', content: <Ranked rows={stats.technology.systems} /> },
            { label: 'Devices', content: <Ranked rows={stats.technology.devices} /> },
            { label: 'Screens', content: <Ranked rows={stats.technology.screens} /> },
          ]}
        />
      </div>

      <Section title="Performance">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            <Vital label="TTFB" value={vitals.ttfbMs} />
            <Vital label="FCP" value={vitals.fcpMs} />
            <Vital label="LCP" value={vitals.lcpMs} />
          </div>
          <div className="border-t border-border pt-4">
            <p className="pb-2 text-xs text-muted-foreground">Slowest requests</p>
            <Slowest rows={stats.performance.slowest} />
          </div>
        </div>
      </Section>

      <Section
        title="Recent requests"
        action={
          <Link
            to="/admin/logs"
            className="font-mono text-xs text-muted-foreground hover:text-foreground"
          >
            View all →
          </Link>
        }
      >
        <Recent rows={stats.recent} />
      </Section>
    </>
  )
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
