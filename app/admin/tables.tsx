import type { SiteStats } from '../../server/stats.server'

export function Totals({ totals, daily }: Pick<SiteStats, 'totals' | 'daily'>) {
  return (
    <>
      <dl>
        <dt>Views</dt>
        <dd>{totals.views}</dd>
        <dt>Visitors</dt>
        <dd>{totals.visitors}</dd>
        <dt>Signed-in views</dt>
        <dd>{totals.signedIn}</dd>
        <dt>Bot requests</dt>
        <dd>{totals.bots}</dd>
      </dl>
      <table>
        <caption>Per day</caption>
        <thead>
          <tr>
            <th>Day</th>
            <th>Views</th>
            <th>Visitors</th>
          </tr>
        </thead>
        <tbody>
          {daily.map((row) => (
            <tr key={row.day}>
              <td>{row.day.slice(0, 10)}</td>
              <td>{row.views}</td>
              <td>{row.visitors}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

export function Ranked({
  title,
  rows,
}: {
  title: string
  rows: { name: string; count: number }[]
}) {
  return (
    <table>
      <caption>{title}</caption>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td>No data yet.</td>
          </tr>
        ) : (
          rows.map((row) => (
            <tr key={row.name}>
              <td>{row.name}</td>
              <td>{row.count}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  )
}

export function Vitals({ vitals }: { vitals: SiteStats['performance']['vitals'] }) {
  const ms = (value: number | null) => (value === null ? '—' : `${Math.round(value)} ms`)
  return (
    <table>
      <caption>Web Vitals (75th percentile)</caption>
      <tbody>
        <tr>
          <td>Time to first byte</td>
          <td>{ms(vitals.ttfbMs)}</td>
        </tr>
        <tr>
          <td>First contentful paint</td>
          <td>{ms(vitals.fcpMs)}</td>
        </tr>
        <tr>
          <td>Largest contentful paint</td>
          <td>{ms(vitals.lcpMs)}</td>
        </tr>
        <tr>
          <td>Cumulative layout shift</td>
          <td>{vitals.cls === null ? '—' : vitals.cls.toFixed(3)}</td>
        </tr>
        <tr>
          <td>Slowest interaction</td>
          <td>{ms(vitals.interactionMs)}</td>
        </tr>
      </tbody>
    </table>
  )
}

export function Recent({ rows }: { rows: SiteStats['recent'] }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Time (UTC)</th>
          <th>Kind</th>
          <th>Path</th>
          <th>Status</th>
          <th>User</th>
          <th>IP</th>
          <th>Location</th>
          <th>Network</th>
          <th>Client</th>
          <th>Referrer</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={[row.timestamp, row.ip, row.kind, row.path, row.status].join('|')}>
            <td>{row.timestamp}</td>
            <td>{row.kind}</td>
            <td>{row.path}</td>
            <td>{row.status}</td>
            <td>{row.handle && `@${row.handle}`}</td>
            <td>{row.ip}</td>
            <td>{[row.city, row.country].filter(Boolean).join(', ')}</td>
            <td>{row.network}</td>
            <td>
              {row.browser} · {row.os} · {row.device}
            </td>
            <td>{row.referrer}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
