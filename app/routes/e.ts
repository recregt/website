import { recordEngagement } from '../../server/analytics.server'
import type { Route } from './+types/e'

export function action({ request }: Route.ActionArgs) {
  return recordEngagement(request)
}
