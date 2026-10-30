import { useMemo, useState } from 'react'

import { Notice } from '~/components/notice'
import { PageHeader } from '~/components/page-header'
import { Input } from '~/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'
import { cn } from '~/lib/utils'

import { requireAdmin } from '../../../server/session.server'
import { loadAnalytics, recentRequests } from '../../../server/stats.server'
import { AnalyticsNotice } from '../../admin/notice'
import { RangeTabs } from '../../admin/range-tabs'
import { parseRange, rangeLabel } from '../../admin/ranges'
import { StatusBadge } from '../../admin/tables'
import type { Route } from './+types/logs'

const history = 200
const perPage = 50

export const meta: Route.MetaFunction = () => [
  { title: 'Logs · recregt' },
  { name: 'robots', content: 'noindex' },
]

export async function loader({ context, request }: Route.LoaderArgs) {
  requireAdmin(context)
  const range = parseRange(new URL(request.url).searchParams.get('range'))
  return { range, logs: await loadAnalytics(() => recentRequests(range, history)) }
}

type LogRow = Awaited<ReturnType<typeof recentRequests>>[number]

export default function Logs({ loaderData: { range, logs } }: Route.ComponentProps) {
  return (
    <>
      <PageHeader
        eyebrow="Analytics"
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
        <div className="flex items-center gap-1">
          {['all', '2', '4', '5'].map((option) => (
            <FilterButton
              key={option}
              active={status === option}
              onClick={() => update(setStatus)(option)}
            >
              {option === 'all' ? 'All' : `${option}xx`}
            </FilterButton>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <FilterButton active={kind === 'all'} onClick={() => update(setKind)('all')}>
            All
          </FilterButton>
          {kinds.map((option) => (
            <FilterButton
              key={option}
              active={kind === option}
              onClick={() => update(setKind)(option)}
            >
              {option}
            </FilterButton>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-3 font-mono text-xs text-muted-foreground">
          <span className="tabular-nums">
            {filtered.length === 0 ? 0 : current * perPage + 1}–
            {Math.min((current + 1) * perPage, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <PageButton disabled={current === 0} onClick={() => setPage(current - 1)}>
              ←
            </PageButton>
            <PageButton disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>
              →
            </PageButton>
          </div>
        </div>
      </div>

      {rows.length === 0 ? <Notice>No matching requests</Notice> : <LogTable rows={rows} />}
    </>
  )
}

function LogTable({ rows }: { rows: LogRow[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Time</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Kind</TableHead>
            <TableHead>Path</TableHead>
            <TableHead>IP</TableHead>
            <TableHead>Duration</TableHead>
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
              <TableCell className="font-mono text-xs text-muted-foreground">{row.kind}</TableCell>
              <TableCell>
                <span className="block max-w-96 truncate font-mono text-xs">{row.path}</span>
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">{row.ip}</TableCell>
              <TableCell className="tabular-nums">{Math.round(row.durationMs)} ms</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-md border px-2.5 py-1 font-mono text-xs transition-colors',
        active
          ? 'border-border bg-muted text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

function PageButton({
  disabled,
  onClick,
  children,
}: {
  disabled: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex size-6 items-center justify-center rounded-md border border-border text-xs transition-colors hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  )
}
