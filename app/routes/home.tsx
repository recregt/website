import type { Route } from './+types/home'

export const meta: Route.MetaFunction = () => [{ title: 'recregt' }]

export default function Home() {
  return <h1>recregt</h1>
}
