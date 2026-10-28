import { useMemo, useState } from 'react'

import { Checkbox } from '~/components/ui/checkbox'
import { Table, TableBody, TableCaption, TableCell, TableRow } from '~/components/ui/table'

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
    <div className="space-y-3">
      <label htmlFor="hide-bots" className="flex items-center gap-2 text-sm">
        <Checkbox
          id="hide-bots"
          checked={hideBots}
          onCheckedChange={(checked) => setHideBots(checked === true)}
        />
        Hide bots
      </label>
      <DataTable columns={recentColumns} data={data} searchable />
    </div>
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
    <Table>
      <TableCaption>Web Vitals (75th percentile)</TableCaption>
      <TableBody>
        {rows.map(([name, value]) => (
          <TableRow key={name}>
            <TableCell className="font-medium">{name}</TableCell>
            <TableCell className="text-right tabular-nums">{value}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function percent(share: number): string {
  return `${Math.round(share * 100)}%`
}
