import {
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useLocation,
} from 'react-router'

import { SiteHeader } from '~/components/site-header'
import { TooltipProvider } from '~/components/ui/tooltip'

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
  const { pathname } = useLocation()
  const standalone = pathname.startsWith('/admin')

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {!standalone && <SiteHeader user={user} />}
        <TooltipProvider>{children}</TooltipProvider>
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
      <p className="mt-6 font-mono text-sm">
        <Link
          to="/"
          className="text-ring underline decoration-ring/50 underline-offset-4 hover:decoration-ring"
        >
          ← Back home
        </Link>
      </p>
    </main>
  )
}
