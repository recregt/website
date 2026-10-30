import { useRef, useState } from 'react'
import { redirect, useNavigate } from 'react-router'

import { Page } from '~/components/page'
import { PageHeader } from '~/components/page-header'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'

import { userContext } from '../../server/session.server'
import { turnstileSiteKey } from '../../server/turnstile.server'
import { nextPath } from '../auth/next'
import { login, register } from '../auth/passkeys'
import { useTurnstile } from '../auth/turnstile'
import type { Route } from './+types/signin'

type Failure = Extract<
  Awaited<ReturnType<typeof register>> | Awaited<ReturnType<typeof login>>,
  { ok: false }
>['error']

const messages: Record<Failure, string> = {
  invalid_handle: 'Handles are 3 to 24 characters: lowercase letters, digits, - and _.',
  not_human: 'We could not confirm you are human. Try again.',
  handle_taken: 'That handle is taken.',
  ceremony_failed: 'The passkey could not be verified. Try again.',
  cancelled: 'Cancelled.',
}

export const meta: Route.MetaFunction = () => [{ title: 'Sign in · recregt' }]

export function loader({ context, request }: Route.LoaderArgs) {
  const next = nextPath(new URL(request.url).searchParams.get('next'))
  if (context.get(userContext)) throw redirect(next)
  return { next, siteKey: turnstileSiteKey() }
}

export default function SignIn({ loaderData: { next, siteKey } }: Route.ComponentProps) {
  const navigate = useNavigate()
  const challenge = useRef<HTMLDivElement>(null)
  const human = useTurnstile(challenge, siteKey)
  const [recovery, setRecovery] = useState<{ code: string; signedIn: boolean } | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function attempt(ceremony: () => Promise<void>) {
    setBusy(true)
    setMessage(null)
    try {
      await ceremony()
    } catch {
      setMessage('Something went wrong. Try again in a moment.')
    } finally {
      setBusy(false)
    }
  }

  const signIn = () =>
    attempt(async () => {
      const result = await login()
      if (!result.ok) setMessage(messages[result.error])
      else if (result.value.recoveryCode)
        setRecovery({ code: result.value.recoveryCode, signedIn: true })
      else await navigate(next)
    })

  const signUp = (handle: string, turnstile: string) =>
    attempt(async () => {
      const result = await register(handle, turnstile).finally(human.reset)
      if (result.ok) setRecovery({ code: result.value.recoveryCode, signedIn: false })
      else setMessage(messages[result.error])
    })

  if (recovery) {
    return (
      <Page narrow>
        <PageHeader
          title="Save your recovery code"
          description="It is the only way back in if you lose every device with your passkey."
        />
        <div className="flex max-w-md flex-col items-start gap-6">
          <pre className="w-full overflow-x-auto rounded-xl border border-border bg-muted p-4 font-mono text-sm">
            {recovery.code}
          </pre>
          <Button disabled={busy} onClick={recovery.signedIn ? () => navigate(next) : signIn}>
            {recovery.signedIn ? 'I saved it, continue' : 'I saved it, sign me in'}
          </Button>
          {message && (
            <p role="alert" className="text-sm text-destructive">
              {message}
            </p>
          )}
        </div>
      </Page>
    )
  }

  return (
    <Page narrow>
      <PageHeader title="Sign in" description="Use the passkey saved on your device." />
      <div className="flex max-w-md flex-col gap-4">
        <div className="space-y-4 rounded-xl border border-border bg-card p-5">
          <Button className="w-full" disabled={busy} onClick={signIn}>
            Sign in with a passkey
          </Button>
          <form
            className="space-y-3 border-t border-border pt-4"
            onSubmit={(event) => {
              event.preventDefault()
              if (human.token)
                signUp(String(new FormData(event.currentTarget).get('handle')), human.token)
            }}
          >
            <p className="text-sm font-medium">New here? Create an account.</p>
            <label htmlFor="handle" className="block space-y-1.5 text-sm">
              Handle
              <Input id="handle" name="handle" required autoComplete="username" />
            </label>
            <div ref={challenge} />
            <Button
              type="submit"
              variant="secondary"
              className="w-full"
              disabled={busy || !human.token}
            >
              Create an account
            </Button>
          </form>
        </div>
        {message && (
          <p role="alert" className="text-sm text-destructive">
            {message}
          </p>
        )}
      </div>
    </Page>
  )
}
