import { Link } from 'react-router'

import { listPosts } from '../../server/blog.server'
import { PostList } from '../blog/list'
import type { Route } from './+types/home'

export const meta: Route.MetaFunction = () => [{ title: 'recregt' }]

export async function loader() {
  return { posts: (await listPosts()).slice(0, 3) }
}

export default function Home({ loaderData: { posts } }: Route.ComponentProps) {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="font-heading text-5xl font-semibold tracking-tight">recregt</h1>
      <p className="mt-4 max-w-md text-lg text-muted-foreground">
        Notes and experiments on the modern web.
      </p>
      {posts.length > 0 && (
        <div className="mt-12">
          <PostList posts={posts} />
          <p className="mt-6 font-mono text-sm">
            <Link
              to="/blog"
              viewTransition
              className="text-ring underline decoration-ring/50 underline-offset-4 hover:decoration-ring"
            >
              All posts →
            </Link>
          </p>
        </div>
      )}
    </main>
  )
}
