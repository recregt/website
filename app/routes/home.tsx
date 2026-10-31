import { Link } from 'react-router'

import { SiteHero } from '~/components/cover-hero'
import { Notice } from '~/components/notice'
import { Page } from '~/components/page'
import { Section } from '~/components/section'

import { listPosts, listProjects } from '../../server/content.server'
import { PostList } from '../blog/list'
import { ProjectList } from '../projects/list'
import type { Route } from './+types/home'

export const meta: Route.MetaFunction = () => [{ title: 'recregt' }]

export async function loader() {
  const [posts, projects] = await Promise.all([listPosts(), listProjects()])
  return { posts: posts.slice(0, 3), featured: projects.filter((project) => project.featured) }
}

export default function Home({ loaderData: { posts, featured } }: Route.ComponentProps) {
  return (
    <Page
      narrow
      hero={
        <SiteHero>
          <h1 className="font-heading text-5xl font-medium tracking-tight sm:text-6xl">recregt</h1>
        </SiteHero>
      }
    >
      {featured.length > 0 && (
        <Section title="Selected projects" action={<More to="/projects">All projects</More>}>
          <ProjectList projects={featured} />
        </Section>
      )}
      <Section
        title="Latest writing"
        action={posts.length > 0 && <More to="/blog">All posts</More>}
      >
        {posts.length > 0 ? (
          <PostList posts={posts} />
        ) : (
          <Notice
            action={
              <Link to="/stats" viewTransition className="text-sm font-medium text-ring">
                See how the site is doing
              </Link>
            }
          >
            Nothing published yet.
          </Notice>
        )}
      </Section>
    </Page>
  )
}

function More({ to, children }: { to: string; children: string }) {
  return (
    <Link to={to} viewTransition className="hover:text-foreground">
      {children}
    </Link>
  )
}
