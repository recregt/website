import { Notice } from '~/components/notice'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'
import { cn } from '~/lib/utils'

import type { StatsDetails } from '../../server/stats.server'

export function SlowestTable({ rows }: { rows: StatsDetails['slowest'] }) {
  if (rows.length === 0) return <Notice>No data yet</Notice>
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Path</TableHead>
          <TableHead className="text-right">Average</TableHead>
          <TableHead className="text-right">Requests</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.name}>
            <TableCell>
              <span className="block max-w-96 truncate">{row.name}</span>
            </TableCell>
            <TableCell className="text-right tabular-nums">{Math.round(row.ms)} ms</TableCell>
            <TableCell className="text-right tabular-nums">
              {row.count.toLocaleString('en')}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function RecentTable({ rows }: { rows: StatsDetails['recent'] }) {
  if (rows.length === 0) return <Notice>No data yet</Notice>
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Time (UTC)</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Path</TableHead>
          <TableHead className="text-right">Duration</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={`${row.timestamp}-${row.ip}-${row.path}`}>
            <TableCell className="text-muted-foreground tabular-nums">{row.timestamp}</TableCell>
            <TableCell>
              <StatusBadge status={row.status} />
            </TableCell>
            <TableCell>
              <span className="block max-w-96 truncate">{row.path}</span>
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {Math.round(row.durationMs)} ms
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function StatusBadge({ status }: { status: number }) {
  const ok = status < 400
  return (
    <span className="inline-flex items-center gap-1.5 tabular-nums">
      <span className={cn('size-1.5 rounded-full', ok ? 'bg-success' : 'bg-destructive')} />
      {status}
    </span>
  )
}
