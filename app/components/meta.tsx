import type { ReactNode } from 'react'

import { cn } from '~/lib/utils'

export function Meta({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        'flex flex-wrap gap-x-2 text-sm text-muted-foreground *:not-first:before:mr-2 *:not-first:before:content-["·"]',
        className,
      )}
    >
      {children}
    </div>
  )
}
