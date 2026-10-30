import { useContext } from 'react'
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

import { AccessDenied, SignInRequired } from '~/components/access-notice'
import { PageHeader } from '~/components/page-header'
import { SiteHeader } from '~/components/site-header'

import type { User } from '../server/schema.server'
import { sessionMiddleware, userContext } from '../server/session.server'
import type { Route } from './+types/root'
import { useEngagement } from './analytics/engagement'
import { assetGuard, NonceContext } from './asset-guard'
import { deniedCapability } from './auth/access'
import './app.css'

export const middleware: Route.MiddlewareFunction[] = [sessionMiddleware]

export function loader({ context }: Route.LoaderArgs) {
  return { user: context.get(userContext) }
}

export function Layout({ children }: { children: React.ReactNode }) {
  const user = useRouteLoaderData<typeof loader>('root')?.user ?? null
  const nonce = useContext(NonceContext)
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script nonce={nonce} suppressHydrationWarning>
          {assetGuard}
        </script>
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
  const user = useRouteLoaderData<typeof loader>('root')?.user ?? null
  return (
    <main className="mx-auto max-w-md px-6 py-20">
      <ErrorContent error={error} user={user} />
    </main>
  )
}

function ErrorContent({ error, user }: { error: unknown; user: User | null }) {
  if (isRouteErrorResponse(error)) {
    const capability = deniedCapability(error.data)
    if (error.status === 401 && capability) return <SignInRequired />
    if (error.status === 403 && capability && user)
      return <AccessDenied user={user} capability={capability} />
    if (error.status === 404) return <Problem title="Not found" />
  }
  return <Problem title="Something went wrong" />
}

function Problem({ title }: { title: string }) {
  return (
    <>
      <PageHeader title={title} />
      <p className="mt-6 font-mono text-sm">
        <Link
          to="/"
          viewTransition
          className="text-ring underline decoration-ring/50 underline-offset-4 hover:decoration-ring"
        >
          ← Back home
        </Link>
      </p>
    </>
  )
}
