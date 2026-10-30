import type { ReactNode } from 'react'

import { cn } from '~/lib/utils'

export const container = 'mx-auto w-full max-w-5xl px-6'

export function Page({ narrow = false, children }: { narrow?: boolean; children: ReactNode }) {
  return (
    <main className={cn(container, 'flex-1 py-12 sm:py-16')}>
      <div className={cn('flex flex-col gap-10', narrow && 'max-w-2xl')}>{children}</div>
    </main>
  )
}
