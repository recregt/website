import { useEffect, useRef, useState } from 'react'

import { SiteHero } from '~/components/cover-hero'
import { Page } from '~/components/page'
import { PageHeader } from '~/components/page-header'
import { cn } from '~/lib/utils'

import type { Globe } from '../../tools/orbis/globe'
import { heightsFrom, paint, type Relief, type View, type World } from '../../tools/orbis/paint'
import type { Reply, Request } from '../../tools/orbis/worker'
import type { Route } from './+types/orbis'

export const meta: Route.MetaFunction = () => [
  { title: 'Orbis · recregt' },
  {
    name: 'description',
    content: 'A planet simulated from first principles, live in your browser.',
  },
]

const views: { value: View; label: string }[] = [
  { value: 'surface', label: 'Surface' },
  { value: 'temperature', label: 'Temperature' },
  { value: 'rain', label: 'Rain' },
  { value: 'ipse', label: 'Ipse' },
]

const sizes = [
  { value: '32x16', label: '32 × 16' },
  { value: '64x32', label: '64 × 32' },
  { value: '128x64', label: '128 × 64' },
]

type Stage =
  | { step: 'climate'; since: number }
  | { step: 'relief'; since: number; climate: number }
  | { step: 'done'; climate: number; relief: number }

export default function Orbis() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const globe = useRef<Globe | null>(null)
  const worker = useRef<Worker | null>(null)
  const [seed, setSeed] = useState('1')
  const [size, setSize] = useState('64x32')
  const [view, setView] = useState<View>('surface')
  const [world, setWorld] = useState<World | null>(null)
  const [relief, setRelief] = useState<Relief | null>(null)
  const [stage, setStage] = useState<Stage | null>(null)
  const [now, setNow] = useState(0)

  useEffect(() => {
    let active = true
    import('../../tools/orbis/globe').then(({ createGlobe }) => {
      if (active && canvas.current) globe.current = createGlobe(canvas.current)
    })
    return () => {
      active = false
      globe.current?.dispose()
      globe.current = null
      worker.current?.terminate()
    }
  }, [])

  useEffect(() => {
    if (stage?.step === 'done' || !stage) return
    const timer = setInterval(() => setNow(performance.now()), 100)
    return () => clearInterval(timer)
  }, [stage])

  useEffect(() => {
    if (!world) return
    const shown = relief ?? heightsFrom(world)
    globe.current?.show(paint(world, shown, view), shown)
  }, [world, relief, view])

  function generate(event?: React.FormEvent) {
    event?.preventDefault()
    worker.current?.terminate()
    const next = new Worker(new URL('../../tools/orbis/worker.ts', import.meta.url), {
      type: 'module',
    })
    worker.current = next
    setRelief(null)
    setStage({ step: 'climate', since: performance.now() })
    next.onmessage = ({ data }: MessageEvent<Reply>) => {
      if (data.kind === 'world') {
        setWorld(data)
        setStage({ step: 'relief', since: performance.now(), climate: data.seconds })
      } else {
        setRelief(data)
        setStage((current) => ({
          step: 'done',
          climate: current && 'climate' in current ? current.climate : 0,
          relief: data.seconds,
        }))
      }
    }
    const [width = 64, height = 32] = size.split('x').map(Number)
    next.postMessage({ seed, width, height } satisfies Request)
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: generate once on load
  useEffect(() => generate(), [])

  const status = !stage
    ? ''
    : stage.step === 'climate'
      ? `Simulating climate… ${(Math.max(now - stage.since, 0) / 1000).toFixed(1)} s`
      : stage.step === 'relief'
        ? `Climate ${stage.climate.toFixed(1)} s · carving relief… ${(Math.max(now - stage.since, 0) / 1000).toFixed(1)} s`
        : `Climate ${stage.climate.toFixed(1)} s · relief ${stage.relief.toFixed(1)} s`

  return (
    <Page
      hero={
        <SiteHero page="tools">
          <PageHeader
            title="Orbis"
            description="A planet simulated from first principles, live in your browser."
          />
        </SiteHero>
      }
    >
      <section className="flex flex-col gap-4">
        <form onSubmit={generate} className="flex flex-wrap items-end gap-3 text-sm">
          <label className="flex flex-col gap-1">
            <span className="text-muted-foreground">Seed</span>
            <input
              value={seed}
              onChange={(event) => setSeed(event.target.value.replace(/\D/g, ''))}
              inputMode="numeric"
              className="w-32 rounded-md border border-border bg-transparent px-2 py-1.5"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-muted-foreground">Grid</span>
            <select
              value={size}
              onChange={(event) => setSize(event.target.value)}
              className="rounded-md border border-border bg-transparent px-2 py-1.5"
            >
              {sizes.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={!seed}
            className="rounded-md border border-border px-3 py-1.5 transition-colors hover:text-ring"
          >
            Generate
          </button>
          <span className="ml-auto text-muted-foreground tabular-nums">{status}</span>
        </form>
        <div className="flex flex-wrap gap-1 text-sm">
          {views.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setView(option.value)}
              className={cn(
                'rounded-md px-3 py-1.5 transition-colors',
                view === option.value
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <canvas
          ref={canvas}
          className="aspect-square w-full cursor-grab touch-none rounded-lg bg-black active:cursor-grabbing sm:aspect-[16/10]"
        />
      </section>
    </Page>
  )
}
