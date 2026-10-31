import { NavLink } from 'react-router'

import { SiteHero } from '~/components/cover-hero'
import { PageHeader } from '~/components/page-header'
import { cn } from '~/lib/utils'

import { RangeTabs } from './range-tabs'
import type { Range } from './ranges'

const views = [
  { to: '/stats', label: 'Overview' },
  { to: '/stats/requests', label: 'Requests' },
]

export function StatsHero({ range, description }: { range: Range; description: string }) {
  return (
    <SiteHero page="stats" narrow={false}>
      <PageHeader title="Stats" description={description} actions={<RangeTabs range={range} />} />
    </SiteHero>
  )
}

export function StatsViews({ range }: { range: Range }) {
  return (
    <nav aria-label="Stats views" className="flex gap-1 border-b border-border">
      {views.map((view) => (
        <NavLink
          key={view.to}
          to={`${view.to}?range=${range}`}
          end
          viewTransition
          className={({ isActive }) =>
            cn(
              '-mb-px border-b-2 px-3 py-2 text-sm transition-colors',
              isActive
                ? 'border-ring text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )
          }
        >
          {view.label}
        </NavLink>
      ))}
    </nav>
  )
}
