import type { CredentialJSON, Reply, Step, Steps } from './protocol'

const cancelled = { ok: false, error: 'cancelled' } as const

export async function register(handle: string, turnstile: string) {
  const begin = await post('registration-begin', { handle, turnstile })
  if (!begin.ok) return begin

  const publicKey = PublicKeyCredential.parseCreationOptionsFromJSON(begin.value.publicKey)
  const credential = await ceremony(() => navigator.credentials.create({ publicKey }))
  if (!credential) return cancelled

  return post('registration-finish', { credential })
}

export async function login() {
  const begin = await post('login-begin', {})
  const publicKey = PublicKeyCredential.parseRequestOptionsFromJSON(begin.value.publicKey)
  const credential = await ceremony(() => navigator.credentials.get({ publicKey }))
  if (!credential) return cancelled

  return post('login-finish', { credential })
}

async function ceremony(run: () => Promise<Credential | null>): Promise<CredentialJSON | null> {
  try {
    const credential = await run()
    return credential instanceof PublicKeyCredential ? credential.toJSON() : null
  } catch (error) {
    if (error instanceof DOMException && error.name === 'NotAllowedError') return null
    throw error
  }
}

async function post<S extends Step>(step: S, body: Steps[S]['body']): Promise<Reply<S>> {
  const response = await fetch(`/auth/${step}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`${step}: ${response.status}`)
  const reply: Reply<S> = await response.json()
  return reply
}
