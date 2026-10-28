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
    <main>
      <article>
        <h1>{post.title}</h1>
        <time dateTime={post.publishedAt.toISOString()}>{post.publishedAt.toDateString()}</time>
        {post.coverImage && (
          <img src={imageUrl(post.coverImage, 1600)} alt={post.coverImage.alt ?? ''} />
        )}
        <Body value={post.body} />
      </article>
    </main>
  )
}
