import { data } from 'react-router'

import { findPost } from '../../../server/blog.server'
import { Body } from '../../blog/body'
import { imageUrl } from '../../blog/sanity'
import type { Route } from './+types/post'

export const meta: Route.MetaFunction = ({ loaderData }) => [
  { title: `${loaderData.post.title} · recregt` },
  { name: 'description', content: loaderData.post.summary },
]

export async function loader({ params }: Route.LoaderArgs) {
  const post = await findPost(params.slug)
  if (!post) throw data(null, { status: 404 })
  return { post }
}

export default function BlogPost({ loaderData: { post } }: Route.ComponentProps) {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <article>
        <header>
          <h1 className="font-heading text-4xl font-semibold tracking-tight text-balance">
            {post.title}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">{post.summary}</p>
          <time
            className="mt-5 block font-mono text-sm text-muted-foreground"
            dateTime={post.publishedAt.toISOString()}
          >
            {post.publishedAt.toDateString()}
          </time>
        </header>
        {post.coverImage && (
          <img
            className="mt-10 rounded-lg border border-border"
            src={imageUrl(post.coverImage, 1600)}
            alt={post.coverImage.alt ?? ''}
          />
        )}
        <div className="mt-10">
          <Body value={post.body} />
        </div>
      </article>
    </main>
  )
}
