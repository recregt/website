import type { ReactNode } from 'react'

import small from '~/assets/site-cover-1600.avif'
import large from '~/assets/site-cover-3200.avif'
import { container } from '~/components/page'
import { cn } from '~/lib/utils'

import { cover } from '../content/sanity'

export function CoverHero({
  src,
  srcSet,
  alt,
  narrow = true,
  children,
}: {
  src: string
  srcSet: string
  alt: string
  narrow?: boolean
  children: ReactNode
}) {
  return (
    <section className="scheme-dark relative isolate overflow-hidden bg-background text-foreground">
      <img
        src={src}
        srcSet={srcSet}
        sizes="(width < 40rem) 200vw, 100vw"
        alt={alt}
        className="absolute inset-0 -z-20 size-full object-cover"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-linear-to-t from-background from-20% via-background/85 via-55% to-transparent"
      />
      <div className={cn(container, 'pt-48 pb-12 sm:pt-72 sm:pb-16')}>
        <div className={cn(narrow && 'max-w-2xl')}>{children}</div>
      </div>
    </section>
  )
}

export function SiteHero({ narrow, children }: { narrow?: boolean; children: ReactNode }) {
  return (
    <CoverHero
      src={small}
      srcSet={`${small} ${cover.width}w, ${large} ${cover.width * cover.density}w`}
      alt=""
      narrow={narrow}
    >
      {children}
    </CoverHero>
  )
}
