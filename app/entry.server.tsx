import { isbot } from 'isbot'
import { renderToReadableStream } from 'react-dom/server'
import type { EntryContext } from 'react-router'
import { ServerRouter } from 'react-router'

import { NonceContext } from './asset-guard'

export const streamTimeout = 5_000

const turnstile = 'https://challenges.cloudflare.com'
const sanityImages = 'https://cdn.sanity.io'

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
) {
  const nonce = createNonce()
  responseHeaders.set('Content-Type', 'text/html')
  for (const [name, value] of securityHeaders(nonce)) responseHeaders.set(name, value)

  if (request.method.toUpperCase() === 'HEAD') {
    return new Response(null, { status: responseStatusCode, headers: responseHeaders })
  }

  let shellRendered = false
  const body = await renderToReadableStream(
    <NonceContext value={nonce}>
      <ServerRouter context={routerContext} url={request.url} nonce={nonce} />
    </NonceContext>,
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

  return new Response(body, { headers: responseHeaders, status: responseStatusCode })
}

function securityHeaders(nonce: string): [string, string][] {
  const policy = [
    "default-src 'self'",
    "style-src 'self' 'unsafe-inline'",
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
