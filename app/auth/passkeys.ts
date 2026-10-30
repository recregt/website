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

export async function addPasskey() {
  const begin = await confirmed(() => post('passkey-begin', {}))
  if (!begin.ok) return begin

  const publicKey = PublicKeyCredential.parseCreationOptionsFromJSON(begin.value.publicKey)
  const credential = await ceremony(() => navigator.credentials.create({ publicKey }))
  if (!credential) return cancelled

  return post('passkey-finish', { credential })
}

export function renamePasskey(id: string, name: string) {
  return post('passkey-rename', { id, name })
}

export function removePasskey(id: string) {
  return confirmed(() => post('passkey-remove', { id }))
}

async function confirmed<S extends Step>(attempt: () => Promise<Reply<S>>) {
  const first = await attempt()
  if (first.ok || first.error !== 'not_confirmed') return first

  const begin = await post('confirm-begin', {})
  if (!begin.ok) return begin
  const publicKey = PublicKeyCredential.parseRequestOptionsFromJSON(begin.value.publicKey)
  const credential = await ceremony(() => navigator.credentials.get({ publicKey }))
  if (!credential) return cancelled

  const finish = await post('confirm-finish', { credential })
  if (!finish.ok) return finish
  return attempt()
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
