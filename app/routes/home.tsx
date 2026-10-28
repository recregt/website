import { Form, Link } from 'react-router'

import { userContext } from '../../server/session.server'
import type { Route } from './+types/home'

export const meta: Route.MetaFunction = () => [{ title: 'recregt' }]

export function loader({ context }: Route.LoaderArgs) {
  return { user: context.get(userContext) }
}

export default function Home({ loaderData: { user } }: Route.ComponentProps) {
  return (
    <main>
      <h1>recregt</h1>
      <Link to="/blog">Blog</Link>
      {user ? (
        <Form method="post" action="/signout">
          <p>Signed in as @{user.handle}</p>
          <button type="submit">Sign out</button>
        </Form>
      ) : (
        <Link to="/signin">Sign in</Link>
      )}
    </main>
  )
}
