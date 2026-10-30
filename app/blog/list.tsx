import { Link } from 'react-router'

import type { PostSummary } from '../../server/blog.server'

export const postDate = new Intl.DateTimeFormat('en', { dateStyle: 'long', timeZone: 'UTC' })

export function PostList({ posts }: { posts: PostSummary[] }) {
  return (
    <ul className="divide-y divide-border">
      {posts.map((post) => (
        <li key={post.slug}>
          <Link to={`/blog/${post.slug}`} viewTransition className="group block py-6">
            <time
              className="text-sm text-muted-foreground"
              dateTime={post.publishedAt.toISOString()}
            >
              {postDate.format(post.publishedAt)}
            </time>
            <h2 className="mt-1 font-heading text-2xl font-medium tracking-tight transition-colors group-hover:text-ring">
              {post.title}
            </h2>
            <p className="mt-2 text-muted-foreground">{post.summary}</p>
          </Link>
        </li>
      ))}
    </ul>
  )
}
