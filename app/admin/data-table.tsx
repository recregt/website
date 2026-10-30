import {
  type ColumnDef,
  createColumnHelper,
  createSortedRowModel,
  type RowData,
  rowSortingFeature,
  sortFn_alphanumeric,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'

import { Notice } from '~/components/notice'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric },
})

type Features = typeof features

export function columnHelper<Row extends RowData>() {
  return createColumnHelper<Features, Row>()
}

export function DataTable<Row extends RowData>({
  columns,
  data,
}: {
  columns: ColumnDef<Features, Row>[]
  data: Row[]
}) {
  const table = useTable({ features, columns, data })
  const rows = table.getRowModel().rows

  if (rows.length === 0) return <Notice>No data yet</Notice>

  return (
    <Table>
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
  )
}

function SortIcon({ direction }: { direction: false | 'asc' | 'desc' }) {
  if (direction === 'asc') return <ArrowUp className="size-3.5" />
  if (direction === 'desc') return <ArrowDown className="size-3.5" />
  return <ArrowUpDown className="size-3.5 opacity-40" />
}
