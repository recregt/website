import { KeyRound } from 'lucide-react'
import { useRef, useState } from 'react'
import { redirect, useNavigate } from 'react-router'

import { Button } from '~/components/ui/button'

import { userContext } from '../../server/session.server'
import { turnstileSiteKey } from '../../server/turnstile.server'
import { HandleInput } from '../auth/handle-input'
import { authFailures, unexpectedFailure } from '../auth/messages'
import { nextPath } from '../auth/next'
import { login, register } from '../auth/passkeys'
import { useTurnstile } from '../auth/turnstile'
import { AuthLink, AuthPage, Feedback, SaveRecoveryCode, TurnstileNote } from '../auth/ui'
import type { Route } from './+types/signup'

export const meta: Route.MetaFunction = () => [{ title: 'Create an account · recregt' }]

export function loader({ context, request }: Route.LoaderArgs) {
  const next = nextPath(new URL(request.url).searchParams.get('next'))
  if (context.get(userContext)) throw redirect(next)
  return { next, siteKey: turnstileSiteKey() }
}

export default function SignUp({ loaderData: { next, siteKey } }: Route.ComponentProps) {
  const navigate = useNavigate()
  const challenge = useRef<HTMLDivElement>(null)
  const human = useTurnstile(challenge, siteKey)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [code, setCode] = useState<string | null>(null)

  async function attempt(action: () => Promise<void>) {
    setBusy(true)
    setMessage(null)
    try {
      await action()
    } catch {
      setMessage(unexpectedFailure)
    } finally {
      setBusy(false)
    }
  }

  const create = (handle: string, turnstile: string) =>
    attempt(async () => {
      const result = await register(handle, turnstile).finally(human.reset)
      if (result.ok) setCode(result.value.recoveryCode)
      else setMessage(authFailures[result.error])
    })

  const finish = () =>
    attempt(async () => {
      const result = await login()
      if (result.ok) await navigate(next)
      else setMessage(authFailures[result.error])
    })

  if (code) {
    return (
      <AuthPage
        step={{ current: 2, total: 2 }}
        title="Save your recovery code"
        description="It is the only way back in if you lose every device with a passkey. You will only see it once."
      >
        <SaveRecoveryCode
          code={code}
          label={busy ? 'Waiting for your device…' : 'Sign in to finish'}
          hint="Your device will ask for the passkey you just created, one last time."
          busy={busy}
          onContinue={finish}
        />
        <Feedback message={message} />
      </AuthPage>
    )
  }

  return (
    <AuthPage
      step={{ current: 1, total: 2 }}
      title="Create an account"
      description="Pick a handle, then save a passkey on this device. No password or email needed."
      footer={
        <p>
          Already have an account?{' '}
          <AuthLink to="/signin" next={next}>
            Sign in
          </AuthLink>
        </p>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          if (human.token)
            create(String(new FormData(event.currentTarget).get('handle')), human.token)
        }}
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="handle" className="text-sm font-medium">
            Handle
          </label>
          <HandleInput id="handle" className="h-11" />
        </div>
        <div ref={challenge} />
        <Button type="submit" className="h-11 w-full" disabled={busy || !human.token}>
          <KeyRound />
          {busy
            ? 'Waiting for your device…'
            : human.token
              ? 'Continue with a passkey'
              : 'Checking you are human…'}
        </Button>
        <TurnstileNote />
      </form>
      <Feedback message={message} />
    </AuthPage>
  )
}
