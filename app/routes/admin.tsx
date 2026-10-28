import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useNavigation } from 'react-router'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { cn } from '~/lib/utils'

import { requireAdmin } from '../../server/session.server'
import { analyticsConfigured, type SiteStats, siteStats } from '../../server/stats.server'
import { Sparkline, seriesColors, TrafficChart } from '../admin/chart'
import { parseRange, type Range, ranges } from '../admin/ranges'
import { AdminShell, RangeTabs } from '../admin/shell'
import { Ranked, Reading, Recent, Slowest, Vitals } from '../admin/tables'
import type { Route } from './+types/admin'

export const meta: Route.MetaFunction = () => [
  { title: 'Admin · recregt' },
  { name: 'robots', content: 'noindex' },
]

export async function loader({ context, request }: Route.LoaderArgs) {
  const user = requireAdmin(context)
  const range = parseRange(new URL(request.url).searchParams.get('range'))
  if (!analyticsConfigured()) return { range, stats: null, user }
  return { range, stats: await siteStats(range), user }
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
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
              Analytics
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          </div>
          <RangeTabs range={range} />
        </div>
        {stats === null ? <NotConfigured /> : <Dashboard range={range} stats={stats} />}
      </div>
    </AdminShell>
  )
}

function Dashboard({ range, stats }: { range: Range; stats: SiteStats }) {
  const views = stats.series.map((point) => point.views)
  const visitors = stats.series.map((point) => point.visitors)
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Views"
          value={stats.totals.views}
          delta={delta(views)}
          spark={{ values: views, color: seriesColors.views }}
        />
        <StatCard
          label="Visitors"
          value={stats.totals.visitors}
          delta={delta(visitors)}
          spark={{ values: visitors, color: seriesColors.visitors }}
        />
        <StatCard label="Signed-in views" value={stats.totals.signedIn} delta={null} />
        <StatCard label="Bot requests" value={stats.totals.bots} delta={null} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <CardTitle className="font-sans">Traffic</CardTitle>
            <span className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: seriesColors.views }}
              />
              Views
              <span
                className="ml-2 size-2 rounded-full"
                style={{ backgroundColor: seriesColors.visitors }}
              />
              Visitors
            </span>
          </div>
          <CardDescription>Views and visitors over the last {ranges[range]} days.</CardDescription>
        </CardHeader>
        <CardContent>
          <TrafficChart points={stats.series} />
        </CardContent>
      </Card>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <SectionCard title="Content">
          <Ranked rows={stats.content.pages} />
          <Reading rows={stats.content.reading} />
          <Ranked rows={stats.content.notFound} />
        </SectionCard>
        <SectionCard title="Sources">
          <Ranked rows={stats.sources.referrers} />
          <Ranked rows={stats.sources.campaigns} />
        </SectionCard>
        <SectionCard title="Audience">
          <Ranked rows={stats.audience.countries} />
          <Ranked rows={stats.audience.cities} />
          <Ranked rows={stats.audience.networks} />
          <Ranked rows={stats.audience.languages} />
          <Ranked rows={stats.audience.timezones} />
        </SectionCard>
        <SectionCard title="Technology">
          <Ranked rows={stats.technology.browsers} />
          <Ranked rows={stats.technology.systems} />
          <Ranked rows={stats.technology.devices} />
          <Ranked rows={stats.technology.gpus} />
          <Ranked rows={stats.technology.screens} />
          <Ranked rows={stats.technology.colorSchemes} />
          <Ranked rows={stats.technology.connections} />
        </SectionCard>
        <SectionCard title="Performance">
          <Vitals vitals={stats.performance.vitals} />
          <Slowest rows={stats.performance.slowest} />
        </SectionCard>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-sans">Recent requests</CardTitle>
            <Link
              to="/admin/logs"
              className="flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-foreground"
            >
              View all →
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <Recent rows={stats.recent.slice(0, 10)} />
        </CardContent>
      </Card>
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
  spark?: { values: number[]; color: string }
}) {
  return (
    <Card className="ring-border transition-shadow hover:ring-emerald-500/30">
      <CardHeader className="p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs text-muted-foreground">{label}</p>
          <Trend value={change} />
        </div>
        <p className="text-2xl font-semibold tracking-tight text-zinc-100 tabular-nums">
          {value.toLocaleString()}
        </p>
      </CardHeader>
      {spark && (
        <CardContent className="px-4 pb-4 pt-0">
          <Sparkline values={spark.values} color={spark.color} />
        </CardContent>
      )}
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
        up ? 'text-emerald-400' : 'text-rose-400',
      )}
      title="Second half vs first half of the range"
    >
      <Icon className="size-3" />
      {Math.abs(value).toFixed(1)}%
    </span>
  )
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader className="p-4 pb-3">
        <CardTitle className="font-sans text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="space-y-6">{children}</div>
      </CardContent>
    </Card>
  )
}

function NotConfigured() {
  return (
    <Card>
      <CardContent className="text-muted-foreground">
        Analytics is not configured: set the ANALYTICS_TOKEN secret.
      </CardContent>
    </Card>
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
