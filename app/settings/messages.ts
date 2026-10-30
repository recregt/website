import type {
  addPasskey,
  deleteAccount,
  removePasskey,
  renamePasskey,
  rotateRecoveryCode,
} from '../auth/passkeys'
import { passkeyNameLength } from '../auth/protocol'

export type Failure = Extract<
  | Awaited<ReturnType<typeof addPasskey>>
  | Awaited<ReturnType<typeof removePasskey>>
  | Awaited<ReturnType<typeof renamePasskey>>
  | Awaited<ReturnType<typeof rotateRecoveryCode>>
  | Awaited<ReturnType<typeof deleteAccount>>,
  { ok: false }
>['error']

export const failures: Record<Failure, string> = {
  cancelled: 'Cancelled.',
  signed_out: 'You were signed out. Sign in again to continue.',
  ceremony_failed: 'The passkey could not be verified. Try again.',
  not_confirmed: 'Confirm with your passkey to continue.',
  credential_limit: 'You have reached the passkey limit. Remove one first.',
  already_exists: 'That passkey is already on your account.',
  last_credential: 'Your only passkey cannot be removed.',
  not_found: 'That passkey is no longer on your account.',
  invalid_name: `Names are 1 to ${passkeyNameLength} characters.`,
  wrong_handle: 'That is not your handle.',
}

export const unexpected = 'Something went wrong. Try again in a moment.'
