import type { CSSProperties, ReactNode } from 'react'
import blogSmall from '~/assets/covers/blog-1600.avif'
import blogLarge from '~/assets/covers/blog-3200.avif'
import homeSmall from '~/assets/covers/home-1600.avif'
import homeLarge from '~/assets/covers/home-3200.avif'
import projectsSmall from '~/assets/covers/projects-1600.avif'
import projectsLarge from '~/assets/covers/projects-3200.avif'
import statsSmall from '~/assets/covers/stats-1600.avif'
import statsLarge from '~/assets/covers/stats-3200.avif'
import toolsSmall from '~/assets/covers/tools-1600.avif'
import toolsLarge from '~/assets/covers/tools-3200.avif'
import { container } from '~/components/page'
import { cn } from '~/lib/utils'

import { cover } from '../content/sanity'

const height = { base: '28rem', sm: '36rem' }
const aspect = `${cover.width} / ${cover.height}`
const sizes = `(width < 40rem) max(100vw, calc(${height.base} * ${aspect})), max(100vw, calc(${height.sm} * ${aspect}))`

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
    <section
      style={{ '--hero-base': height.base, '--hero-sm': height.sm } as CSSProperties}
      className="scheme-dark relative isolate flex min-h-(--hero) flex-col justify-end overflow-hidden bg-background text-foreground [--hero:var(--hero-base)] sm:[--hero:var(--hero-sm)]"
    >
      <div className="absolute inset-x-0 top-0 -z-10 h-(--hero) [view-transition-name:cover-art]">
        <img src={src} srcSet={srcSet} sizes={sizes} alt={alt} className="size-full object-cover" />
        <div
          aria-hidden
          className="absolute inset-0 bg-linear-to-t from-background from-20% via-background/85 via-55% to-transparent"
        />
      </div>
      <div className={cn(container, 'pt-24 pb-12 [view-transition-name:cover-text] sm:pb-16')}>
        <div className={cn(narrow && 'max-w-2xl')}>{children}</div>
      </div>
    </section>
  )
}

const siteCovers = {
  home: [homeSmall, homeLarge],
  projects: [projectsSmall, projectsLarge],
  tools: [toolsSmall, toolsLarge],
  blog: [blogSmall, blogLarge],
  stats: [statsSmall, statsLarge],
} as const

export function SiteHero({
  page,
  narrow,
  children,
}: {
  page: keyof typeof siteCovers
  narrow?: boolean
  children: ReactNode
}) {
  const [small, large] = siteCovers[page]
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
