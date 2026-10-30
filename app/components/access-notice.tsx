import { Link, useLocation } from 'react-router'

import { PageHeader } from '~/components/page-header'
import { Button } from '~/components/ui/button'

import type { User } from '../../server/schema.server'
import type { Capability } from '../auth/access'
import { signInHref } from '../auth/next'

const roles: Record<Capability, string> = {
  admin: 'an administrator',
}

export function SignInRequired() {
  const { pathname, search } = useLocation()
  return (
    <>
      <PageHeader
        title="Sign in to continue"
        description="This page needs an account with access. Sign in with your passkey to check yours."
      />
      <Button asChild className="mt-6">
        <Link to={signInHref(`${pathname}${search}`)} viewTransition>
          Sign in
        </Link>
      </Button>
    </>
  )
}

export function AccessDenied({ user, capability }: { user: User; capability: Capability }) {
  return (
    <>
      <PageHeader
        title={`You are not ${roles[capability]}`}
        description={`You are signed in as @${user.handle}, but this page needs ${roles[capability]} account.`}
      />
      <Button asChild variant="outline" className="mt-6">
        <Link to="/" viewTransition>
          Back home
        </Link>
      </Button>
    </>
  )
}
