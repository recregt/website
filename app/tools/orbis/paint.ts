import type { Climate, Relief, Shape } from './protocol'

export type View = 'surface' | 'temperature' | 'rain' | 'ipse'

type Rgb = [number, number, number]
type Ramp = [number, Rgb][]

export const ramps: Record<Exclude<View, 'surface'>, { stops: Ramp; unit: string }> = {
  temperature: {
    unit: '°C',
    stops: [
      [-40, [49, 54, 149]],
      [-15, [116, 173, 209]],
      [0, [224, 243, 248]],
      [12, [254, 224, 144]],
      [22, [244, 109, 67]],
      [32, [165, 0, 38]],
    ],
  },
  rain: {
    unit: 'mm/yr',
    stops: [
      [0, [140, 81, 10]],
      [250, [223, 194, 125]],
      [750, [199, 234, 229]],
      [1500, [53, 151, 143]],
      [3000, [1, 70, 54]],
    ],
  },
  ipse: {
    unit: '',
    stops: [
      [0, [20, 12, 40]],
      [5, [94, 60, 153]],
      [15, [178, 171, 210]],
      [40, [253, 184, 99]],
    ],
  },
}

const SEA_DEPTHS: Ramp = [
  [-7000, [6, 18, 48]],
  [-3000, [12, 42, 92]],
  [-400, [24, 86, 140]],
  [0, [58, 132, 170]],
]
const SEA_ICE: Rgb = [218, 230, 240]
const LAND_ICE: Rgb = [242, 246, 250]
const BARREN: Rgb = [176, 152, 112]
const GRASS: Rgb = [118, 146, 78]
const FOREST: Rgb = [46, 84, 46]
const RIVER: Rgb = [40, 96, 150]
const BARE_HIGHLAND: Ramp = [
  [0, [120, 128, 92]],
  [1500, [146, 124, 92]],
  [4000, [170, 160, 150]],
  [7000, [235, 235, 235]],
]

/** Discharge, in m³ per year, below which a river is not drawn. */
const SMALLEST_RIVER = 2.5e10

function mix(low: Rgb, high: Rgb, t: number): Rgb {
  return [
    low[0] + t * (high[0] - low[0]),
    low[1] + t * (high[1] - low[1]),
    low[2] + t * (high[2] - low[2]),
  ]
}

export function ramp(stops: Ramp, value: number): Rgb {
  let previous: [number, Rgb] | undefined
  for (const stop of stops) {
    const [at, color] = stop
    if (value <= at) {
      if (!previous) return color
      const [from, low] = previous
      return mix(low, color, (value - from) / (at - from))
    }
    previous = stop
  }
  return previous?.[1] ?? [0, 0, 0]
}

function coverColor(code: number): Rgb {
  switch (code) {
    case 2:
      return LAND_ICE
    case 3:
      return BARREN
    case 4:
      return GRASS
    default:
      return FOREST
  }
}

/** Samples a cell field between cell centres; the planet wraps east–west. */
export function sampler(width: number, height: number, values: Float32Array) {
  return (u: number, v: number) => {
    const x = u * width - 0.5
    const y = Math.min(Math.max(v * height - 0.5, 0), height - 1)
    const x0 = Math.floor(x)
    const y0 = Math.floor(y)
    const tx = x - x0
    const ty = y - y0
    const y1 = Math.min(y0 + 1, height - 1)
    const at = (cx: number, cy: number) =>
      values[cy * width + (((cx % width) + width) % width)] ?? 0
    const top = at(x0, y0) * (1 - tx) + at(x0 + 1, y0) * tx
    const bottom = at(x0, y1) * (1 - tx) + at(x0 + 1, y1) * tx
    return top * (1 - ty) + bottom * ty
  }
}

/** Blends the colours of the four surrounding cells, so cover changes smoothly. */
function coverSampler(width: number, height: number, cover: Float32Array) {
  return (u: number, v: number): { color: Rgb; seaIce: number; landIce: number } => {
    const x = u * width - 0.5
    const y = Math.min(Math.max(v * height - 0.5, 0), height - 1)
    const x0 = Math.floor(x)
    const y0 = Math.floor(y)
    const tx = x - x0
    const ty = y - y0
    const y1 = Math.min(y0 + 1, height - 1)
    const color: Rgb = [0, 0, 0]
    let seaIce = 0
    let landIce = 0
    let landShare = 0
    for (const [cx, cy, share] of [
      [x0, y0, (1 - tx) * (1 - ty)],
      [x0 + 1, y0, tx * (1 - ty)],
      [x0, y1, (1 - tx) * ty],
      [x0 + 1, y1, tx * ty],
    ] as const) {
      const code = cover[cy * width + (((cx % width) + width) % width)] ?? 0
      if (code === 1) seaIce += share
      if (code === 2) landIce += share
      if (code < 2) continue
      const c = coverColor(code)
      color[0] += c[0] * share
      color[1] += c[1] * share
      color[2] += c[2] * share
      landShare += share
    }
    const land: Rgb =
      landShare > 0 ? [color[0] / landShare, color[1] / landShare, color[2] / landShare] : GRASS
    return { color: land, seaIce, landIce: landShare > 0 ? landIce / landShare : 0 }
  }
}

export type Surface = { color: ImageData; roughness: ImageData }

export type Heights = { width: number; height: number; heights: Float32Array }

export function heightsOf(shape: Shape, relief: Relief | null): Heights {
  return relief ?? { width: shape.width, height: shape.height, heights: shape.elevation }
}

/**
 * Paints the planet's surface at the resolution of `ground`: cover, sea depth, ice and
 * rivers from the simulation, shaded by the relief, with an optional data overlay.
 */
export function paint(
  ground: Heights,
  climate: Climate | null,
  drainage: Float32Array | null,
  view: View,
): Surface {
  const { width, height, heights } = ground
  const color = new ImageData(width, height)
  const roughness = new ImageData(width, height)
  const cover = climate && coverSampler(climate.width, climate.height, climate.layers.cover)
  const rain = climate && sampler(climate.width, climate.height, climate.layers.rain)
  const overlay =
    climate && view !== 'surface'
      ? sampler(climate.width, climate.height, climate.layers[view])
      : null
  const stops = view === 'surface' ? null : ramps[view].stops
  const metresPerCell = 40_075_000 / width
  for (let y = 0; y < height; y++) {
    const v = (y + 0.5) / height
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      const u = (x + 0.5) / width
      const h = heights[i] ?? 0
      const west = heights[y * width + ((x + width - 1) % width)] ?? h
      const north = heights[Math.max(y - 1, 0) * width + x] ?? h
      const shade = Math.min(
        Math.max(1 + (((west - h) * 0.7 + (north - h) * 0.7) / metresPerCell) * 18, 0.6),
        1.3,
      )
      let rgb: Rgb
      let rough = 0.9
      if (h < 0) {
        rgb = ramp(SEA_DEPTHS, h)
        rough = 0.32
        if (cover) {
          const { seaIce } = cover(u, v)
          if (seaIce > 0) {
            rgb = mix(rgb, SEA_ICE, Math.min(seaIce * 1.4, 1))
            rough = 0.32 + 0.4 * seaIce
          }
        }
      } else {
        const here = cover?.(u, v)
        rgb = here ? here.color : ramp(BARE_HIGHLAND, h)
        if (drainage && rain && here && here.landIce < 0.5) {
          const discharge = (drainage[i] ?? 0) * (rain(u, v) / 1000) * (1 - here.landIce)
          if (discharge > SMALLEST_RIVER) {
            const strength = Math.min(Math.log10(discharge / SMALLEST_RIVER) / 1.5 + 0.35, 0.9)
            rgb = mix(rgb, RIVER, strength)
            rough = 0.5
          }
        }
        rgb = [rgb[0] * shade, rgb[1] * shade, rgb[2] * shade]
      }
      if (overlay && stops && !(view === 'rain' && h < 0)) {
        const lit = h < 0 ? 1 : shade
        const value = ramp(stops, overlay(u, v))
        rgb = mix(rgb, [value[0] * lit, value[1] * lit, value[2] * lit], 0.82)
      }
      const p = i * 4
      color.data[p] = Math.min(rgb[0], 255)
      color.data[p + 1] = Math.min(rgb[1], 255)
      color.data[p + 2] = Math.min(rgb[2], 255)
      color.data[p + 3] = 255
      const r = Math.round(rough * 255)
      roughness.data[p] = r
      roughness.data[p + 1] = r
      roughness.data[p + 2] = r
      roughness.data[p + 3] = 255
    }
  }
  return { color, roughness }
}

/** Paints the centre of one region tile from its own heights, coloured by the climate around it. */
export function paintRegion(
  heights: Float32Array,
  cells: number,
  from: number,
  to: number,
  uv: (cx: number, cy: number) => [number, number],
  climate: Climate | null,
  cellMetres: number,
): ImageData {
  const size = to - from
  const image = new ImageData(size, size)
  const cover = climate && coverSampler(climate.width, climate.height, climate.layers.cover)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cx = from + x
      const cy = from + y
      const h = heights[cy * cells + cx] ?? 0
      const west = heights[cy * cells + cx - 1] ?? h
      const north = heights[(cy - 1) * cells + cx] ?? h
      const shade = Math.min(
        Math.max(1 + (((west - h) * 0.7 + (north - h) * 0.7) / cellMetres) * 0.7, 0.7),
        1.25,
      )
      const [u, v] = uv(cx, cy)
      let rgb: Rgb
      if (h < 0) {
        rgb = ramp(SEA_DEPTHS, h)
        const seaIce = cover ? cover(u, v).seaIce : 0
        if (seaIce > 0) rgb = mix(rgb, SEA_ICE, Math.min(seaIce * 1.4, 1))
      } else {
        const base = cover ? cover(u, v).color : ramp(BARE_HIGHLAND, h)
        rgb = [base[0] * shade, base[1] * shade, base[2] * shade]
      }
      const p = (y * size + x) * 4
      image.data[p] = Math.min(rgb[0], 255)
      image.data[p + 1] = Math.min(rgb[1], 255)
      image.data[p + 2] = Math.min(rgb[2], 255)
      image.data[p + 3] = 255
    }
  }
  return image
}
