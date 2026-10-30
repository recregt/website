import {
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteLoaderData,
} from 'react-router'

import { SiteHeader } from '~/components/site-header'

import { sessionMiddleware, userContext } from '../server/session.server'
import type { Route } from './+types/root'
import { useEngagement } from './analytics/engagement'
import './app.css'

export const middleware: Route.MiddlewareFunction[] = [sessionMiddleware]

export function loader({ context }: Route.LoaderArgs) {
  return { user: context.get(userContext) }
}

export function Layout({ children }: { children: React.ReactNode }) {
  const user = useRouteLoaderData<typeof loader>('root')?.user ?? null
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <SiteHeader user={user} />
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
      <p className="mt-6 font-mono text-sm">
        <Link
          to="/"
          viewTransition
          className="text-ring underline decoration-ring/50 underline-offset-4 hover:decoration-ring"
        >
          ← Back home
        </Link>
      </p>
    </main>
  )
}
