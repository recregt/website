import { Check, Copy, KeyRound } from 'lucide-react'
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
import { handleRules } from '../auth/protocol'
import { useTurnstile } from '../auth/turnstile'
import type { Route } from './+types/signin'

type Failure = Extract<
  Awaited<ReturnType<typeof register>> | Awaited<ReturnType<typeof login>>,
  { ok: false }
>['error']

const messages: Record<Failure, string> = {
  invalid_handle: handleRules,
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
        <div className="flex max-w-sm flex-col gap-4">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-muted py-2 pr-2 pl-4">
            <code className="min-w-0 flex-1 overflow-x-auto font-mono text-sm">
              {recovery.code}
            </code>
            <CopyButton text={recovery.code} />
          </div>
          <Button
            className="h-11 w-full"
            disabled={busy}
            onClick={recovery.signedIn ? () => navigate(next) : signIn}
          >
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
      <PageHeader title="Sign in" description="No password needed. Your passkey is enough." />
      <div className="flex max-w-sm flex-col gap-8">
        <div className="flex flex-col gap-3">
          <Button className="h-11 w-full" disabled={busy} onClick={signIn}>
            <KeyRound />
            Sign in with a passkey
          </Button>
          <p className="text-sm text-muted-foreground">
            Your browser or password manager will offer the passkey you saved for recregt.
          </p>
        </div>

        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          New here?
          <span className="h-px flex-1 bg-border" />
        </div>

        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (human.token)
              signUp(String(new FormData(event.currentTarget).get('handle')), human.token)
          }}
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="handle" className="text-sm font-medium">
              Choose a handle
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
                @
              </span>
              <Input
                id="handle"
                name="handle"
                required
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                className="h-11 pl-7"
              />
            </div>
            <p className="text-sm text-muted-foreground">{handleRules}</p>
          </div>
          <div ref={challenge} />
          <Button
            type="submit"
            variant="outline"
            className="h-11 w-full"
            disabled={busy || !human.token}
          >
            {human.token ? 'Create an account' : 'Checking you are human…'}
          </Button>
        </form>

        {message && (
          <p role="alert" className="text-sm text-destructive">
            {message}
          </p>
        )}
      </div>
    </Page>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
  }
  return (
    <Button variant="ghost" size="sm" onClick={() => copy().catch(() => setCopied(false))}>
      {copied ? <Check /> : <Copy />}
      {copied ? 'Copied' : 'Copy'}
    </Button>
  )
}
