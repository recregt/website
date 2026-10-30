import { useState } from 'react'

import { Section } from '~/components/section'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'

import { deleteAccount } from '../auth/passkeys'
import { failures, unexpected } from './messages'

export function DeleteAccount({ handle }: { handle: string }) {
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function remove() {
    setBusy(true)
    setError(null)
    try {
      const result = await deleteAccount(typed)
      if (result.ok) {
        window.location.assign('/')
        return
      }
      setError(failures[result.error])
    } catch {
      setError(unexpected)
    }
    setBusy(false)
  }

  return (
    <Section title="Delete account">
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          remove()
        }}
      >
        <p className="text-sm text-muted-foreground">
          This removes your account, your handle and your passkeys right away, and signs you out
          everywhere. It cannot be undone. Request records that mention your handle stay in the
          site&apos;s analytics for up to three months.
        </p>
        <div className="flex max-w-md flex-col gap-1.5">
          <label htmlFor="confirm-handle" className="text-sm font-medium">
            Type <span className="font-mono">{handle}</span> to confirm
          </label>
          <Input
            id="confirm-handle"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            className="h-10"
          />
        </div>
        <div>
          <Button type="submit" variant="destructive" disabled={busy || typed.trim() !== handle}>
            {busy ? 'Waiting for your device…' : 'Delete my account'}
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </form>
    </Section>
  )
}
