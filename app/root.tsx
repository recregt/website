import {
  Form,
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from 'react-router'

import { sessionMiddleware, userContext } from '../server/session.server'
import type { Route } from './+types/root'
import { useEngagement } from './analytics/engagement'
import './app.css'

export const middleware: Route.MiddlewareFunction[] = [sessionMiddleware]

export function loader({ context }: Route.LoaderArgs) {
  return { user: context.get(userContext) }
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { user } = useLoaderData<typeof loader>()
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <header className="border-b border-border">
          <nav className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
            <Link to="/" className="font-mono text-sm">
              recregt
            </Link>
            <div className="flex items-center gap-5 font-mono text-sm">
              <Link to="/blog" className="transition-colors hover:text-ring">
                Blog
              </Link>
              {user ? (
                <>
                  {user.role === 'admin' && (
                    <Link to="/admin" className="transition-colors hover:text-ring">
                      Admin
                    </Link>
                  )}
                  <span className="text-muted-foreground">@{user.handle}</span>
                  <Form method="post" action="/signout">
                    <button type="submit" className="transition-colors hover:text-ring">
                      Sign out
                    </button>
                  </Form>
                </>
              ) : (
                <Link to="/signin" className="transition-colors hover:text-ring">
                  Sign in
                </Link>
              )}
            </div>
          </nav>
        </header>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export default function App() {
  useEngagement()
  return <Outlet />
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const notFound = isRouteErrorResponse(error) && error.status === 404
  return (
    <main className="mx-auto max-w-2xl px-6 py-20">
      <h1 className="font-heading text-3xl font-semibold tracking-tight">
        {notFound ? 'Not found' : 'Something went wrong'}
      </h1>
    </main>
  )
}
