import { type ReactNode, useState } from 'react'
import { Link } from 'react-router'

import { Page } from '~/components/page'
import { PageHeader } from '~/components/page-header'
import { RecoveryCode } from '~/components/recovery-code'
import { Button } from '~/components/ui/button'

export function AuthPage({
  step,
  title,
  description,
  footer,
  children,
}: {
  step?: { current: number; total: number }
  title: string
  description: string
  footer?: ReactNode
  children: ReactNode
}) {
  return (
    <Page narrow>
      <div className="flex flex-col gap-3">
        {step && (
          <p className="text-sm font-medium text-muted-foreground">
            Step {step.current} of {step.total}
          </p>
        )}
        <PageHeader title={title} description={description} />
      </div>
      <div className="flex max-w-sm flex-col gap-8">
        <div className="flex flex-col gap-6">{children}</div>
        {footer && (
          <div className="flex flex-col gap-2 border-t border-border pt-6 text-sm text-muted-foreground">
            {footer}
          </div>
        )}
      </div>
    </Page>
  )
}

export function AuthLink({
  to,
  next,
  children,
}: {
  to: string
  next: string
  children: ReactNode
}) {
  const href = next === '/' ? to : `${to}?next=${encodeURIComponent(next)}`
  return (
    <Link to={href} viewTransition className="font-medium text-foreground hover:text-ring">
      {children}
    </Link>
  )
}

export function SaveRecoveryCode({
  code,
  label,
  hint,
  busy,
  onContinue,
}: {
  code: string
  label: string
  hint?: string
  busy: boolean
  onContinue: () => void
}) {
  const [saved, setSaved] = useState(false)
  return (
    <>
      <RecoveryCode code={code} />
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={saved}
          onChange={(event) => setSaved(event.target.checked)}
          className="mt-0.5 size-4 shrink-0 accent-ring"
        />
        I have saved this code somewhere safe, like a password manager or on paper.
      </label>
      <div className="flex flex-col gap-2">
        <Button className="h-11 w-full" disabled={!saved || busy} onClick={onContinue}>
          {label}
        </Button>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      </div>
    </>
  )
}

export function TurnstileNote() {
  return (
    <p className="text-xs text-muted-foreground">
      Protected by{' '}
      <a
        href="https://www.cloudflare.com/turnstile-privacy-policy/"
        target="_blank"
        rel="noreferrer"
        className="underline underline-offset-2 hover:text-foreground"
      >
        Cloudflare Turnstile
      </a>
      .
    </p>
  )
}

export function Feedback({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="text-sm text-destructive">
      {message}
    </p>
  )
}
