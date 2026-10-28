import { useRef, useState } from 'react'
import { redirect, useNavigate } from 'react-router'

import { userContext } from '../../server/session.server'
import { turnstileSiteKey } from '../../server/turnstile.server'
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

export function loader({ context }: Route.LoaderArgs) {
  if (context.get(userContext)) throw redirect('/')
  return { siteKey: turnstileSiteKey() }
}

export default function SignIn({ loaderData: { siteKey } }: Route.ComponentProps) {
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
      else await navigate('/')
    })

  const signUp = (handle: string, turnstile: string) =>
    attempt(async () => {
      const result = await register(handle, turnstile).finally(human.reset)
      if (result.ok) setRecovery({ code: result.value.recoveryCode, signedIn: false })
      else setMessage(messages[result.error])
    })

  if (recovery) {
    return (
      <main>
        <h1>Save your recovery code</h1>
        <p>It is the only way back in if you lose every device with your passkey.</p>
        <pre>{recovery.code}</pre>
        {recovery.signedIn ? (
          <button type="button" onClick={() => navigate('/')}>
            I saved it, continue
          </button>
        ) : (
          <button type="button" disabled={busy} onClick={signIn}>
            I saved it, sign me in
          </button>
        )}
        {message && <p role="alert">{message}</p>}
      </main>
    )
  }

  return (
    <main>
      <h1>Sign in</h1>
      <button type="button" disabled={busy} onClick={signIn}>
        Sign in with a passkey
      </button>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          if (human.token)
            signUp(String(new FormData(event.currentTarget).get('handle')), human.token)
        }}
      >
        <h2>New here?</h2>
        <label>
          Handle <input name="handle" required autoComplete="username" />
        </label>
        <div ref={challenge} />
        <button type="submit" disabled={busy || !human.token}>
          Create an account
        </button>
      </form>

      {message && <p role="alert">{message}</p>}
    </main>
  )
}
