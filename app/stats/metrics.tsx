import type { ReactNode } from 'react'

import { cn } from '~/lib/utils'

export type Metric = { label: string; value: string; detail?: ReactNode }

export function Metrics({ items, className }: { items: Metric[]; className?: string }) {
  return (
    <dl className={cn('grid gap-x-8 gap-y-6 border-y border-border py-6', className)}>
      {items.map((item) => (
        <div key={item.label} className="flex flex-col">
          <dt className="text-sm text-muted-foreground">{item.label}</dt>
          <dd className="mt-1 font-heading text-4xl font-medium tracking-tight tabular-nums">
            {item.value}
          </dd>
          {item.detail && <dd className="mt-1 text-sm">{item.detail}</dd>}
        </div>
      ))}
    </dl>
  )
}
