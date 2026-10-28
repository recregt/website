import { env } from 'cloudflare:workers'
import { z } from 'zod'

const verdict = z.object({ success: z.boolean() })

export function turnstileSiteKey(): string {
  return env.TURNSTILE_SITE_KEY
}

export async function verifyHuman(token: string, request: Request): Promise<boolean> {
  const form = new FormData()
  form.set('secret', env.TURNSTILE_SECRET)
  form.set('response', token)
  const ip = request.headers.get('cf-connecting-ip')
  if (ip) form.set('remoteip', ip)

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: form,
  })
  if (!response.ok) throw new Error(`turnstile siteverify: ${response.status}`)
  return verdict.parse(await response.json()).success
}
