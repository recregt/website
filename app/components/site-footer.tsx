import { Link } from 'react-router'

import { container } from '~/components/page'
import { cn } from '~/lib/utils'

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div
        className={cn(
          container,
          'flex h-16 items-center justify-between text-sm text-muted-foreground',
        )}
      >
        <span className="font-heading text-base text-foreground">recregt</span>
        <nav className="flex gap-4">
          <Link to="/projects" viewTransition className="hover:text-foreground">
            Projects
          </Link>
          <Link to="/blog" viewTransition className="hover:text-foreground">
            Blog
          </Link>
          <Link to="/stats" viewTransition className="hover:text-foreground">
            Stats
          </Link>
        </nav>
      </div>
    </footer>
  )
}
