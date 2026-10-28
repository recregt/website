import { useMemo } from 'react'

import { Table, TableBody, TableCell, TableRow } from '~/components/ui/table'
import { cn } from '~/lib/utils'

import type { SiteStats } from '../../server/stats.server'
import { columnHelper, DataTable } from './data-table'

type RankedRow = { name: string; count: number; share: number }
type RecentRow = SiteStats['recent'][number]
type ReadingRow = SiteStats['content']['reading'][number]
type SlowRow = SiteStats['performance']['slowest'][number]

const ranked = columnHelper<RankedRow>()
const rankedColumns = ranked.columns([
  ranked.accessor('name', {
    header: 'Name',
    cell: (info) => <span className="block max-w-64 truncate">{info.getValue()}</span>,
  }),
  ranked.accessor('count', {
    header: 'Count',
    cell: (info) => <span className="tabular-nums">{info.getValue().toLocaleString()}</span>,
  }),
  ranked.accessor('share', {
    header: 'Share',
    cell: (info) => <Bar value={info.getValue()} max={1} />,
  }),
])

const recent = columnHelper<RecentRow>()
const recentColumns = recent.columns([
  recent.accessor('timestamp', {
    header: 'Time',
    cell: (info) => <span className="font-mono text-xs">{info.getValue()}</span>,
  }),
  recent.accessor('status', {
    header: 'Status',
    cell: (info) => <StatusBadge status={info.getValue()} />,
  }),
  recent.accessor('path', {
    header: 'Path',
    cell: (info) => <span className="block max-w-72 truncate">{info.getValue()}</span>,
  }),
  recent.accessor('durationMs', {
    header: 'Duration',
    cell: (info) => <span className="tabular-nums">{Math.round(info.getValue())} ms</span>,
  }),
])

const reading = columnHelper<ReadingRow>()
const readingColumns = reading.columns([
  reading.accessor('name', {
    header: 'Page',
    cell: (info) => <span className="block max-w-64 truncate">{info.getValue()}</span>,
  }),
  reading.accessor('views', { header: 'Views' }),
  reading.accessor('visibleMs', {
    header: 'Avg. visible',
    cell: (info) => `${(info.getValue() / 1000).toFixed(1)} s`,
  }),
  reading.accessor('scrollDepth', {
    header: 'Avg. scroll',
    cell: (info) => <Bar value={info.getValue()} max={100} />,
  }),
])

const slow = columnHelper<SlowRow>()
const slowColumns = slow.columns([
  slow.accessor('name', {
    header: 'Path',
    cell: (info) => <span className="block max-w-72 truncate">{info.getValue()}</span>,
  }),
  slow.accessor('ms', { header: 'Avg.', cell: (info) => `${Math.round(info.getValue())} ms` }),
  slow.accessor('count', { header: 'Requests' }),
])

export function Reading({ rows }: { rows: ReadingRow[] }) {
  return <DataTable columns={readingColumns} data={rows} />
}

export function Slowest({ rows }: { rows: SlowRow[] }) {
  return <DataTable columns={slowColumns} data={rows} />
}

export function Ranked({ rows }: { rows: { name: string; count: number }[] }) {
  const data = useMemo(() => {
    const total = rows.reduce((sum, row) => sum + row.count, 0)
    return rows.map((row) => ({ ...row, share: total ? row.count / total : 0 }))
  }, [rows])
  return <DataTable columns={rankedColumns} data={data} />
}

export function Recent({ rows }: { rows: RecentRow[] }) {
  return <DataTable columns={recentColumns} data={rows} />
}

export function StatusBadge({ status }: { status: number }) {
  const ok = status < 400
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2 py-0.5 text-xs tabular-nums text-zinc-200',
        ok ? 'border-emerald-500/20' : 'border-rose-500/20',
      )}
    >
      <span className={cn('size-1.5 rounded-full', ok ? 'bg-emerald-400' : 'bg-rose-400')} />
      {status}
    </span>
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
      <TableBody>
        {rows.map(([name, value]) => (
          <TableRow key={name}>
            <TableCell className="text-muted-foreground">{name}</TableCell>
            <TableCell className="text-right tabular-nums">{value}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function Bar({ value, max }: { value: number; max: number }) {
  const share = Math.max(0, Math.min(1, value / max))
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-1 w-24 overflow-hidden rounded-full bg-[#1f2023]">
        <div
          className="h-full rounded-full bg-emerald-500 transition-[width] duration-300"
          style={{ width: `${share * 100}%` }}
        />
      </div>
      <span className="w-10 text-right text-xs tabular-nums text-zinc-200">
        {Math.round(share * 100)}%
      </span>
    </div>
  )
}
