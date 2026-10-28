import { Link } from 'react-router'

import { listPosts } from '../../../server/blog.server'
import type { Route } from './+types/index'

export const meta: Route.MetaFunction = () => [{ title: 'Blog · recregt' }]

export async function loader() {
  return { posts: await listPosts() }
}

export default function Blog({ loaderData: { posts } }: Route.ComponentProps) {
  return (
    <main>
      <h1>Blog</h1>
      <ul>
        {posts.map((post) => (
          <li key={post.slug}>
            <Link to={`/blog/${post.slug}`}>{post.title}</Link>
            <p>{post.summary}</p>
            <time dateTime={post.publishedAt.toISOString()}>{post.publishedAt.toDateString()}</time>
          </li>
        ))}
      </ul>
    </main>
  )
}
