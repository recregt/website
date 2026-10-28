import { ChevronDown } from 'lucide-react'
import { Form, Link } from 'react-router'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'

import type { User } from '../../server/schema.server'

export function SiteHeader({ user }: { user: User | null }) {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-12 w-full max-w-6xl items-center justify-between px-4">
        <Link to="/" className="font-mono text-sm tracking-tight">
          recregt
        </Link>
        <nav className="flex items-center gap-3 font-mono text-xs">
          <Link
            to="/blog"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Blog
          </Link>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/40 px-2 py-1 text-xs text-zinc-200 transition-colors hover:bg-muted"
                >
                  @{user.handle}
                  <ChevronDown className="size-3.5 opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-44">
                <DropdownMenuLabel>Signed in as @{user.handle}</DropdownMenuLabel>
                {user.role === 'admin' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="cursor-pointer">
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
                      className="w-full cursor-pointer px-2 py-1.5 text-left text-rose-400 hover:text-rose-300"
                    >
                      Sign out
                    </button>
                  </Form>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link
              to="/signin"
              className="rounded-md border border-border/60 bg-muted/40 px-2.5 py-1 text-xs transition-colors hover:bg-muted"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
