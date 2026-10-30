import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Notice } from '~/components/notice'
import { PageHeader } from '~/components/page-header'
import { Segmented } from '~/components/segmented'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'

import { requireAccess } from '../../../server/access.server'
import { loadAnalytics, recentRequests } from '../../../server/stats.server'
import { AnalyticsNotice } from '../../stats/notice'
import { RangeTabs } from '../../stats/range-tabs'
import { parseRange, rangeLabel } from '../../stats/ranges'
import { StatusBadge } from '../../stats/tables'
import type { Route } from './+types/index'

const history = 200
const perPage = 50

export const meta: Route.MetaFunction = () => [
  { title: 'Logs · recregt' },
  { name: 'robots', content: 'noindex' },
]

export async function loader({ context, request }: Route.LoaderArgs) {
  requireAccess(context, 'admin')
  const range = parseRange(new URL(request.url).searchParams.get('range'))
  return { range, logs: await loadAnalytics(() => recentRequests(range, history)) }
}

type LogRow = Awaited<ReturnType<typeof recentRequests>>[number]

export default function Logs({ loaderData: { range, logs } }: Route.ComponentProps) {
  return (
    <>
      <PageHeader
        title="Logs"
        description={`The latest ${history} requests over ${rangeLabel(range)}.`}
        actions={<RangeTabs range={range} />}
      />
      {logs.ok ? <LogBrowser logs={logs.value} /> : <AnalyticsNotice reason={logs.reason} />}
    </>
  )
}

function LogBrowser({ logs }: { logs: LogRow[] }) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>('all')
  const [kind, setKind] = useState<string>('all')
  const [page, setPage] = useState(0)

  const kinds = useMemo(() => [...new Set(logs.map((row) => row.kind))].slice(0, 6), [logs])
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return logs.filter((row) => {
      if (status !== 'all' && Math.floor(row.status / 100) !== Number.parseInt(status, 10))
        return false
      if (kind !== 'all' && row.kind !== kind) return false
      if (term && !`${row.path} ${row.ip}`.toLowerCase().includes(term)) return false
      return true
    })
  }, [logs, search, status, kind])

  const pages = Math.max(1, Math.ceil(filtered.length / perPage))
  const current = Math.min(page, pages - 1)
  const rows = filtered.slice(current * perPage, (current + 1) * perPage)

  const update = (setter: (value: string) => void) => (value: string) => {
    setter(value)
    setPage(0)
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Input
          type="search"
          placeholder="Search path or IP"
          value={search}
          onChange={(event) => update(setSearch)(event.target.value)}
          className="w-64"
        />
        <Segmented
          label="Status"
          value={status}
          onChange={update(setStatus)}
          options={['all', '2', '4', '5'].map((option) => ({
            value: option,
            label: option === 'all' ? 'All statuses' : `${option}xx`,
          }))}
        />
        <Segmented
          label="Kind"
          value={kind}
          onChange={update(setKind)}
          options={[
            { value: 'all', label: 'All kinds' },
            ...kinds.map((option) => ({ value: option, label: option })),
          ]}
        />
        <div className="ml-auto flex items-center gap-3 text-sm text-muted-foreground">
          <span className="tabular-nums">
            {filtered.length === 0 ? 0 : current * perPage + 1}–
            {Math.min((current + 1) * perPage, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous page"
              disabled={current === 0}
              onClick={() => setPage(current - 1)}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Next page"
              disabled={current >= pages - 1}
              onClick={() => setPage(current + 1)}
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      </div>

      {rows.length === 0 ? <Notice>No matching requests</Notice> : <LogTable rows={rows} />}
    </>
  )
}

function LogTable({ rows }: { rows: LogRow[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Time (UTC)</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Kind</TableHead>
            <TableHead>Path</TableHead>
            <TableHead>IP</TableHead>
            <TableHead className="text-right">Duration</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={`${row.timestamp}-${row.ip}-${row.path}`}>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {row.timestamp}
              </TableCell>
              <TableCell>
                <StatusBadge status={row.status} />
              </TableCell>
              <TableCell className="text-muted-foreground">{row.kind}</TableCell>
              <TableCell>
                <span className="block max-w-96 truncate font-mono text-xs">{row.path}</span>
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">{row.ip}</TableCell>
              <TableCell className="text-right tabular-nums">
                {Math.round(row.durationMs)} ms
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
