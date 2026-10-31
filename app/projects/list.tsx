import { Link } from 'react-router'

import { Meta } from '~/components/meta'

import type { ProjectSummary } from '../../server/content.server'

export const statusLabel = { active: 'Active', archived: 'Archived' } as const

const lastPost = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric', timeZone: 'UTC' })

export function ProjectList({ projects }: { projects: ProjectSummary[] }) {
  return (
    <ul className="divide-y divide-border">
      {projects.map((project) => (
        <li key={project.slug}>
          <Link to={`/projects/${project.slug}`} viewTransition className="group block py-6">
            <Meta>
              <span>{project.year}</span>
              <span>{statusLabel[project.status]}</span>
              {project.lastPostAt && (
                <span>
                  {project.posts} {project.posts === 1 ? 'post' : 'posts'}, last{' '}
                  {lastPost.format(project.lastPostAt)}
                </span>
              )}
            </Meta>
            <h2 className="mt-1 font-heading text-2xl font-medium tracking-tight transition-colors group-hover:text-ring">
              {project.title}
            </h2>
            <p className="mt-2 text-muted-foreground">{project.summary}</p>
          </Link>
        </li>
      ))}
    </ul>
  )
}
