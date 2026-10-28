import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { requireAdmin } from '../../server/session.server'
import { analyticsConfigured, siteStats } from '../../server/stats.server'
import { TrafficChart } from '../admin/chart'
import { parseRange, ranges } from '../admin/ranges'
import { Ranked, Reading, Recent, Slowest, Totals, Vitals } from '../admin/tables'
import type { Route } from './+types/admin'

export const meta: Route.MetaFunction = () => [
  { title: 'Admin · recregt' },
  { name: 'robots', content: 'noindex' },
]

export async function loader({ context, request }: Route.LoaderArgs) {
  requireAdmin(context)
  const range = parseRange(new URL(request.url).searchParams.get('range'))
  if (!analyticsConfigured()) return { range, stats: null }
  return { range, stats: await siteStats(range) }
}

export default function Admin({ loaderData: { range, stats } }: Route.ComponentProps) {
  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">Admin</h1>
      <p>
        Range:{' '}
        {Object.keys(ranges).map((option) => (
          <span key={option}>
            {option === range ? (
              <b className="font-semibold">{option}</b>
            ) : (
              <Link className="underline underline-offset-4" to={`?range=${option}`}>
                {option}
              </Link>
            )}{' '}
          </span>
        ))}
      </p>

      {stats === null ? (
        <p>Analytics is not configured: set the ANALYTICS_TOKEN secret.</p>
      ) : (
        <>
          <Totals totals={stats.totals} />
          <TrafficChart points={stats.series} />

          <Section title="Content">
            <Ranked title="Pages" rows={stats.content.pages} />
            <Reading rows={stats.content.reading} />
            <Ranked title="Not found (404)" rows={stats.content.notFound} />
          </Section>

          <Section title="Sources">
            <Ranked title="Referrers" rows={stats.sources.referrers} />
            <Ranked title="Campaigns" rows={stats.sources.campaigns} />
          </Section>

          <Section title="Audience">
            <Ranked title="Countries" rows={stats.audience.countries} />
            <Ranked title="Cities" rows={stats.audience.cities} />
            <Ranked title="Networks" rows={stats.audience.networks} />
            <Ranked title="Languages" rows={stats.audience.languages} />
            <Ranked title="Timezones" rows={stats.audience.timezones} />
          </Section>

          <Section title="Technology">
            <Ranked title="Browsers" rows={stats.technology.browsers} />
            <Ranked title="Operating systems" rows={stats.technology.systems} />
            <Ranked title="Devices" rows={stats.technology.devices} />
            <Ranked title="GPUs" rows={stats.technology.gpus} />
            <Ranked title="Screens" rows={stats.technology.screens} />
            <Ranked title="Color scheme" rows={stats.technology.colorSchemes} />
            <Ranked title="Connection" rows={stats.technology.connections} />
          </Section>

          <Section title="Performance">
            <Vitals vitals={stats.performance.vitals} />
            <Slowest rows={stats.performance.slowest} />
          </Section>

          <Section title="Recent requests">
            <Recent rows={stats.recent} />
          </Section>
        </>
      )}
    </main>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details open className="space-y-3">
      <summary className="font-semibold">{title}</summary>
      {children}
    </details>
  )
}
