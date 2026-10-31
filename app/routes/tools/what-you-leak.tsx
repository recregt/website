import { useEffect, useState } from 'react'

import { SiteHero } from '~/components/cover-hero'
import { Page } from '~/components/page'
import { PageHeader } from '~/components/page-header'
import { Section } from '~/components/section'

import { connectionSignals } from '../../../server/leak.server'
import {
  type BrowserSignals,
  listenForVoices,
  readBrowser,
} from '../../tools/what-you-leak/browser'
import {
  browserGroup,
  buildStory,
  connectionGroup,
  type Group,
} from '../../tools/what-you-leak/report'
import type { Route } from './+types/what-you-leak'

export const meta: Route.MetaFunction = () => [
  { title: 'What You Leak · recregt' },
  {
    name: 'description',
    content:
      'What any website can tell about you from a single visit, read live from your own connection and browser.',
  },
]

export const headers: Route.HeadersFunction = () => ({ 'Cache-Control': 'private, no-store' })

export function loader({ request }: Route.LoaderArgs) {
  return { connection: connectionSignals(request) }
}

export default function WhatYouLeak({ loaderData: { connection } }: Route.ComponentProps) {
  const [browser, setBrowser] = useState<BrowserSignals | null>(null)

  useEffect(() => {
    let active = true
    readBrowser().then((signals) => {
      if (active) setBrowser(signals)
    })
    const stop = listenForVoices((voices) =>
      setBrowser((current) => (current ? { ...current, voices } : current)),
    )
    return () => {
      active = false
      stop()
    }
  }, [])

  return (
    <Page
      narrow
      hero={
        <SiteHero page="tools">
          <PageHeader title="What You Leak" />
        </SiteHero>
      }
    >
      <section className="flex flex-col gap-4">
        <p className="font-heading text-2xl leading-snug text-balance sm:text-3xl">
          {browser
            ? buildStory(connection, browser).join(' ')
            : 'Reading what your browser gives away…'}
        </p>
        <p className="text-sm text-muted-foreground">
          Nothing here is saved. Location and network come from this one request, and everything
          else is read by your browser and stays on your device.
        </p>
      </section>
      <Findings group={connectionGroup(connection)} />
      {browser ? (
        <Findings group={browserGroup(connection, browser)} />
      ) : (
        <Section title="What your browser reveals">
          <p className="text-sm text-muted-foreground">Reading…</p>
        </Section>
      )}
    </Page>
  )
}

function Findings({ group }: { group: Group }) {
  return (
    <Section title={group.title}>
      <dl className="divide-y divide-border">
        {group.findings.map((finding) => (
          <div key={finding.label} className="grid gap-1 py-4 sm:grid-cols-3 sm:gap-6">
            <dt className="text-sm text-muted-foreground">{finding.label}</dt>
            <dd className="flex flex-col gap-1 sm:col-span-2">
              <span className={finding.value === null ? 'text-ring' : 'break-words'}>
                {finding.value ?? group.empty}
                {finding.value !== null && finding.guess && (
                  <span className="ml-2 text-xs text-muted-foreground">estimate</span>
                )}
              </span>
              <span className="text-sm text-muted-foreground">{finding.hide}</span>
            </dd>
          </div>
        ))}
      </dl>
    </Section>
  )
}
