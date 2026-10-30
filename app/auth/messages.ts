import type { login, recover, register } from './passkeys'
import { handleRules } from './protocol'

type Failure = Extract<
  | Awaited<ReturnType<typeof login>>
  | Awaited<ReturnType<typeof register>>
  | Awaited<ReturnType<typeof recover>>,
  { ok: false }
>['error']

export const authFailures: Record<Failure, string> = {
  invalid_handle: handleRules,
  not_human: 'We could not confirm you are human. Try again.',
  handle_taken: 'That handle is taken.',
  ceremony_failed: 'The passkey could not be verified. Try again.',
  cancelled: 'Cancelled. Nothing was changed.',
  invalid_code: 'That handle and recovery code do not match. Check both and try again.',
}

export const unexpectedFailure = 'Something went wrong. Try again in a moment.'
