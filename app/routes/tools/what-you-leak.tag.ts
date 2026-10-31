import type { Route } from './+types/what-you-leak.tag'

const cookieName = 'leak_tag'
const tagHeader = 'x-leak-tag'
const tagLifetimeSeconds = 24 * 60 * 60
const tagPattern = /^[a-z0-9]{1,16}\.\d{1,16}$/

export function loader({ request }: Route.LoaderArgs) {
  const kind = new URL(request.url).searchParams.get('kind')
  if (kind === 'cookie') {
    return Response.json({ tag: readCookie(request) }, { headers: { 'Cache-Control': 'no-store' } })
  }
  if (kind === 'etag') return etag(request)
  return new Response(null, { status: 404 })
}

export async function action({ request }: Route.ActionArgs) {
  if (request.method === 'DELETE') {
    return new Response(null, { status: 204, headers: { 'Set-Cookie': cookie('', 0) } })
  }
  const tag = await request.text()
  if (!tagPattern.test(tag)) return new Response(null, { status: 400 })
  return new Response(null, {
    status: 204,
    headers: { 'Set-Cookie': cookie(tag, tagLifetimeSeconds) },
  })
}

function etag(request: Request): Response {
  const planted = request.headers.get(tagHeader)
  if (planted !== null) {
    if (planted !== '' && !tagPattern.test(planted)) return new Response(null, { status: 400 })
    return new Response(planted, {
      headers: { ETag: `"${planted || 'none'}"`, 'Cache-Control': 'private, no-cache' },
    })
  }
  const known = request.headers.get('if-none-match')
  if (known) {
    return new Response(null, {
      status: 304,
      headers: { ETag: known, 'Cache-Control': 'private, no-cache' },
    })
  }
  return new Response('', { headers: { 'Cache-Control': 'no-store' } })
}

function readCookie(request: Request): string | null {
  const header = request.headers.get('cookie') ?? ''
  const value = header
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`))
    ?.slice(cookieName.length + 1)
  return value && tagPattern.test(value) ? value : null
}

function cookie(value: string, maxAge: number): string {
  return `${cookieName}=${value}; Max-Age=${maxAge}; Path=/tools/what-you-leak; HttpOnly; Secure; SameSite=Lax`
}
