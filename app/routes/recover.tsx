import { CircleCheck, KeyRound } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link, redirect, useNavigate, useRevalidator } from 'react-router'

import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'

import { userContext } from '../../server/session.server'
import { turnstileSiteKey } from '../../server/turnstile.server'
import { HandleInput } from '../auth/handle-input'
import { authFailures, unexpectedFailure } from '../auth/messages'
import { nextPath } from '../auth/next'
import { addPasskey, recover } from '../auth/passkeys'
import { useTurnstile } from '../auth/turnstile'
import { AuthLink, AuthPage, Feedback, SaveRecoveryCode, TurnstileNote } from '../auth/ui'
import type { Route } from './+types/recover'

type Stage =
  | { name: 'code' }
  | { name: 'save'; code: string; lostPasskeys: number }
  | { name: 'passkey'; lostPasskeys: number }
  | { name: 'done'; lostPasskeys: number; added: boolean }

const steps = 3

export const meta: Route.MetaFunction = () => [{ title: 'Recover your account · recregt' }]

export function loader({ context, request }: Route.LoaderArgs) {
  const next = nextPath(new URL(request.url).searchParams.get('next'))
  if (context.get(userContext)) throw redirect(next)
  return { next, siteKey: turnstileSiteKey() }
}

export function shouldRevalidate() {
  return false
}

export default function Recover({ loaderData: { next, siteKey } }: Route.ComponentProps) {
  const [stage, setStage] = useState<Stage>({ name: 'code' })

  if (stage.name === 'save') {
    return (
      <AuthPage
        step={{ current: 2, total: steps }}
        title="Save your new recovery code"
        description="You are signed in. The code you just used no longer works, and this one replaces it."
      >
        <SaveRecoveryCode
          code={stage.code}
          label="Continue"
          busy={false}
          onContinue={() => setStage({ name: 'passkey', lostPasskeys: stage.lostPasskeys })}
        />
      </AuthPage>
    )
  }

  if (stage.name === 'passkey') {
    return (
      <AddPasskeyStep
        onDone={(added) => setStage({ name: 'done', lostPasskeys: stage.lostPasskeys, added })}
      />
    )
  }

  if (stage.name === 'done') {
    return <Done next={next} lostPasskeys={stage.lostPasskeys} added={stage.added} />
  }

  return (
    <CodeStep
      next={next}
      siteKey={siteKey}
      onRecovered={(code, lostPasskeys) => setStage({ name: 'save', code, lostPasskeys })}
    />
  )
}

function CodeStep({
  next,
  siteKey,
  onRecovered,
}: {
  next: string
  siteKey: string
  onRecovered: (code: string, lostPasskeys: number) => void
}) {
  const challenge = useRef<HTMLDivElement>(null)
  const human = useTurnstile(challenge, siteKey)
  const revalidator = useRevalidator()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function submit(handle: string, code: string, turnstile: string) {
    setBusy(true)
    setMessage(null)
    try {
      const result = await recover(handle, code, turnstile).finally(human.reset)
      if (result.ok) {
        await revalidator.revalidate()
        onRecovered(result.value.recoveryCode, result.value.passkeys)
      } else setMessage(authFailures[result.error])
    } catch {
      setMessage(unexpectedFailure)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthPage
      step={{ current: 1, total: steps }}
      title="Use your recovery code"
      description="Lost every device with your passkey? Your recovery code gets you back in."
      footer={
        <p>
          Remembered your passkey?{' '}
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
          if (!human.token) return
          const form = new FormData(event.currentTarget)
          submit(String(form.get('handle')), String(form.get('code')), human.token)
        }}
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="handle" className="text-sm font-medium">
            Handle
          </label>
          <HandleInput id="handle" className="h-11" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="code" className="text-sm font-medium">
            Recovery code
          </label>
          <Input
            id="code"
            name="code"
            required
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="XXXX-XXXX-XXXX-XXXX"
            className="h-11 font-mono"
          />
          <p className="text-sm text-muted-foreground">
            Capital letters and dashes are optional, so type it however is easiest.
          </p>
        </div>
        <div ref={challenge} />
        <Button type="submit" className="h-11 w-full" disabled={busy || !human.token}>
          {busy ? 'Checking…' : human.token ? 'Recover my account' : 'Checking you are human…'}
        </Button>
        <TurnstileNote />
      </form>
      <Feedback message={message} />
    </AuthPage>
  )
}

function AddPasskeyStep({ onDone }: { onDone: (added: boolean) => void }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function add() {
    setBusy(true)
    setMessage(null)
    try {
      const result = await addPasskey({ confirm: false })
      if (result.ok) onDone(true)
      else if (result.error === 'not_confirmed')
        setMessage('This step timed out. You are still signed in, so add a passkey from Settings.')
      else if (result.error === 'cancelled') setMessage('Cancelled. You can try again or skip.')
      else setMessage('The passkey could not be saved. Try again, or skip and add one later.')
    } catch {
      setMessage(unexpectedFailure)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthPage
      step={{ current: 3, total: steps }}
      title="Add a passkey on this device"
      description="So next time you can sign in with a tap instead of your recovery code."
    >
      <div className="flex flex-col gap-3">
        <Button className="h-11 w-full" disabled={busy} onClick={add}>
          <KeyRound />
          {busy ? 'Waiting for your device…' : 'Add a passkey'}
        </Button>
        <Button variant="ghost" className="w-full" disabled={busy} onClick={() => onDone(false)}>
          Skip for now
        </Button>
      </div>
      <Feedback message={message} />
    </AuthPage>
  )
}

function Done({
  next,
  lostPasskeys,
  added,
}: {
  next: string
  lostPasskeys: number
  added: boolean
}) {
  const navigate = useNavigate()
  const todo = [
    !added && 'Add a passkey on this device.',
    lostPasskeys > 0 &&
      `Remove the passkey${lostPasskeys > 1 ? 's' : ''} you lost, so nobody else can use ${lostPasskeys > 1 ? 'them' : 'it'}.`,
    'Sign out everywhere else, to end any session left open on a lost device.',
  ].filter((item): item is string => Boolean(item))

  return (
    <AuthPage
      title="You are back in"
      description={
        added
          ? 'Your new passkey is saved on this device.'
          : 'You are signed in with your recovery code.'
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium">Finish securing your account in Settings:</p>
        <ul className="flex flex-col gap-2">
          {todo.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
              <CircleCheck className="mt-0.5 size-4 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-col gap-2">
        <Button asChild className="h-11 w-full">
          <Link to="/settings" viewTransition>
            Open Settings
          </Link>
        </Button>
        <Button variant="ghost" className="w-full" onClick={() => navigate(next)}>
          Not now
        </Button>
      </div>
    </AuthPage>
  )
}
