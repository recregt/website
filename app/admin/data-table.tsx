import {
  type ColumnDef,
  columnFilteringFeature,
  createColumnHelper,
  createFilteredRowModel,
  createSortedRowModel,
  filterFn_includesString,
  globalFilteringFeature,
  type RowData,
  rowSortingFeature,
  sortFn_alphanumeric,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ArrowUpDown, Inbox } from 'lucide-react'
import { useState } from 'react'

import { Input } from '~/components/ui/input'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric },
  columnFilteringFeature,
  globalFilteringFeature,
  filteredRowModel: createFilteredRowModel(),
  filterFns: { includesString: filterFn_includesString },
})

type Features = typeof features

export function columnHelper<Row extends RowData>() {
  return createColumnHelper<Features, Row>()
}

export function DataTable<Row extends RowData>({
  caption,
  columns,
  data,
  searchable = false,
}: {
  caption?: string
  columns: ColumnDef<Features, Row>[]
  data: Row[]
  searchable?: boolean
}) {
  const [globalFilter, setGlobalFilter] = useState('')
  const table = useTable({
    features,
    columns,
    data,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: 'includesString',
  })
  const rows = table.getRowModel().rows

  return (
    <div className="flex flex-1 flex-col space-y-3">
      {searchable && (
        <div className="flex items-center gap-3">
          <Input
            type="search"
            placeholder="Search"
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="max-w-xs"
          />
          <span className="text-muted-foreground text-sm">
            {rows.length} of {data.length}
          </span>
        </div>
      )}
      {rows.length === 0 ? (
        <div className="flex min-h-[220px] flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-1.5 rounded-lg border border-dashed border-border/60 px-8 py-6">
            <Inbox className="size-4 text-muted-foreground/60" />
            <p className="font-mono text-xs text-muted-foreground">No data yet</p>
          </div>
        </div>
      ) : (
        <Table>
          {caption && <TableCaption>{caption}</TableCaption>}
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="inline-flex items-center gap-1 hover:text-foreground"
                      >
                        <table.FlexRender header={header} />
                        <SortIcon direction={header.column.getIsSorted()} />
                      </button>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                {row.getAllCells().map((cell) => (
                  <TableCell key={cell.id}>
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

function SortIcon({ direction }: { direction: false | 'asc' | 'desc' }) {
  if (direction === 'asc') return <ArrowUp className="size-3.5" />
  if (direction === 'desc') return <ArrowDown className="size-3.5" />
  return <ArrowUpDown className="size-3.5 opacity-40" />
}
