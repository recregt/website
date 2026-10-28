import { redirect } from 'react-router'

import { endSession } from '../../server/session.server'
import type { Route } from './+types/signout'

export async function action({ request }: Route.ActionArgs) {
  return redirect('/', { headers: { 'set-cookie': await endSession(request) } })
}
