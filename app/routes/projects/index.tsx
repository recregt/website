import { SiteHero } from '~/components/cover-hero'
import { Notice } from '~/components/notice'
import { Page } from '~/components/page'
import { PageHeader } from '~/components/page-header'

import { listProjects } from '../../../server/content.server'
import { ProjectList } from '../../projects/list'
import type { Route } from './+types/index'

export const meta: Route.MetaFunction = () => [{ title: 'Projects · recregt' }]

export async function loader() {
  return { projects: await listProjects() }
}

export default function Projects({ loaderData: { projects } }: Route.ComponentProps) {
  return (
    <Page
      narrow
      hero={
        <SiteHero>
          <PageHeader
            title="Projects"
            description="What I build, and the posts written about each."
          />
        </SiteHero>
      }
    >
      {projects.length > 0 ? (
        <div className="-mt-6">
          <ProjectList projects={projects} />
        </div>
      ) : (
        <Notice>Nothing published yet.</Notice>
      )}
    </Page>
  )
}
