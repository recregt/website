import { NavLink, Outlet } from 'react-router'

import { container } from '~/components/page'
import { cn } from '~/lib/utils'

const sections = [
  { to: '/admin', label: 'Logs' },
  { to: '/stats', label: 'Stats' },
]

export default function AdminLayout() {
  return (
    <main className={cn(container, 'flex flex-1 flex-col gap-10 py-12 sm:py-16')}>
      <nav aria-label="Admin" className="flex gap-1 border-b border-border">
        {sections.map((section) => (
          <NavLink
            key={section.to}
            to={section.to}
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
            {section.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </main>
  )
}
