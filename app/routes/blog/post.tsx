import { data, Link } from 'react-router'

import { CoverHero } from '~/components/cover-hero'
import { Meta } from '~/components/meta'
import { Page } from '~/components/page'
import { Section } from '~/components/section'

import { findPost } from '../../../server/content.server'
import { PostList, postDate } from '../../blog/list'
import { Body } from '../../content/body'
import { coverSources } from '../../content/sanity'
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
  const header = (
    <header>
      <Meta>
        <time dateTime={post.publishedAt.toISOString()}>{postDate.format(post.publishedAt)}</time>
        {post.projects.map((project) => (
          <Link
            key={project.slug}
            to={`/projects/${project.slug}`}
            viewTransition
            className="font-mono transition-colors hover:text-ring"
          >
            {project.title}
          </Link>
        ))}
      </Meta>
      <h1 className="mt-2 font-heading text-4xl font-medium tracking-tight text-balance sm:text-5xl">
        {post.title}
      </h1>
      <p className="mt-4 text-xl text-muted-foreground">{post.summary}</p>
    </header>
  )
  const cover = post.coverImage
  return (
    <Page
      narrow
      hero={
        cover && (
          <CoverHero {...coverSources(cover)} alt={cover.alt ?? ''}>
            {header}
          </CoverHero>
        )
      }
    >
      <article>
        {!cover && <div className="mb-10">{header}</div>}
        <Body value={post.body} />
      </article>
      {post.projects
        .filter((project) => project.posts.length > 0)
        .map((project) => (
          <Section
            key={project.slug}
            title={`More on ${project.title}`}
            action={
              <Link
                to={`/projects/${project.slug}`}
                viewTransition
                className="hover:text-foreground"
              >
                About the project
              </Link>
            }
          >
            <PostList posts={project.posts} />
          </Section>
        ))}
    </Page>
  )
}
