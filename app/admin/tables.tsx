import { useMemo, useState } from 'react'

import type { SiteStats } from '../../server/stats.server'
import { columnHelper, DataTable } from './data-table'

type RankedRow = { name: string; count: number; share: number }
type RecentRow = SiteStats['recent'][number]
type ReadingRow = SiteStats['content']['reading'][number]
type SlowRow = SiteStats['performance']['slowest'][number]

const ranked = columnHelper<RankedRow>()
const rankedColumns = ranked.columns([
  ranked.accessor('name', { header: 'Name' }),
  ranked.accessor('count', { header: 'Count' }),
  ranked.accessor('share', {
    header: 'Share',
    cell: (info) => <meter value={info.getValue()} max={1} title={percent(info.getValue())} />,
  }),
])

const recent = columnHelper<RecentRow>()
const recentColumns = recent.columns([
  recent.accessor('timestamp', { header: 'Time (UTC)' }),
  recent.accessor('kind', { header: 'Kind' }),
  recent.accessor('path', { header: 'Path' }),
  recent.accessor('status', { header: 'Status' }),
  recent.accessor('handle', {
    header: 'User',
    cell: (info) => info.getValue() && `@${info.getValue()}`,
  }),
  recent.accessor('ip', { header: 'IP' }),
  recent.accessor((row) => [row.city, row.country].filter(Boolean).join(', '), {
    id: 'location',
    header: 'Location',
  }),
  recent.accessor('network', { header: 'Network' }),
  recent.accessor((row) => `${row.browser} · ${row.os} · ${row.device}`, {
    id: 'client',
    header: 'Client',
  }),
  recent.accessor('referrer', { header: 'Referrer' }),
])

const reading = columnHelper<ReadingRow>()
const readingColumns = reading.columns([
  reading.accessor('name', { header: 'Page' }),
  reading.accessor('views', { header: 'Views' }),
  reading.accessor('visibleMs', {
    header: 'Avg. visible',
    cell: (info) => `${(info.getValue() / 1000).toFixed(1)} s`,
  }),
  reading.accessor('scrollDepth', {
    header: 'Avg. scroll',
    cell: (info) => (
      <meter value={info.getValue()} max={100} title={`${Math.round(info.getValue())}%`} />
    ),
  }),
])

const slow = columnHelper<SlowRow>()
const slowColumns = slow.columns([
  slow.accessor('name', { header: 'Path' }),
  slow.accessor('ms', { header: 'Avg.', cell: (info) => `${Math.round(info.getValue())} ms` }),
  slow.accessor('count', { header: 'Requests' }),
])

export function Reading({ rows }: { rows: ReadingRow[] }) {
  return <DataTable caption="Reading" columns={readingColumns} data={rows} />
}

export function Slowest({ rows }: { rows: SlowRow[] }) {
  return <DataTable caption="Slowest server responses" columns={slowColumns} data={rows} />
}

export function Totals({ totals }: Pick<SiteStats, 'totals'>) {
  return (
    <table border={1} cellPadding={8} cellSpacing={0}>
      <tbody>
        <tr>
          <th>Views</th>
          <th>Visitors</th>
          <th>Signed-in views</th>
          <th>Bot requests</th>
        </tr>
        <tr>
          <td align="center">
            <big>{totals.views}</big>
          </td>
          <td align="center">
            <big>{totals.visitors}</big>
          </td>
          <td align="center">
            <big>{totals.signedIn}</big>
          </td>
          <td align="center">
            <big>{totals.bots}</big>
          </td>
        </tr>
      </tbody>
    </table>
  )
}

export function Ranked({
  title,
  rows,
}: {
  title: string
  rows: { name: string; count: number }[]
}) {
  const data = useMemo(() => {
    const total = rows.reduce((sum, row) => sum + row.count, 0)
    return rows.map((row) => ({ ...row, share: total ? row.count / total : 0 }))
  }, [rows])
  return <DataTable caption={title} columns={rankedColumns} data={data} />
}

export function Recent({ rows }: { rows: RecentRow[] }) {
  const [hideBots, setHideBots] = useState(true)
  const data = useMemo(() => (hideBots ? rows.filter((row) => !row.bot) : rows), [rows, hideBots])
  return (
    <>
      <p>
        <label>
          <input
            type="checkbox"
            checked={hideBots}
            onChange={(event) => setHideBots(event.target.checked)}
          />{' '}
          Hide bots
        </label>
      </p>
      <DataTable columns={recentColumns} data={data} searchable />
    </>
  )
}

export function Vitals({ vitals }: { vitals: SiteStats['performance']['vitals'] }) {
  const ms = (value: number | null) => (value === null ? '—' : `${Math.round(value)} ms`)
  const rows: [string, string][] = [
    ['Time to first byte', ms(vitals.ttfbMs)],
    ['First contentful paint', ms(vitals.fcpMs)],
    ['Largest contentful paint', ms(vitals.lcpMs)],
    ['Cumulative layout shift', vitals.cls === null ? '—' : vitals.cls.toFixed(3)],
    ['Slowest interaction', ms(vitals.interactionMs)],
  ]
  return (
    <table border={1} cellPadding={6} cellSpacing={0}>
      <caption>Web Vitals (75th percentile)</caption>
      <tbody>
        {rows.map(([name, value]) => (
          <tr key={name}>
            <td>{name}</td>
            <td align="right">{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function percent(share: number): string {
  return `${Math.round(share * 100)}%`
}
