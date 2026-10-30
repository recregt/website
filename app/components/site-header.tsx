import { ChevronDown } from 'lucide-react'
import { Form, Link, useLocation, useNavigation } from 'react-router'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'

import type { User } from '../../server/schema.server'
import { can } from '../auth/access'
import { signInHref } from '../auth/next'

export function SiteHeader({ user }: { user: User | null }) {
  const { pathname, search } = useLocation()
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md [view-transition-name:site-header]">
      <div className="mx-auto flex h-12 w-full max-w-6xl items-center justify-between px-4">
        <Link to="/" viewTransition className="font-mono text-sm tracking-tight">
          recregt
        </Link>
        <nav className="flex items-center gap-3 font-mono text-xs">
          <Link
            to="/blog"
            viewTransition
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Blog
          </Link>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/40 px-2 py-1 text-xs transition-colors hover:bg-muted"
                >
                  @{user.handle}
                  <ChevronDown className="size-3.5 opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-44">
                <DropdownMenuLabel>Signed in as @{user.handle}</DropdownMenuLabel>
                {can(user, 'admin') && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/admin" viewTransition className="cursor-pointer">
                        Admin
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="p-0">
                  <Form method="post" action="/signout" className="w-full">
                    <button
                      type="submit"
                      className="w-full cursor-pointer px-2 py-1.5 text-left text-destructive"
                    >
                      Sign out
                    </button>
                  </Form>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link
              to={signInHref(pathname === '/signin' ? '/' : `${pathname}${search}`)}
              viewTransition
              className="rounded-md border border-border/60 bg-muted/40 px-2.5 py-1 text-xs transition-colors hover:bg-muted"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
      <NavigationProgress />
    </header>
  )
}

function NavigationProgress() {
  const busy = useNavigation().state !== 'idle'
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 overflow-hidden"
      hidden={!busy}
    >
      <div className="h-full w-1/3 animate-progress bg-ring motion-reduce:w-full motion-reduce:animate-none" />
    </div>
  )
}
