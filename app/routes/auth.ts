import { runStep } from '../../server/auth.server'
import { userContext } from '../../server/session.server'
import type { Route } from './+types/auth'

export function action({ context, params, request }: Route.ActionArgs) {
  return runStep(params.step, request, context.get(userContext))
}
