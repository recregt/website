import type { ReactNode } from 'react'

import siteCover from '~/assets/site-cover.avif'
import { container } from '~/components/page'
import { cn } from '~/lib/utils'

export function CoverHero({
  src,
  alt,
  narrow = true,
  children,
}: {
  src: string
  alt: string
  narrow?: boolean
  children: ReactNode
}) {
  return (
    <section className="scheme-dark relative isolate overflow-hidden bg-background text-foreground">
      <img src={src} alt={alt} className="absolute inset-0 -z-20 size-full object-cover" />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-linear-to-t from-background from-40% via-background/75 to-background/10"
      />
      <div className={cn(container, 'pt-48 pb-12 sm:pt-72 sm:pb-16')}>
        <div className={cn(narrow && 'max-w-2xl')}>{children}</div>
      </div>
    </section>
  )
}

export function SiteHero({ narrow, children }: { narrow?: boolean; children: ReactNode }) {
  return (
    <CoverHero src={siteCover} alt="" narrow={narrow}>
      {children}
    </CoverHero>
  )
}
