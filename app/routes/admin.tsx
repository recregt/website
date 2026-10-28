import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '~/components/ui/breadcrumb'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Separator } from '~/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '~/components/ui/sidebar'

import { requireAdmin } from '../../server/session.server'
import { analyticsConfigured, type SiteStats, siteStats } from '../../server/stats.server'
import { TrafficChart } from '../admin/chart'
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
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink asChild>
                  <Link to="/">recregt</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Admin</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-6">
          {stats === null ? <NotConfigured /> : <Dashboard range={range} stats={stats} />}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

function Dashboard({ range, stats }: { range: Range; stats: SiteStats }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Views" value={stats.totals.views} />
        <StatCard label="Visitors" value={stats.totals.visitors} />
        <StatCard label="Signed-in views" value={stats.totals.signedIn} />
        <StatCard label="Bot requests" value={stats.totals.bots} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Traffic</CardTitle>
          <CardDescription>Views and visitors over the last {ranges[range]} days.</CardDescription>
          <CardAction>
            <RangeSelect range={range} />
          </CardAction>
        </CardHeader>
        <CardContent>
          <TrafficChart points={stats.series} />
        </CardContent>
      </Card>

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

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="font-mono text-3xl font-normal tracking-tight">{value}</CardTitle>
      </CardHeader>
    </Card>
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

function RangeSelect({ range }: { range: Range }) {
  const navigate = useNavigate()
  return (
    <Select value={range} onValueChange={(value) => navigate(`?range=${value}`)}>
      <SelectTrigger className="w-32 font-mono text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.keys(ranges).map((option) => (
          <SelectItem key={option} value={option}>
            Last {ranges[option as Range]} days
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
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
