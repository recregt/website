import type { ReactNode } from 'react'

import { cn } from '~/lib/utils'

export const container = 'mx-auto w-full max-w-5xl px-6'

export function Page({
  narrow = false,
  hero,
  children,
}: {
  narrow?: boolean
  hero?: ReactNode
  children: ReactNode
}) {
  return (
    <main className="flex-1">
      {hero}
      <div className={cn(container, 'py-12 sm:py-16', hero && 'dark:pt-0 sm:dark:pt-0')}>
        <div className={cn('flex flex-col gap-10', narrow && 'max-w-2xl')}>{children}</div>
      </div>
    </main>
  )
}
