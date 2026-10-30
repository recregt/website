import { useState } from 'react'

import { RecoveryCode } from '~/components/recovery-code'
import { Section } from '~/components/section'
import { Button } from '~/components/ui/button'

import { rotateRecoveryCode } from '../auth/passkeys'
import { failures, unexpected } from './messages'

export function Recovery() {
  const [busy, setBusy] = useState(false)
  const [code, setCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function rotate() {
    setBusy(true)
    setError(null)
    try {
      const result = await rotateRecoveryCode()
      if (result.ok) setCode(result.value.recoveryCode)
      else setError(failures[result.error])
    } catch {
      setError(unexpected)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Section title="Recovery code">
      <div className="flex flex-col items-start gap-4">
        <p className="text-sm text-muted-foreground">
          Your recovery code gets you back in if you lose every device with a passkey. Generating a
          new one makes the old code stop working.
        </p>
        {code ? (
          <div className="flex w-full max-w-md flex-col gap-2">
            <RecoveryCode code={code} />
            <p role="status" className="text-sm text-success">
              Save this code now. It will not be shown again, and your old code no longer works.
            </p>
          </div>
        ) : (
          <Button variant="outline" disabled={busy} onClick={rotate}>
            {busy ? 'Waiting for your device…' : 'Generate a new code'}
          </Button>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    </Section>
  )
}
