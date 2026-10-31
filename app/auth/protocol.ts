export type Result<T, E extends string> =
  | { ok: true; value: T }
  | ([E] extends [never] ? never : { ok: false; error: E })

export type CreationOptions = { publicKey: PublicKeyCredentialCreationOptionsJSON }
export type RequestOptions = { publicKey: PublicKeyCredentialRequestOptionsJSON }
export type CredentialJSON = ReturnType<PublicKeyCredential['toJSON']>

export type Steps = {
  'registration-begin': {
    body: { handle: string; turnstile: string }
    value: CreationOptions
    error: 'invalid_handle' | 'not_human' | 'handle_taken'
  }
  'registration-finish': {
    body: { credential: CredentialJSON }
    value: { recoveryCode: string }
    error: 'ceremony_failed'
  }
  'login-begin': {
    body: Record<string, never>
    value: RequestOptions
    error: never
  }
  'login-finish': {
    body: { credential: CredentialJSON }
    value: { handle: string; recoveryCode: string | null }
    error: 'ceremony_failed'
  }
  recover: {
    body: { handle: string; code: string; turnstile: string }
    value: { recoveryCode: string; passkeys: number }
    error: 'not_human' | 'invalid_code'
  }
  'confirm-begin': {
    body: Record<string, never>
    value: RequestOptions
    error: 'signed_out'
  }
  'confirm-finish': {
    body: { credential: CredentialJSON }
    value: Record<string, never>
    error: 'signed_out' | 'ceremony_failed'
  }
  'passkey-begin': {
    body: Record<string, never>
    value: CreationOptions
    error: 'signed_out' | 'not_confirmed'
  }
  'passkey-finish': {
    body: { credential: CredentialJSON }
    value: Record<string, never>
    error: 'signed_out' | 'ceremony_failed' | 'credential_limit' | 'already_exists'
  }
  'passkey-rename': {
    body: { id: string; name: string }
    value: Record<string, never>
    error: 'signed_out' | 'invalid_name' | 'not_found'
  }
  'passkey-remove': {
    body: { id: string }
    value: Record<string, never>
    error: 'signed_out' | 'not_confirmed' | 'last_credential' | 'not_found'
  }
  'recovery-rotate': {
    body: Record<string, never>
    value: { recoveryCode: string }
    error: 'signed_out' | 'not_confirmed'
  }
  'account-delete': {
    body: { handle: string }
    value: Record<string, never>
    error: 'signed_out' | 'not_confirmed' | 'wrong_handle'
  }
}

export type Step = keyof Steps
export type Reply<S extends Step> = Result<Steps[S]['value'], Steps[S]['error']>

export const handleLength = { min: 3, max: 24 } as const

export const handlePattern = new RegExp(
  `^[a-z0-9][a-z0-9_-]{${handleLength.min - 1},${handleLength.max - 1}}$`,
)

export const passkeyNameLength = 64

export const handleRules = `${handleLength.min} to ${handleLength.max} characters: lowercase letters, numbers, - and _.`

export function tidyHandle(raw: string): string {
  return raw.toLowerCase().replaceAll('@', '').replace(/\s/g, '-')
}

export function handleProblem(handle: string): string | null {
  if (handle.length < handleLength.min) return `At least ${handleLength.min} characters.`
  if (/[^a-z0-9_-]/.test(handle)) return 'Only letters, numbers, - and _.'
  if (!/^[a-z0-9]/.test(handle)) return 'Start with a letter or number.'
  return null
}

export function normalizeHandle(handle: string): string | null {
  const normalized = tidyHandle(handle.trim())
  return handlePattern.test(normalized) ? normalized : null
}
