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
import { useState } from 'react'

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
    <>
      {searchable && (
        <p>
          <label>
            Search{' '}
            <input
              type="search"
              value={globalFilter}
              onChange={(event) => setGlobalFilter(event.target.value)}
            />
          </label>{' '}
          {rows.length} of {data.length}
        </p>
      )}
      <table border={1} cellPadding={6} cellSpacing={0}>
        {caption && <caption>{caption}</caption>}
        <thead>
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id}>
              {group.headers.map((header) => (
                <th key={header.id} align="left">
                  {header.isPlaceholder ? null : (
                    <button type="button" onClick={header.column.getToggleSortingHandler()}>
                      <table.FlexRender header={header} />
                      {sortMark(header.column.getIsSorted())}
                    </button>
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>No data yet.</td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id}>
                {row.getAllCells().map((cell) => (
                  <td key={cell.id} valign="top">
                    <table.FlexRender cell={cell} />
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </>
  )
}

function sortMark(direction: false | 'asc' | 'desc'): string {
  if (direction === 'asc') return ' ▲'
  if (direction === 'desc') return ' ▼'
  return ''
}
