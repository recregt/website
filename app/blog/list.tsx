import { Link } from 'react-router'

import { Meta } from '~/components/meta'

import type { PostSummary } from '../../server/content.server'

export const postDate = new Intl.DateTimeFormat('en', { dateStyle: 'long', timeZone: 'UTC' })

export function PostList({ posts }: { posts: PostSummary[] }) {
  return (
    <ul className="divide-y divide-border">
      {posts.map((post) => (
        <li key={post.slug}>
          <Link to={`/blog/${post.slug}`} viewTransition className="group block py-6">
            <Meta>
              <time dateTime={post.publishedAt.toISOString()}>
                {postDate.format(post.publishedAt)}
              </time>
              {post.projects.map((project) => (
                <span key={project.slug} className="font-mono">
                  {project.title}
                </span>
              ))}
            </Meta>
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
