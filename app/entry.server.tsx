import { isbot } from 'isbot'
import { renderToReadableStream } from 'react-dom/server'
import type { EntryContext } from 'react-router'
import { ServerRouter } from 'react-router'

export const streamTimeout = 5_000

const turnstile = 'https://challenges.cloudflare.com'
const sanityImages = 'https://cdn.sanity.io'

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
) {
  if (request.method.toUpperCase() === 'HEAD') {
    return new Response(null, { status: responseStatusCode, headers: responseHeaders })
  }

  const nonce = createNonce()
  let shellRendered = false
  const body = await renderToReadableStream(
    <ServerRouter context={routerContext} url={request.url} nonce={nonce} />,
    {
      nonce,
      signal: AbortSignal.timeout(streamTimeout + 1000),
      onError(error: unknown) {
        responseStatusCode = 500
        if (shellRendered) console.error(error)
      },
    },
  )
  shellRendered = true

  const userAgent = request.headers.get('user-agent')
  if ((userAgent && isbot(userAgent)) || routerContext.isSpaMode) await body.allReady

  responseHeaders.set('Content-Type', 'text/html')
  for (const [name, value] of securityHeaders(nonce)) responseHeaders.set(name, value)
  return new Response(body, { headers: responseHeaders, status: responseStatusCode })
}

function securityHeaders(nonce: string): [string, string][] {
  const policy = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' ${turnstile}`,
    `frame-src ${turnstile}`,
    `img-src 'self' ${sanityImages}`,
    "connect-src 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "object-src 'none'",
  ]
  return [
    ['Content-Security-Policy', policy.join('; ')],
    ['Referrer-Policy', 'strict-origin-when-cross-origin'],
    ['Cross-Origin-Opener-Policy', 'same-origin'],
    [
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), publickey-credentials-create=(self), publickey-credentials-get=(self)',
    ],
  ]
}

function createNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return btoa(String.fromCharCode(...bytes))
}
