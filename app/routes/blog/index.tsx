import { SiteHero } from '~/components/cover-hero'
import { Notice } from '~/components/notice'
import { Page } from '~/components/page'
import { PageHeader } from '~/components/page-header'

import { listPosts } from '../../../server/content.server'
import { PostList } from '../../blog/list'
import type { Route } from './+types/index'

export const meta: Route.MetaFunction = () => [{ title: 'Blog · recregt' }]

export async function loader() {
  return { posts: await listPosts() }
}

export default function Blog({ loaderData: { posts } }: Route.ComponentProps) {
  return (
    <Page
      narrow
      hero={
        <SiteHero>
          <PageHeader title="Blog" />
        </SiteHero>
      }
    >
      {posts.length > 0 ? (
        <div className="-mt-6">
          <PostList posts={posts} />
        </div>
      ) : (
        <Notice>Nothing published yet.</Notice>
      )}
    </Page>
  )
}
