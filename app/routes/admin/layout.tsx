import { NavLink, Outlet } from 'react-router'

import { cn } from '~/lib/utils'

const sections = [
  { to: '/admin', label: 'Dashboard' },
  { to: '/admin/logs', label: 'Logs' },
]

export default function AdminLayout() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <nav aria-label="Admin" className="flex gap-1 border-b border-border">
        {sections.map((section) => (
          <NavLink
            key={section.to}
            to={section.to}
            end
            viewTransition
            className={({ isActive }) =>
              cn(
                '-mb-px border-b-2 px-3 py-2 font-mono text-xs transition-colors',
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
