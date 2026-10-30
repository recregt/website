export function RankedList({
  rows,
  total,
}: {
  rows: { name: string; count: number }[]
  total: number
}) {
  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No data yet</p>
  }
  return (
    <ol className="flex flex-col gap-0.5">
      {rows.map((row) => {
        const share = total ? row.count / total : 0
        return (
          <li
            key={row.name}
            className="relative flex items-center gap-3 overflow-hidden rounded-md px-2.5 py-1.5 text-sm"
          >
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 rounded-md bg-chart-1/12"
              style={{ width: `${share * 100}%` }}
            />
            <span className="relative min-w-0 flex-1 truncate">{row.name}</span>
            <span className="relative tabular-nums">{row.count.toLocaleString('en')}</span>
            <span className="relative w-10 text-right text-muted-foreground tabular-nums">
              {percent(share)}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function percent(share: number): string {
  if (share > 0 && share < 0.005) return '<1%'
  return `${Math.round(share * 100)}%`
}
