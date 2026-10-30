import { KeyRound } from 'lucide-react'
import { useState } from 'react'
import { useRevalidator } from 'react-router'

import { Section } from '~/components/section'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { cn } from '~/lib/utils'

import type { Passkey } from '../../server/passkeys.server'
import { addPasskey, removePasskey, renamePasskey } from '../auth/passkeys'
import { passkeyNameLength } from '../auth/protocol'
import { postDate } from '../blog/list'

type Failure = Extract<
  | Awaited<ReturnType<typeof addPasskey>>
  | Awaited<ReturnType<typeof removePasskey>>
  | Awaited<ReturnType<typeof renamePasskey>>,
  { ok: false }
>['error']

const failures: Record<Failure, string> = {
  cancelled: 'Cancelled.',
  signed_out: 'You were signed out. Sign in again to manage passkeys.',
  ceremony_failed: 'The passkey could not be verified. Try again.',
  not_confirmed: 'Confirm with your passkey to continue.',
  credential_limit: 'You have reached the passkey limit. Remove one first.',
  already_exists: 'That passkey is already on your account.',
  last_credential: 'Your only passkey cannot be removed.',
  not_found: 'That passkey is no longer on your account.',
  invalid_name: `Names are 1 to ${passkeyNameLength} characters.`,
}

type Message = { tone: 'error' | 'success'; text: string }

export function Passkeys({ passkeys, limit }: { passkeys: Passkey[]; limit: number }) {
  const revalidator = useRevalidator()
  const [busy, setBusy] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [message, setMessage] = useState<Message | null>(null)

  async function run(
    key: string,
    action: () => Promise<{ ok: true } | { ok: false; error: Failure }>,
    success: string,
  ) {
    setBusy(key)
    setMessage(null)
    try {
      const result = await action()
      if (result.ok) {
        await revalidator.revalidate()
        setEditing(null)
        setMessage({ tone: 'success', text: success })
      } else {
        setMessage({ tone: 'error', text: failures[result.error] })
      }
    } catch {
      setMessage({ tone: 'error', text: 'Something went wrong. Try again in a moment.' })
    } finally {
      setBusy(null)
    }
  }

  const full = passkeys.length >= limit
  return (
    <Section title="Passkeys" action={`${passkeys.length} of ${limit}`}>
      <ul className="flex flex-col divide-y divide-border">
        {passkeys.map((passkey) => (
          <li key={passkey.id} className="flex flex-wrap items-center gap-3 py-3">
            <KeyRound className="size-4 shrink-0 text-muted-foreground" />
            {editing === passkey.id ? (
              <form
                className="flex min-w-0 flex-1 gap-2"
                onSubmit={(event) => {
                  event.preventDefault()
                  const name = String(new FormData(event.currentTarget).get('name'))
                  run(passkey.id, () => renamePasskey(passkey.id, name), 'Passkey renamed.')
                }}
              >
                <Input
                  name="name"
                  aria-label="Passkey name"
                  defaultValue={passkey.name}
                  maxLength={passkeyNameLength}
                  required
                  autoFocus
                  className="h-9 flex-1"
                />
                <Button type="submit" variant="outline" disabled={busy !== null}>
                  Save
                </Button>
                <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
              </form>
            ) : (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{passkey.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {passkey.addedAt
                      ? `Added ${postDate.format(passkey.addedAt)}`
                      : 'Added date unknown'}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy !== null}
                  onClick={() => setEditing(passkey.id)}
                >
                  Rename
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  disabled={busy !== null || passkeys.length === 1}
                  title={passkeys.length === 1 ? failures.last_credential : undefined}
                  onClick={() =>
                    run(passkey.id, () => removePasskey(passkey.id), 'Passkey removed.')
                  }
                >
                  {busy === passkey.id && editing !== passkey.id ? 'Removing…' : 'Remove'}
                </Button>
              </>
            )}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          disabled={busy !== null || full}
          onClick={() => run('add', addPasskey, 'Passkey added.')}
        >
          {busy === 'add' ? 'Waiting for your device…' : 'Add a passkey'}
        </Button>
        <p
          role={message ? (message.tone === 'error' ? 'alert' : 'status') : undefined}
          className={cn(
            'text-sm',
            message?.tone === 'error' && 'text-destructive',
            message?.tone === 'success' && 'text-success',
            !message && 'text-muted-foreground',
          )}
        >
          {message?.text ??
            (full
              ? 'You have reached the passkey limit.'
              : 'Adding or removing a passkey asks you to confirm with an existing one.')}
        </p>
      </div>
    </Section>
  )
}
