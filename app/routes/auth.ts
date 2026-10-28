import { runStep } from '../../server/auth.server'
import type { Route } from './+types/auth'

export function action({ params, request }: Route.ActionArgs) {
  return runStep(params.step, request)
}
