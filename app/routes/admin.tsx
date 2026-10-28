import { Link } from 'react-router'

import { requireAdmin } from '../../server/session.server'
import { analyticsConfigured, siteStats } from '../../server/stats.server'
import { parseRange, ranges } from '../admin/ranges'
import { Ranked, Recent, Totals, table, Vitals } from '../admin/tables'
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
    <main>
      <h1>Admin</h1>
      <nav>
        {Object.keys(ranges).map((option) => (
          <Link key={option} to={`?range=${option}`} aria-current={option === range}>
            {option}
          </Link>
        ))}
      </nav>

      {stats === null ? (
        <p>Analytics is not configured: set the ANALYTICS_TOKEN secret.</p>
      ) : (
        <>
          <Totals totals={stats.totals} daily={stats.daily} />

          <h2>Content</h2>
          <Ranked title="Pages" rows={stats.content.pages} />
          <table {...table}>
            <caption>Reading</caption>
            <thead>
              <tr>
                <th>Page</th>
                <th>Views</th>
                <th>Avg. visible</th>
                <th>Avg. scroll</th>
              </tr>
            </thead>
            <tbody>
              {stats.content.reading.map((row) => (
                <tr key={row.name}>
                  <td>{row.name}</td>
                  <td>{row.views}</td>
                  <td>{(row.visibleMs / 1000).toFixed(1)} s</td>
                  <td>{Math.round(row.scrollDepth)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Ranked title="Not found (404)" rows={stats.content.notFound} />

          <h2>Sources</h2>
          <Ranked title="Referrers" rows={stats.sources.referrers} />
          <Ranked title="Campaigns" rows={stats.sources.campaigns} />

          <h2>Audience</h2>
          <Ranked title="Countries" rows={stats.audience.countries} />
          <Ranked title="Cities" rows={stats.audience.cities} />
          <Ranked title="Networks" rows={stats.audience.networks} />
          <Ranked title="Languages" rows={stats.audience.languages} />
          <Ranked title="Timezones" rows={stats.audience.timezones} />

          <h2>Technology</h2>
          <Ranked title="Browsers" rows={stats.technology.browsers} />
          <Ranked title="Operating systems" rows={stats.technology.systems} />
          <Ranked title="Devices" rows={stats.technology.devices} />
          <Ranked title="GPUs" rows={stats.technology.gpus} />
          <Ranked title="Screens" rows={stats.technology.screens} />
          <Ranked title="Color scheme" rows={stats.technology.colorSchemes} />
          <Ranked title="Connection" rows={stats.technology.connections} />

          <h2>Performance</h2>
          <Vitals vitals={stats.performance.vitals} />
          <table {...table}>
            <caption>Slowest server responses</caption>
            <thead>
              <tr>
                <th>Path</th>
                <th>Avg.</th>
                <th>Requests</th>
              </tr>
            </thead>
            <tbody>
              {stats.performance.slowest.map((row) => (
                <tr key={row.name}>
                  <td>{row.name}</td>
                  <td>{Math.round(row.ms)} ms</td>
                  <td>{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2>Recent requests</h2>
          <Recent rows={stats.recent} />
        </>
      )}
    </main>
  )
}
