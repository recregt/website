import type { ReactNode } from 'react'

import { cn } from '~/lib/utils'

export function Section({
  title,
  description,
  action,
  className,
  children,
}: {
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <section className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-end justify-between gap-3 border-b border-border pb-2">
        <div>
          <h2 className="text-sm font-medium">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
        {action && <div className="text-sm text-muted-foreground">{action}</div>}
      </div>
      {children}
    </section>
  )
}
