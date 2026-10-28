import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useNavigation } from 'react-router'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '~/components/ui/breadcrumb'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Separator } from '~/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '~/components/ui/sidebar'
import { cn } from '~/lib/utils'

import { requireAdmin } from '../../server/session.server'
import { analyticsConfigured, type SiteStats, siteStats } from '../../server/stats.server'
import { Sparkline, seriesColors, TrafficChart } from '../admin/chart'
import { parseRange, type Range, ranges } from '../admin/ranges'
import { AppSidebar } from '../admin/sidebar'
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
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-1 h-4!" />
          <Breadcrumb>
            <BreadcrumbList className="font-mono text-xs">
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink asChild>
                  <Link to="/">recregt</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>admin</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <div className="flex flex-1 flex-col">
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
        </div>
      </SidebarInset>
    </SidebarProvider>
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
            <span className="flex items-center gap-1.5 font-mono text-[11px] text-foreground/70">
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

      <div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard title="Pages">
          <Ranked rows={stats.content.pages} />
        </MetricCard>
        <MetricCard title="Reading">
          <Reading rows={stats.content.reading} />
        </MetricCard>
        <MetricCard title="Not found (404)">
          <Ranked rows={stats.content.notFound} />
        </MetricCard>
        <MetricCard title="Referrers">
          <Ranked rows={stats.sources.referrers} />
        </MetricCard>
        <MetricCard title="Campaigns">
          <Ranked rows={stats.sources.campaigns} />
        </MetricCard>
        <MetricCard title="Countries">
          <Ranked rows={stats.audience.countries} />
        </MetricCard>
        <MetricCard title="Cities">
          <Ranked rows={stats.audience.cities} />
        </MetricCard>
        <MetricCard title="Networks">
          <Ranked rows={stats.audience.networks} />
        </MetricCard>
        <MetricCard title="Languages">
          <Ranked rows={stats.audience.languages} />
        </MetricCard>
        <MetricCard title="Timezones">
          <Ranked rows={stats.audience.timezones} />
        </MetricCard>
        <MetricCard title="Browsers">
          <Ranked rows={stats.technology.browsers} />
        </MetricCard>
        <MetricCard title="Operating systems">
          <Ranked rows={stats.technology.systems} />
        </MetricCard>
        <MetricCard title="Devices">
          <Ranked rows={stats.technology.devices} />
        </MetricCard>
        <MetricCard title="GPUs">
          <Ranked rows={stats.technology.gpus} />
        </MetricCard>
        <MetricCard title="Screens">
          <Ranked rows={stats.technology.screens} />
        </MetricCard>
        <MetricCard title="Color scheme">
          <Ranked rows={stats.technology.colorSchemes} />
        </MetricCard>
        <MetricCard title="Connection">
          <Ranked rows={stats.technology.connections} />
        </MetricCard>
        <MetricCard title="Web vitals" description="75th percentile">
          <Vitals vitals={stats.performance.vitals} />
        </MetricCard>
        <MetricCard title="Slowest responses">
          <Slowest rows={stats.performance.slowest} />
        </MetricCard>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-sans">Recent requests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Recent rows={stats.recent} />
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
    <Card className="transition-shadow hover:ring-ring/25">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardDescription className="font-mono text-[11px] tracking-wider uppercase">
            {label}
          </CardDescription>
          <Trend value={change} />
        </div>
        <CardTitle className="font-mono text-3xl font-normal tracking-tight tabular-nums">
          {value.toLocaleString()}
        </CardTitle>
      </CardHeader>
      {spark && (
        <CardContent className="px-0 pt-0">
          <Sparkline values={spark.values} color={spark.color} />
        </CardContent>
      )}
    </Card>
  )
}

function Trend({ value }: { value: number | null }) {
  if (value === null) return <span className="font-mono text-xs text-muted-foreground">—</span>
  const up = value >= 0
  const Icon = up ? ArrowUpRight : ArrowDownRight
  return (
    <span
      className={cn(
        'flex items-center gap-0.5 font-mono text-xs tabular-nums',
        up ? 'text-chart-3' : 'text-destructive',
      )}
      title="Second half vs first half of the range"
    >
      <Icon className="size-3" />
      {Math.abs(value).toFixed(1)}%
    </span>
  )
}

function MetricCard({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-sans text-sm">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  )
}

function RangeTabs({ range }: { range: Range }) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted p-0.5">
      {Object.keys(ranges).map((option) => (
        <Link
          key={option}
          to={`?range=${option}`}
          aria-current={option === range ? 'page' : undefined}
          className={cn(
            'rounded-md px-2.5 py-1 font-mono text-xs transition-colors',
            option === range
              ? 'bg-background text-foreground shadow-sm'
              : 'text-foreground/60 hover:text-foreground',
          )}
        >
          {option}
        </Link>
      ))}
    </div>
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
