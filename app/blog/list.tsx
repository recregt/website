import { Link } from 'react-router'

import type { PostSummary } from '../../server/blog.server'

export function PostList({ posts }: { posts: PostSummary[] }) {
  if (posts.length === 0) return <p className="text-muted-foreground">No posts yet.</p>
  return (
    <ul>
      {posts.map((post) => (
        <li key={post.slug} className="border-t border-border first:border-t-0">
          <Link to={`/blog/${post.slug}`} className="group block py-6">
            <h2 className="font-heading text-2xl font-medium tracking-tight transition-colors group-hover:text-ring">
              {post.title}
            </h2>
            <p className="mt-2 text-muted-foreground">{post.summary}</p>
            <time
              className="mt-3 block font-mono text-xs text-muted-foreground"
              dateTime={post.publishedAt.toISOString()}
            >
              {post.publishedAt.toDateString()}
            </time>
          </Link>
        </li>
      ))}
    </ul>
  )
}
