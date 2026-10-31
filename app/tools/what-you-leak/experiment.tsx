import { useEffect, useState } from 'react'

import { Section } from '~/components/section'
import { Button } from '~/components/ui/button'

import {
  forget,
  type Mechanism,
  mechanisms,
  newTag,
  plant,
  type Recovery,
  recover,
  tagCreated,
} from './tracking'

const places: Record<Mechanism, { name: string; note: string }> = {
  cookie: { name: 'Cookie', note: 'Removed when you clear cookies.' },
  localStorage: { name: 'Local storage', note: 'Removed with cookies and site data.' },
  sessionStorage: { name: 'Session storage', note: 'Lives only while this tab stays open.' },
  indexedDB: { name: 'IndexedDB', note: 'Removed with cookies and site data.' },
  cacheStorage: { name: 'Cache storage', note: 'Removed with cookies and site data.' },
  httpCache: {
    name: 'Browser cache (ETag)',
    note: 'Survives clearing cookies and site data. Only clearing cached images and files removes it.',
  },
}

const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
const minute = 60_000
const hour = 60 * minute

export function Experiment() {
  const [recovery, setRecovery] = useState<Recovery | null>(null)
  const [justPlanted, setJustPlanted] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    recover().then(setRecovery)
  }, [])

  const run = async (task: () => Promise<void>, planted: boolean) => {
    setBusy(true)
    await task()
    setJustPlanted(planted)
    setRecovery(await recover())
    setBusy(false)
  }

  const found = recovery ? mechanisms.filter((mechanism) => recovery[mechanism]) : []

  return (
    <Section title="Can we find you again?">
      {recovery === null ? (
        <p className="text-sm text-muted-foreground">Checking…</p>
      ) : found.length === 0 ? (
        <div className="flex flex-col items-start gap-4">
          <p>
            We can leave the same random tag in {mechanisms.length} places in your browser. Then
            clear your cookies or browsing data, or open this page in a private window, and come
            back. We will show which places still remember you.
          </p>
          <Button disabled={busy} onClick={() => run(() => plant(newTag()), true)}>
            Leave the tags
          </Button>
          <p className="text-sm text-muted-foreground">
            The tag is random, stays in your browser for a day, and is never stored on our side.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p>{summary(recovery, found, justPlanted)}</p>
          <dl className="divide-y divide-border">
            {mechanisms.map((mechanism) => {
              const tag = recovery[mechanism]
              return (
                <div key={mechanism} className="grid gap-1 py-4 sm:grid-cols-3 sm:gap-6">
                  <dt className="text-sm text-muted-foreground">{places[mechanism].name}</dt>
                  <dd className="flex flex-col gap-1 sm:col-span-2">
                    <span className={tag ? 'text-ring' : undefined}>
                      {tag ? `Remembers you, tagged ${age(tag)}` : 'Forgot you'}
                    </span>
                    <span className="text-sm text-muted-foreground">{places[mechanism].note}</span>
                  </dd>
                </div>
              )
            })}
          </dl>
          <div className="flex flex-wrap gap-3">
            <Button disabled={busy} onClick={() => run(() => plant(newTag()), true)}>
              Leave new tags
            </Button>
            <Button variant="outline" disabled={busy} onClick={() => run(forget, false)}>
              Forget me
            </Button>
          </div>
        </div>
      )}
    </Section>
  )
}

function summary(recovery: Recovery, found: Mechanism[], justPlanted: boolean): string {
  if (justPlanted) {
    return `Tags left in ${found.length} places. Now clear your cookies or browsing data and reload this page, or open it in a private window.`
  }
  if (recovery.httpCache && !recovery.cookie) {
    return `You cleared your cookies, but your browser's cache still recognized you from a tag left ${age(recovery.httpCache)}.`
  }
  return `${found.length} of ${mechanisms.length} places still remember you.`
}

function age(tag: string): string {
  const created = tagCreated(tag)
  if (!created) return 'earlier'
  const elapsed = Date.now() - created.getTime()
  if (elapsed < minute) return 'just now'
  if (elapsed < hour) return relative.format(-Math.round(elapsed / minute), 'minute')
  return relative.format(-Math.round(elapsed / hour), 'hour')
}
