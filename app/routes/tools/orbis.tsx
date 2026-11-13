import { useEffect, useMemo, useRef, useState } from 'react'

import { SiteHero } from '~/components/cover-hero'
import { Page } from '~/components/page'
import { PageHeader } from '~/components/page-header'
import { cn } from '~/lib/utils'

import { currentField, type FlowKind, windField } from '../../tools/orbis/flow'
import type { Globe, Look } from '../../tools/orbis/globe.client'
import { heightsOf, paint, paintRegion, ramps, sampler, type View } from '../../tools/orbis/paint'
import type {
  Climate,
  Region,
  RegionRequest,
  Relief,
  Request,
  Shape,
  ShapeReply,
} from '../../tools/orbis/protocol'
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
  { value: 'none', label: 'No flow' },
  { value: 'winds', label: 'Prevailing winds' },
  { value: 'currents', label: 'Currents' },
]

const sizes = [
  { value: '32x16', label: '32 × 16' },
  { value: '64x32', label: '64 × 32' },
  { value: '128x64', label: '128 × 64' },
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

  useEffect(() => {
    if (!ready || !shape) return
    const ground = heightsOf(shape, relief)
    globe.current?.show(paint(ground, climate, relief?.drainage ?? null, view), ground)
  }, [ready, shape, relief, climate, view])

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

    const shaper = new Worker(new URL('../../tools/orbis/shape.worker.ts', import.meta.url), {
      type: 'module',
    })
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

    const climatist = new Worker(new URL('../../tools/orbis/climate.worker.ts', import.meta.url), {
      type: 'module',
    })
    climatist.onmessage = ({ data }: MessageEvent<Climate>) => {
      setClimate(data)
      setClimateTiming({ since: started, seconds: data.seconds })
    }
    climatist.postMessage(request)
    climateWorker.current = climatist
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: generate once the globe is ready
  useEffect(() => {
    if (ready) generate()
  }, [ready])

  const legend = view === 'surface' ? null : ramps[view]
  const month = MONTHS[Math.min(Math.floor((day / 365) * 12), 11)]

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
          <div className="ml-auto flex flex-col items-end text-muted-foreground tabular-nums">
            <span>
              Ground {shape ? 'ready' : '…'} · relief {seconds(reliefTiming, now)}
              {relief ? '' : ' …'} · climate {seconds(climateTiming, now)}
              {climate ? (climate.settled ? '' : ' (not settled)') : ' …'}
            </span>
            {regionCount > 0 && <span>{regionCount} detail tiles</span>}
          </div>
        </form>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <Choice options={views} value={view} onChange={setView} />
          <Choice options={flows} value={flow} onChange={setFlow} disabled={!climate} />
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <label className="flex items-center gap-2">
            <span className="w-28">
              Day {day + 1} · {month}
            </span>
            <input
              type="range"
              min={0}
              max={364}
              value={day}
              onChange={(event) => setDay(Number(event.target.value))}
              className="w-48"
            />
          </label>
          <label className="flex items-center gap-2">
            <span className="w-28">
              Sun over {((((sunLongitude ?? 0) * 360 + 180) % 360) - 180).toFixed(0)}°
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.002}
              value={sunLongitude ?? 0}
              onChange={(event) => setSunLongitude(Number(event.target.value))}
              className="w-48"
            />
          </label>
          {legend && (
            <span className="flex items-center gap-2">
              <span
                className="h-2 w-40 rounded-full"
                style={{
                  background: `linear-gradient(to right, ${legend.stops
                    .map(([, [r, g, b]]) => `rgb(${r} ${g} ${b})`)
                    .join(', ')})`,
                }}
              />
              {legend.stops[0]?.[0]} … {legend.stops[legend.stops.length - 1]?.[0]} {legend.unit}
              {view === 'rain' && ' · rain is kept per cell over land only'}
            </span>
          )}
        </div>
        <div className="relative">
          <canvas
            ref={canvas}
            onClick={(event) => {
              const hit = globe.current?.pick(event.clientX, event.clientY)
              setPicked(hit ?? null)
            }}
            className="aspect-square w-full cursor-grab touch-none rounded-lg bg-black active:cursor-grabbing sm:aspect-[16/10]"
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
        </div>
        <p className="text-sm text-muted-foreground">
          Drag to turn the planet, scroll to zoom. Winds show the prevailing direction of the
          circulation belts; currents follow the wind-driven gyres. Zoom in close and Orbis carves
          detailed terrain for the area you look at. Click anywhere to read what the simulation
          computed there.
        </p>
      </section>
    </Page>
  )
}

function Choice<T extends string>({
  options,
  value,
  onChange,
  disabled = false,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  disabled?: boolean
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={disabled && option.value !== value}
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-md px-3 py-1.5 transition-colors disabled:opacity-40',
            value === option.value
              ? 'bg-foreground text-background'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
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
    <div className="absolute top-3 right-3 w-64 rounded-lg border border-border bg-background/90 p-3 text-sm backdrop-blur">
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
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="text-right tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
