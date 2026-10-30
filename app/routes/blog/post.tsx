import { data } from 'react-router'

import { Page } from '~/components/page'

import { findPost } from '../../../server/blog.server'
import { Body } from '../../blog/body'
import { postDate } from '../../blog/list'
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
    <Page narrow>
      <article>
        <header>
          <time className="text-sm text-muted-foreground" dateTime={post.publishedAt.toISOString()}>
            {postDate.format(post.publishedAt)}
          </time>
          <h1 className="mt-2 font-heading text-4xl font-medium tracking-tight text-balance sm:text-5xl">
            {post.title}
          </h1>
          <p className="mt-4 text-xl text-muted-foreground">{post.summary}</p>
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
    </Page>
  )
}
