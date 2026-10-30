import { ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'
import { Form, Link, NavLink, useLocation, useNavigation } from 'react-router'

import { MobileMenu } from '~/components/mobile-menu'
import { container } from '~/components/page'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { cn } from '~/lib/utils'

import type { User } from '../../server/schema.server'
import { signInHref } from '../auth/next'

export function SiteHeader({ user }: { user: User | null }) {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md [view-transition-name:site-header]">
      <div className={cn(container, 'flex h-14 items-center justify-between')}>
        <Link to="/" viewTransition className="font-heading text-xl font-medium tracking-tight">
          recregt
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-1 text-sm sm:flex">
          <NavItem to="/blog">Blog</NavItem>
          <NavItem to="/stats">Stats</NavItem>
          <span className="mx-2 h-4 w-px bg-border" />
          {user ? <Account user={user} /> : <SignIn />}
        </nav>
        <MobileMenu user={user} />
      </div>
      <NavigationProgress />
    </header>
  )
}

function NavItem({ to, children }: { to: string; children: ReactNode }) {
  return (
    <NavLink
      to={to}
      viewTransition
      className={({ isActive }) =>
        cn(
          'rounded-md px-2.5 py-1.5 transition-colors hover:text-foreground',
          isActive ? 'text-foreground' : 'text-muted-foreground',
        )
      }
    >
      {children}
    </NavLink>
  )
}

function SignIn() {
  const { pathname, search } = useLocation()
  return (
    <Link
      to={signInHref(pathname === '/signin' ? '/' : `${pathname}${search}`)}
      viewTransition
      className="rounded-md px-2.5 py-1.5 font-medium transition-colors hover:bg-muted"
    >
      Sign in
    </Link>
  )
}

function Account({ user }: { user: User }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex min-w-0 items-center gap-1 rounded-md px-2.5 py-1.5 font-medium transition-colors hover:bg-muted"
        >
          <span className="max-w-32 truncate">@{user.handle}</span>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuLabel>Signed in as @{user.handle}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/settings" viewTransition className="cursor-pointer">
            Settings
          </Link>
        </DropdownMenuItem>
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
