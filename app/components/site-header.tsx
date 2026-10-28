import { Form, Link } from 'react-router'

import type { User } from '../../server/schema.server'

export function SiteHeader({ user }: { user: User | null }) {
  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex h-12 w-full max-w-3xl items-center justify-between px-4">
        <Link to="/" className="font-mono text-sm tracking-tight">
          recregt
        </Link>
        <nav className="flex items-center gap-4 font-mono text-xs">
          <Link
            to="/blog"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Blog
          </Link>
          {user ? (
            <>
              {user.role === 'admin' && (
                <Link
                  to="/admin"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Admin
                </Link>
              )}
              <span className="text-muted-foreground">@{user.handle}</span>
              <Form method="post" action="/signout">
                <button
                  type="submit"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Sign out
                </button>
              </Form>
            </>
          ) : (
            <Link
              to="/signin"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
