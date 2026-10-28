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
}

export type Step = keyof Steps
export type Reply<S extends Step> = Result<Steps[S]['value'], Steps[S]['error']>

export const handlePattern = /^[a-z0-9][a-z0-9_-]{2,23}$/
