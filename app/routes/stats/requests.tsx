import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Notice } from '~/components/notice'
import { Page } from '~/components/page'
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
import { StatsHero, StatsViews } from '../../stats/header'
import { AnalyticsNotice } from '../../stats/notice'
import { parseRange, rangeLabel } from '../../stats/ranges'
import { StatusBadge } from '../../stats/tables'
import type { Route } from './+types/requests'

const history = 200
const perPage = 50

const timeFormat = new Intl.DateTimeFormat('en', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
  timeZone: 'UTC',
})
const dateFormat = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})

export const meta: Route.MetaFunction = () => [
  { title: 'Requests · Stats · recregt' },
  { name: 'robots', content: 'noindex' },
]

export async function loader({ context, request }: Route.LoaderArgs) {
  requireAccess(context, 'admin')
  const range = parseRange(new URL(request.url).searchParams.get('range'))
  return { range, requests: await loadAnalytics(() => recentRequests(range, history)) }
}

type RequestRow = Awaited<ReturnType<typeof recentRequests>>[number]

export default function Requests({ loaderData: { range, requests } }: Route.ComponentProps) {
  return (
    <Page
      hero={
        <StatsHero
          range={range}
          description={`The latest ${history} requests over ${rangeLabel(range)}, newest first, in UTC.`}
        />
      }
    >
      <StatsViews range={range} />
      {requests.ok ? (
        <RequestBrowser rows={requests.value} />
      ) : (
        <AnalyticsNotice reason={requests.reason} />
      )}
    </Page>
  )
}

function RequestBrowser({ rows }: { rows: RequestRow[] }) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [kind, setKind] = useState('all')
  const [page, setPage] = useState(0)

  const kinds = useMemo(() => [...new Set(rows.map((row) => row.kind))], [rows])
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return rows.filter((row) => {
      if (status !== 'all' && Math.floor(row.status / 100) !== Number.parseInt(status, 10))
        return false
      if (kind !== 'all' && row.kind !== kind) return false
      if (term && !searchText(row).includes(term)) return false
      return true
    })
  }, [rows, search, status, kind])

  const pages = Math.max(1, Math.ceil(filtered.length / perPage))
  const current = Math.min(page, pages - 1)
  const visible = filtered.slice(current * perPage, (current + 1) * perPage)

  const update = (setter: (value: string) => void) => (value: string) => {
    setter(value)
    setPage(0)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label="Search requests"
            placeholder="Path, IP, handle, place or browser"
            value={search}
            onChange={(event) => update(setSearch)(event.target.value)}
            className="h-9 pl-9"
          />
        </div>
        <Segmented
          label="Status"
          value={status}
          onChange={update(setStatus)}
          options={['all', '2', '3', '4', '5'].map((option) => ({
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
        <p className="ml-auto text-sm text-muted-foreground tabular-nums">
          {filtered.length.toLocaleString('en')} of {rows.length.toLocaleString('en')}
        </p>
      </div>

      {visible.length === 0 ? (
        <Notice>No matching requests</Notice>
      ) : (
        <RequestTable rows={visible} />
      )}

      {pages > 1 && (
        <div className="flex items-center justify-end gap-3 text-sm text-muted-foreground">
          <span className="tabular-nums">
            {current * perPage + 1}–{Math.min((current + 1) * perPage, filtered.length)}
          </span>
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
      )}
    </div>
  )
}

function RequestTable({ rows }: { rows: RequestRow[] }) {
  return (
    <Table className="text-sm">
      <TableHeader>
        <TableRow>
          <TableHead>Time</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Request</TableHead>
          <TableHead>Client</TableHead>
          <TableHead>IP</TableHead>
          <TableHead className="text-right">Duration</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const at = Date.parse(`${row.timestamp.replace(' ', 'T')}Z`)
          return (
            <TableRow key={`${row.timestamp}-${row.ip}-${row.path}`} className="align-top">
              <TableCell>
                <div className="tabular-nums">{timeFormat.format(at)}</div>
                <div className="text-muted-foreground">{dateFormat.format(at)}</div>
              </TableCell>
              <TableCell>
                <StatusBadge status={row.status} />
              </TableCell>
              <TableCell>
                <div className="max-w-80 truncate font-mono text-[13px]" title={row.path}>
                  {row.path}
                </div>
                <div className="max-w-80 truncate text-muted-foreground">
                  {[row.kind, referrerHost(row.referrer)].filter(Boolean).join(' · ')}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span>{[row.city, row.country].filter(Boolean).join(', ') || 'Unknown'}</span>
                  {row.handle && <Tag>@{row.handle}</Tag>}
                  {row.bot > 0 && <Tag>bot</Tag>}
                </div>
                <div className="text-muted-foreground">
                  {[row.browser, row.os].filter(Boolean).join(' · ')}
                </div>
              </TableCell>
              <TableCell className="font-mono text-[13px] text-muted-foreground">
                {row.ip}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {Math.round(row.durationMs)} ms
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
      {children}
    </span>
  )
}

function referrerHost(referrer: string): string {
  if (!referrer || referrer.startsWith('/')) return ''
  const host = URL.parse(referrer)?.hostname
  return host ? `from ${host}` : ''
}

function searchText(row: RequestRow): string {
  return [row.path, row.ip, row.handle, row.city, row.country, row.browser, row.os]
    .join(' ')
    .toLowerCase()
}
