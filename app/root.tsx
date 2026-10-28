import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router'

import { sessionMiddleware } from '../server/session.server'
import type { Route } from './+types/root'
import { useEngagement } from './analytics/engagement'

export const middleware: Route.MiddlewareFunction[] = [sessionMiddleware]

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
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
  return <h1>{notFound ? 'Not found' : 'Something went wrong'}</h1>
}
