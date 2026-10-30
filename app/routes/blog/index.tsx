import { PageHeader } from '~/components/page-header'

import { listPosts } from '../../../server/blog.server'
import { PostList } from '../../blog/list'
import type { Route } from './+types/index'

export const meta: Route.MetaFunction = () => [{ title: 'Blog · recregt' }]

export async function loader() {
  return { posts: await listPosts() }
}

export default function Blog({ loaderData: { posts } }: Route.ComponentProps) {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <PageHeader title="Blog" />
      <div className="mt-4">
        <PostList posts={posts} />
      </div>
    </main>
  )
}
