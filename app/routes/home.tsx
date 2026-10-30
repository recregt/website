import { Link } from 'react-router'

import { Notice } from '~/components/notice'
import { Page } from '~/components/page'

import { listPosts } from '../../server/blog.server'
import { PostList } from '../blog/list'
import type { Route } from './+types/home'

export const meta: Route.MetaFunction = () => [{ title: 'recregt' }]

export async function loader() {
  return { posts: (await listPosts()).slice(0, 3) }
}

export default function Home({ loaderData: { posts } }: Route.ComponentProps) {
  return (
    <Page narrow>
      <div className="pt-6">
        <h1 className="font-heading text-5xl font-medium tracking-tight sm:text-6xl">recregt</h1>
        <p className="mt-5 text-xl text-muted-foreground">
          Notes and experiments on the modern web.
        </p>
      </div>
      <section>
        <div className="flex items-baseline justify-between border-b border-border pb-3">
          <h2 className="text-sm font-medium">Latest writing</h2>
          {posts.length > 0 && (
            <Link
              to="/blog"
              viewTransition
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              All posts
            </Link>
          )}
        </div>
        {posts.length > 0 ? (
          <PostList posts={posts} />
        ) : (
          <div className="pt-6">
            <Notice
              action={
                <Link to="/stats" viewTransition className="text-sm font-medium text-ring">
                  See how the site is doing
                </Link>
              }
            >
              Nothing published yet.
            </Notice>
          </div>
        )}
      </section>
    </Page>
  )
}
