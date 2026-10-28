import { createRequestHandler, RouterContextProvider } from 'react-router'

import { recordRequest } from '../server/analytics.server'
import { userContext } from '../server/session.server'

export { ParvusContainer } from '../server/parvus/container.server'

const handleRequest = createRequestHandler(
  () => import('virtual:react-router/server-build'),
  import.meta.env.MODE,
)

export default {
  async fetch(request, _env, ctx) {
    const started = Date.now()
    const context = new RouterContextProvider()
    const response = await handleRequest(request, context)
    const handle = context.get(userContext)?.handle ?? ''
    ctx.waitUntil(recordRequest(request, response.status, Date.now() - started, handle))
    return response
  },
} satisfies ExportedHandler<Env>
