import { Link } from 'react-router'

import { SiteHero } from '~/components/cover-hero'
import { Page } from '~/components/page'
import { PageHeader } from '~/components/page-header'

import { tools } from '../../tools/registry'
import type { Route } from './+types/index'

export const meta: Route.MetaFunction = () => [{ title: 'Tools · recregt' }]

export default function Tools() {
  return (
    <Page
      narrow
      hero={
        <SiteHero page="tools">
          <PageHeader title="Tools" />
        </SiteHero>
      }
    >
      <ul className="-mt-6 divide-y divide-border">
        {tools.map((tool) => (
          <li key={tool.slug}>
            <Link to={`/tools/${tool.slug}`} viewTransition className="group block py-6">
              <h2 className="font-heading text-2xl font-medium tracking-tight transition-colors group-hover:text-ring">
                {tool.title}
              </h2>
              <p className="mt-2 text-muted-foreground">{tool.summary}</p>
            </Link>
          </li>
        ))}
      </ul>
    </Page>
  )
}
