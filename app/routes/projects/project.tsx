import { data } from 'react-router'

import { Meta } from '~/components/meta'
import { Page } from '~/components/page'
import { Section } from '~/components/section'

import { findProject } from '../../../server/content.server'
import { PostList } from '../../blog/list'
import { Body } from '../../content/body'
import { coverWidth, imageUrl } from '../../content/sanity'
import { statusLabel } from '../../projects/list'
import type { Route } from './+types/project'

export const meta: Route.MetaFunction = ({ loaderData }) => [
  { title: `${loaderData.project.title} · recregt` },
  { name: 'description', content: loaderData.project.summary },
]

export async function loader({ params }: Route.LoaderArgs) {
  const project = await findProject(params.slug)
  if (!project) throw data(null, { status: 404 })
  return { project }
}

export default function Project({ loaderData: { project } }: Route.ComponentProps) {
  const links = [
    { label: 'Repository', href: project.repository },
    { label: 'Website', href: project.website },
  ].filter((link): link is { label: string; href: string } => link.href !== null)
  return (
    <Page narrow>
      <article>
        <header>
          <Meta>
            <span>{project.year}</span>
            <span>{statusLabel[project.status]}</span>
          </Meta>
          <h1 className="mt-2 font-heading text-4xl font-medium tracking-tight text-balance sm:text-5xl">
            {project.title}
          </h1>
          <p className="mt-4 text-xl text-muted-foreground">{project.summary}</p>
          {project.stack.length > 0 && (
            <Meta className="mt-6 font-mono">
              {project.stack.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </Meta>
          )}
          {links.length > 0 && (
            <div className="mt-4 flex gap-5 text-sm font-medium">
              {links.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-ring underline decoration-ring/60 underline-offset-4 hover:decoration-ring"
                >
                  {link.label}
                </a>
              ))}
            </div>
          )}
        </header>
        {project.coverImage && (
          <img
            className="mt-10 rounded-lg border border-border"
            src={imageUrl(project.coverImage, coverWidth)}
            alt={project.coverImage.alt ?? ''}
          />
        )}
        <div className="mt-10">
          <Body value={project.body} />
        </div>
      </article>
      {project.posts.length > 0 && (
        <Section title="Writing">
          <PostList posts={project.posts} />
        </Section>
      )}
    </Page>
  )
}
