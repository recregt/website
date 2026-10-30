import type { ReactNode } from 'react'

import { cn } from '~/lib/utils'

export type Metric = { label: string; value: string; detail?: ReactNode }

export function Metrics({ items, className }: { items: Metric[]; className?: string }) {
  return (
    <dl
      className={cn(
        'grid gap-px overflow-hidden rounded-xl border border-border bg-border',
        className,
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="bg-card p-5">
          <dt className="text-sm text-muted-foreground">{item.label}</dt>
          <dd className="mt-2 text-3xl font-medium tracking-tight tabular-nums">{item.value}</dd>
          {item.detail && <dd className="mt-1 text-sm">{item.detail}</dd>}
        </div>
      ))}
    </dl>
  )
}
