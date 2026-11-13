import { Check, LoaderCircle, Shuffle } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { SiteHero } from '~/components/cover-hero'
import { Page } from '~/components/page'
import { PageHeader } from '~/components/page-header'
import { Segmented } from '~/components/segmented'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { cn } from '~/lib/utils'

import { currentField, type FlowKind, windField } from '../../tools/orbis/flow'
import type { Globe, Look } from '../../tools/orbis/globe.client'
import {
  compose,
  heightsOf,
  paint,
  paintRegion,
  ramps,
  runoffSampler,
  sampler,
  type View,
} from '../../tools/orbis/paint'
import type {
  Climate,
  Region,
  RegionRequest,
  Relief,
  Request,
  Shape,
  ShapeReply,
} from '../../tools/orbis/protocol'
import { traceRivers } from '../../tools/orbis/rivers'
import { startClimateWorker, startShapeWorker } from '../../tools/orbis/workers.client'
import type { Route } from './+types/orbis'

export const meta: Route.MetaFunction = () => [
  { title: 'Orbis · recregt' },
  {
    name: 'description',
    content:
      'A planet simulated from first principles, live in your browser: sunlight, winds, rain, rivers, seas and ice.',
  },
]

const views: { value: View; label: string }[] = [
  { value: 'surface', label: 'Surface' },
  { value: 'temperature', label: 'Temperature' },
  { value: 'rain', label: 'Rain' },
  { value: 'ipse', label: 'Ipse' },
]

const flows: { value: FlowKind; label: string }[] = [
  { value: 'none', label: 'Off' },
  { value: 'winds', label: 'Winds' },
  { value: 'currents', label: 'Currents' },
]

const sizes = [
  { value: '32x16', label: 'Coarse' },
  { value: '64x32', label: 'Medium' },
  { value: '128x64', label: 'Fine' },
]

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const COVER = ['Open sea', 'Sea ice', 'Land ice', 'Barren ground', 'Grass', 'Forest']

type Timing = { since: number; seconds?: number }

type Picked = { u: number; v: number }

function seconds(timing: Timing | null, now: number) {
  if (!timing) return ''
  return `${(timing.seconds ?? Math.max(now - timing.since, 0) / 1000).toFixed(1)} s`
}

function placeRegion(globe: Globe | null, region: Region, shape: Shape, climate: Climate | null) {
  const cells = shape.regionCells
  const spacing = shape.regionSpacingMetres
  const cellMetres = spacing / (cells / 2)
  const circumference = shape.circumferenceMetres
  const uv = (cx: number, cy: number): [number, number] => {
    const x = (region.i - 1) * spacing + (cx + 0.5) * cellMetres
    const y = (region.j - 1) * spacing + (cy + 0.5) * cellMetres
    return [(((x / circumference) % 1) + 1) % 1, Math.min(Math.max(y / (circumference / 2), 0), 1)]
  }
  const from = cells / 4
  const to = (cells * 3) / 4
  globe?.tile({
    key: `${region.i},${region.j}`,
    heights: region.heights,
    cells,
    from,
    to,
    uv,
    image: paintRegion(region.heights, cells, from, to, uv, climate, cellMetres),
  })
}

export default function Orbis() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const globe = useRef<Globe | null>(null)
  const shapeWorker = useRef<Worker | null>(null)
  const climateWorker = useRef<Worker | null>(null)
  const regions = useRef(new Map<string, Region>())
  const asked = useRef(new Set<string>())
  const [seed, setSeed] = useState('1')
  const [size, setSize] = useState('64x32')
  const [view, setView] = useState<View>('surface')
  const [flow, setFlow] = useState<FlowKind>('none')
  const [day, setDay] = useState(172)
  const [sunLongitude, setSunLongitude] = useState<number | null>(null)
  const [shape, setShape] = useState<Shape | null>(null)
  const [relief, setRelief] = useState<Relief | null>(null)
  const [climate, setClimate] = useState<Climate | null>(null)
  const [reliefTiming, setReliefTiming] = useState<Timing | null>(null)
  const [climateTiming, setClimateTiming] = useState<Timing | null>(null)
  const [regionCount, setRegionCount] = useState(0)
  const [picked, setPicked] = useState<Picked | null>(null)
  const [ready, setReady] = useState(false)
  const [now, setNow] = useState(0)
  const look = useRef<(look: Look) => void>(() => {})
  const latest = useRef<{ shape: Shape | null; climate: Climate | null }>({
    shape: null,
    climate: null,
  })
  latest.current = { shape, climate }

  useEffect(() => {
    let active = true
    import('../../tools/orbis/globe.client').then(({ createGlobe }) => {
      if (!active || !canvas.current) return
      globe.current = createGlobe(canvas.current, (seen) => look.current(seen))
      setReady(true)
    })
    return () => {
      active = false
      globe.current?.dispose()
      globe.current = null
      shapeWorker.current?.terminate()
      climateWorker.current?.terminate()
    }
  }, [])

  const busy = !!(
    (reliefTiming && reliefTiming.seconds === undefined) ||
    (climateTiming && climateTiming.seconds === undefined)
  )
  useEffect(() => {
    if (!busy) return
    const timer = setInterval(() => setNow(performance.now()), 100)
    return () => clearInterval(timer)
  }, [busy])

  const rivers = useMemo(
    () =>
      shape && relief && climate
        ? traceRivers(relief, shape.circumferenceMetres, runoffSampler(climate))
        : [],
    [shape, relief, climate],
  )

  useEffect(() => {
    if (!ready || !shape) return
    const ground = heightsOf(shape, relief)
    globe.current?.show(compose(paint(ground, climate, view), rivers, view !== 'surface'), ground)
  }, [ready, shape, relief, climate, view, rivers])

  useEffect(() => {
    if (!ready || !shape) return
    const longitude = sunLongitude ?? ((globe.current?.facing() ?? 0) + 0.15) % 1
    if (sunLongitude === null) setSunLongitude(longitude)
    const declination = shape.declination[day % shape.declination.length] ?? 0
    globe.current?.light(declination, longitude)
  }, [ready, shape, day, sunLongitude])

  useEffect(() => {
    if (!ready) return
    if (flow === 'none' || !climate || !shape) {
      globe.current?.flow('none', null)
      return
    }
    globe.current?.flow(flow, flow === 'winds' ? windField(climate) : currentField(climate, shape))
  }, [ready, flow, climate, shape])

  useEffect(() => {
    if (!ready || !shape) return
    globe.current?.clearTiles()
    for (const region of regions.current.values()) {
      placeRegion(globe.current, region, shape, climate)
    }
  }, [ready, shape, climate])

  look.current = ({ u, v }) => {
    if (!shape || !relief || !shapeWorker.current) return
    const spacing = shape.regionSpacingMetres
    const around = Math.round(shape.circumferenceMetres / spacing)
    const rows = Math.round(shape.circumferenceMetres / 2 / spacing)
    const ci = Math.round((u * shape.circumferenceMetres) / spacing)
    const cj = Math.round((v * shape.circumferenceMetres) / 2 / spacing)
    const wanted: [number, number][] = [[0, 0]]
    for (const [di, dj] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [-1, 1],
      [1, -1],
      [-1, -1],
    ] as const) {
      wanted.push([di, dj])
    }
    for (const [di, dj] of wanted) {
      const i = (((ci + di) % around) + around) % around
      const j = cj + dj
      if (j < 0 || j > rows) continue
      const key = `${i},${j}`
      if (asked.current.has(key)) continue
      asked.current.add(key)
      shapeWorker.current.postMessage({ kind: 'region', i, j } satisfies RegionRequest)
    }
  }

  function generate(event?: React.FormEvent) {
    event?.preventDefault()
    shapeWorker.current?.terminate()
    climateWorker.current?.terminate()
    regions.current.clear()
    asked.current.clear()
    globe.current?.clearTiles()
    setRegionCount(0)
    setRelief(null)
    setClimate(null)
    setPicked(null)
    const [width = 64, height = 32] = size.split('x').map(Number)
    const request: Request = { seed, width, height }
    const started = performance.now()
    setReliefTiming({ since: started })
    setClimateTiming({ since: started })

    const shaper = startShapeWorker()
    shaper.onmessage = ({ data }: MessageEvent<ShapeReply>) => {
      if (data.kind === 'shape') setShape(data)
      else if (data.kind === 'relief') {
        setRelief(data)
        setReliefTiming({ since: started, seconds: data.seconds })
      } else {
        regions.current.set(`${data.i},${data.j}`, data)
        setRegionCount(regions.current.size)
        const { shape: current, climate: settled } = latest.current
        if (current) placeRegion(globe.current, data, current, settled)
      }
    }
    shaper.postMessage(request)
    shapeWorker.current = shaper

    const climatist = startClimateWorker()
    climatist.onmessage = ({ data }: MessageEvent<Climate>) => {
      setClimate(data)
      setClimateTiming({ since: started, seconds: data.seconds })
    }
    climatist.postMessage(request)
    climateWorker.current = climatist
  }

  const start = useRef(generate)
  start.current = generate
  useEffect(() => {
    if (ready) start.current()
  }, [ready])

  const legend = view === 'surface' ? null : ramps[view]
  const month = MONTHS[Math.min(Math.floor((day / 365) * 12), 11)]
  const sunDegrees = (((((sunLongitude ?? 0) * 360 + 180) % 360) + 360) % 360) - 180
  const pressed = useRef<{ x: number; y: number } | null>(null)

  return (
    <Page
      hero={
        <SiteHero page="tools">
          <PageHeader
            title="Orbis"
            description="A planet simulated from first principles, live in your browser: sunlight, winds, rain, rivers, seas and ice."
          />
        </SiteHero>
      }
    >
      <section className="flex flex-col gap-3">
        <form onSubmit={generate} className="flex flex-wrap items-center gap-2">
          <div className="flex items-center">
            <Input
              aria-label="Seed"
              value={seed}
              onChange={(event) => setSeed(event.target.value.replace(/\D/g, ''))}
              inputMode="numeric"
              className="w-28 rounded-r-none tabular-nums"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Random seed"
              className="rounded-l-none border-l-0"
              onClick={() => setSeed(String(Math.floor(Math.random() * 1_000_000)))}
            >
              <Shuffle />
            </Button>
          </div>
          <Segmented label="Grid" options={sizes} value={size} onChange={setSize} />
          <Button type="submit" disabled={!seed}>
            Generate
          </Button>
        </form>

        <div className="relative overflow-hidden rounded-xl border border-border bg-black">
          <canvas
            ref={canvas}
            onPointerDown={(event) => {
              pressed.current = { x: event.clientX, y: event.clientY }
            }}
            onClick={(event) => {
              const from = pressed.current
              if (from && Math.hypot(event.clientX - from.x, event.clientY - from.y) > 4) return
              setPicked(globe.current?.pick(event.clientX, event.clientY) ?? null)
            }}
            className="block aspect-square w-full cursor-grab touch-none active:cursor-grabbing sm:aspect-[16/10]"
          />
          <Progress
            steps={[
              { label: 'Ground', done: !!shape },
              { label: 'Relief', done: !!relief, time: seconds(reliefTiming, now) },
              {
                label: climate && !climate.settled ? 'Climate (unsettled)' : 'Climate',
                done: !!climate,
                time: seconds(climateTiming, now),
              },
            ]}
            tiles={regionCount}
          />
          {picked && shape && (
            <Inspector
              picked={picked}
              shape={shape}
              relief={relief}
              climate={climate}
              onClose={() => setPicked(null)}
            />
          )}
          <div className="pointer-events-none absolute inset-x-3 bottom-3 flex flex-wrap items-end justify-between gap-2">
            <div className="pointer-events-auto flex flex-col items-start gap-2">
              {legend && (
                <div className={cn(glass, 'flex items-center gap-2 px-2.5 py-1.5 text-xs')}>
                  <span className="tabular-nums">{legend.stops[0]?.[0]}</span>
                  <span
                    className="h-1.5 w-32 rounded-full"
                    style={{
                      background: `linear-gradient(to right, ${legend.stops
                        .map(([, [r, g, b]]) => `rgb(${r} ${g} ${b})`)
                        .join(', ')})`,
                    }}
                  />
                  <span className="tabular-nums">
                    {legend.stops[legend.stops.length - 1]?.[0]} {legend.unit}
                  </span>
                  {view === 'rain' && <span className="text-white/60">land only</span>}
                </div>
              )}
              <Segmented label="Layer" options={views} value={view} onChange={setView} />
            </div>
            <div className="pointer-events-auto">
              {climate ? (
                <Segmented label="Flow" options={flows} value={flow} onChange={setFlow} />
              ) : (
                <span className={cn(glass, 'px-2.5 py-1.5 text-xs text-white/70')}>
                  Flows appear once the climate settles
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-x-8 gap-y-3 rounded-xl border border-border px-4 py-3 text-sm sm:grid-cols-2">
          <Slider
            label="Season"
            value={`${month} · day ${day + 1}`}
            min={0}
            max={364}
            step={1}
            current={day}
            onChange={setDay}
          />
          <Slider
            label="Sun overhead"
            value={`${Math.abs(sunDegrees).toFixed(0)}° ${sunDegrees >= 0 ? 'E' : 'W'}`}
            min={0}
            max={1}
            step={0.002}
            current={sunLongitude ?? 0}
            onChange={setSunLongitude}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Drag to turn the planet and scroll to zoom; close up, Orbis carves detailed terrain for
          the area in view. Click anywhere to read what the simulation computed there. Winds show
          the prevailing direction of the circulation belts, and currents follow the wind-driven
          gyres.
        </p>
      </section>
    </Page>
  )
}

const glass = 'rounded-lg border border-white/10 bg-black/75 text-white'

function Progress({
  steps,
  tiles,
}: {
  steps: { label: string; done: boolean; time?: string }[]
  tiles: number
}) {
  return (
    <div className={cn(glass, 'absolute top-3 left-3 flex flex-col gap-1 px-3 py-2 text-xs')}>
      {steps.map((step) => (
        <div key={step.label} className="flex items-center gap-2">
          {step.done ? (
            <Check className="size-3.5 text-emerald-400" />
          ) : (
            <LoaderCircle className="size-3.5 animate-spin text-white/60" />
          )}
          <span className={step.done ? '' : 'text-white/70'}>{step.label}</span>
          {step.time && (
            <span className="ml-auto pl-3 text-white/50 tabular-nums">{step.time}</span>
          )}
        </div>
      ))}
      {tiles > 0 && <div className="text-white/50">{tiles} detail tiles</div>}
    </div>
  )
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  current,
  onChange,
}: {
  label: string
  value: string
  min: number
  max: number
  step: number
  current: number
  onChange: (value: number) => void
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex justify-between">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums">{value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={current}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-foreground"
      />
    </label>
  )
}

function Inspector({
  picked,
  shape,
  relief,
  climate,
  onClose,
}: {
  picked: Picked
  shape: Shape
  relief: Relief | null
  climate: Climate | null
  onClose: () => void
}) {
  const rows = useMemo(() => {
    const { u, v } = picked
    const latitude = 90 - v * 180
    const longitude = u * 360 - 180
    const ground = heightsOf(shape, relief)
    const gx = Math.min(Math.floor(u * ground.width), ground.width - 1)
    const gy = Math.min(Math.floor(v * ground.height), ground.height - 1)
    const metres = ground.heights[gy * ground.width + gx] ?? 0
    const found: [string, string][] = [
      [
        'Position',
        `${Math.abs(latitude).toFixed(1)}° ${latitude >= 0 ? 'N' : 'S'}, ${Math.abs(longitude).toFixed(1)}° ${longitude >= 0 ? 'E' : 'W'}`,
      ],
      [metres < 0 ? 'Depth' : 'Height', `${Math.abs(metres).toFixed(0)} m`],
    ]
    if (!climate) {
      found.push(['Climate', 'still settling…'])
      return found
    }
    const cx = Math.min(Math.floor(u * climate.width), climate.width - 1)
    const cy = Math.min(Math.floor(v * climate.height), climate.height - 1)
    const at = (field: Float32Array) => field[cy * climate.width + cx] ?? 0
    const smooth = (field: Float32Array) => sampler(climate.width, climate.height, field)(u, v)
    const land = metres >= 0
    found.push(
      ['Cover', COVER[Math.min(at(climate.layers.cover), 5)] ?? '—'],
      ['Mean temperature', `${smooth(climate.layers.temperature).toFixed(1)} °C`],
      ['Warmest month', `${smooth(climate.layers.summer).toFixed(1)} °C`],
    )
    if (land) {
      found.push(
        ['Rain', `${at(climate.layers.rain).toFixed(0)} mm/yr`],
        ['Evaporation', `${at(climate.layers.evaporation).toFixed(0)} mm/yr`],
        ['River inflow', `${at(climate.layers.river).toFixed(0)} mm/yr`],
      )
    } else {
      found.push(
        ['Salinity', `${climate.seaSalinity.toFixed(1)} g/kg`],
        ['Gyre transport', `${at(climate.layers.gyre).toFixed(1)} Sv`],
      )
    }
    found.push(['Ipse', smooth(climate.layers.ipse).toFixed(2)])
    return found
  }, [picked, shape, relief, climate])

  return (
    <div className={cn(glass, 'absolute top-3 right-3 w-72 max-w-[calc(100%-1.5rem)] p-3 text-sm')}>
      <div className="mb-2 flex items-center justify-between">
        <span className="font-medium">Here</span>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
        >
          Close
        </button>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-white/60">{label}</dt>
            <dd className="text-right whitespace-nowrap tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
