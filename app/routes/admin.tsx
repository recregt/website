import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'

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
  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
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
        <div className="admin-dark flex flex-1 flex-col">
          <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
                  Analytics
                </p>
                <h1 className="font-heading text-3xl font-semibold tracking-tight">Dashboard</h1>
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
            <CardTitle>Traffic</CardTitle>
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

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <SectionCard title="Content">
          <Ranked title="Pages" rows={stats.content.pages} />
          <Reading rows={stats.content.reading} />
          <Ranked title="Not found (404)" rows={stats.content.notFound} />
        </SectionCard>

        <SectionCard title="Sources">
          <Ranked title="Referrers" rows={stats.sources.referrers} />
          <Ranked title="Campaigns" rows={stats.sources.campaigns} />
        </SectionCard>

        <SectionCard title="Audience">
          <Ranked title="Countries" rows={stats.audience.countries} />
          <Ranked title="Cities" rows={stats.audience.cities} />
          <Ranked title="Networks" rows={stats.audience.networks} />
          <Ranked title="Languages" rows={stats.audience.languages} />
          <Ranked title="Timezones" rows={stats.audience.timezones} />
        </SectionCard>

        <SectionCard title="Technology">
          <Ranked title="Browsers" rows={stats.technology.browsers} />
          <Ranked title="Operating systems" rows={stats.technology.systems} />
          <Ranked title="Devices" rows={stats.technology.devices} />
          <Ranked title="GPUs" rows={stats.technology.gpus} />
          <Ranked title="Screens" rows={stats.technology.screens} />
          <Ranked title="Color scheme" rows={stats.technology.colorSchemes} />
          <Ranked title="Connection" rows={stats.technology.connections} />
        </SectionCard>
      </div>

      <SectionCard title="Performance">
        <Vitals vitals={stats.performance.vitals} />
        <Slowest rows={stats.performance.slowest} />
      </SectionCard>

      <Card>
        <CardHeader>
          <CardTitle>Recent requests</CardTitle>
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

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">{children}</CardContent>
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
              : 'text-muted-foreground hover:text-foreground',
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
