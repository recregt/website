import { Link } from 'react-router'

import { cn } from '~/lib/utils'

import { type Range, ranges } from './ranges'

export function RangeTabs({ range }: { range: Range }) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted p-0.5">
      {Object.keys(ranges).map((option) => (
        <Link
          key={option}
          to={`?range=${option}`}
          viewTransition
          aria-current={option === range ? 'page' : undefined}
          className={cn(
            'rounded-md px-3 py-1 text-sm transition-colors',
            option === range
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {option}
        </Link>
      ))}
    </div>
  )
}
