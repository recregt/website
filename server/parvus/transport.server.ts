import { env } from 'cloudflare:workers'

export function send(path: string, init: RequestInit): Promise<Response> {
  const headers = new Headers(init.headers)
  headers.set('authorization', `Bearer ${env.PARVUS_SECRET}`)
  const request = { ...init, headers }

  if (env.PARVUS_DEV_URL) return fetch(new URL(path, env.PARVUS_DEV_URL), request)
  return env.PARVUS.getByName('parvus').fetch(new Request(new URL(path, 'http://parvus'), request))
}
