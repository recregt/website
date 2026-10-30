import { KeyRound } from 'lucide-react'
import { useState } from 'react'
import { redirect, useNavigate } from 'react-router'

import { Button } from '~/components/ui/button'

import { userContext } from '../../server/session.server'
import { authFailures, unexpectedFailure } from '../auth/messages'
import { nextPath } from '../auth/next'
import { login } from '../auth/passkeys'
import { AuthLink, AuthPage, Feedback, SaveRecoveryCode } from '../auth/ui'
import type { Route } from './+types/signin'

export const meta: Route.MetaFunction = () => [{ title: 'Sign in · recregt' }]

export function loader({ context, request }: Route.LoaderArgs) {
  const next = nextPath(new URL(request.url).searchParams.get('next'))
  if (context.get(userContext)) throw redirect(next)
  return { next }
}

export default function SignIn({ loaderData: { next } }: Route.ComponentProps) {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [pendingCode, setPendingCode] = useState<string | null>(null)

  async function signIn() {
    setBusy(true)
    setMessage(null)
    try {
      const result = await login()
      if (!result.ok) setMessage(authFailures[result.error])
      else if (result.value.recoveryCode) setPendingCode(result.value.recoveryCode)
      else await navigate(next)
    } catch {
      setMessage(unexpectedFailure)
    } finally {
      setBusy(false)
    }
  }

  if (pendingCode) {
    return (
      <AuthPage
        title="Save your recovery code"
        description="Your account is ready. This code is the only way back in if you lose every device with a passkey."
      >
        <SaveRecoveryCode
          code={pendingCode}
          label="Continue"
          busy={false}
          onContinue={() => navigate(next)}
        />
      </AuthPage>
    )
  }

  return (
    <AuthPage
      title="Sign in"
      description="No password needed. Your passkey is enough."
      footer={
        <>
          <p>
            New here?{' '}
            <AuthLink to="/signup" next={next}>
              Create an account
            </AuthLink>
          </p>
          <p>
            Lost your passkey?{' '}
            <AuthLink to="/recover" next={next}>
              Use your recovery code
            </AuthLink>
          </p>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <Button className="h-11 w-full" disabled={busy} onClick={signIn}>
          <KeyRound />
          {busy ? 'Waiting for your device…' : 'Sign in with a passkey'}
        </Button>
        <p className="text-sm text-muted-foreground">
          Your browser or password manager will offer the passkey you saved for recregt.
        </p>
      </div>
      <Feedback message={message} />
    </AuthPage>
  )
}
