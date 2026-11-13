import type { Reply } from './worker'

export type World = Extract<Reply, { kind: 'world' }>
export type Relief = Extract<Reply, { kind: 'relief' }>
export type View = 'surface' | 'temperature' | 'rain' | 'ipse'

type Rgb = [number, number, number]
type Ramp = [number, Rgb][]

const ramps: Record<Exclude<View, 'surface'>, Ramp> = {
  temperature: [
    [-40, [49, 54, 149]],
    [-15, [116, 173, 209]],
    [0, [224, 243, 248]],
    [12, [254, 224, 144]],
    [22, [244, 109, 67]],
    [32, [165, 0, 38]],
  ],
  rain: [
    [0, [140, 81, 10]],
    [250, [223, 194, 125]],
    [750, [199, 234, 229]],
    [1500, [53, 151, 143]],
    [3000, [1, 70, 54]],
  ],
  ipse: [
    [0, [20, 12, 40]],
    [5, [94, 60, 153]],
    [15, [178, 171, 210]],
    [40, [253, 184, 99]],
  ],
}

const SEA_ICE: Rgb = [214, 228, 238]

function coverColor(code: number): Rgb {
  switch (code) {
    case 1:
      return SEA_ICE
    case 2:
      return [240, 244, 248]
    case 3:
      return [196, 176, 132]
    case 4:
      return [128, 156, 84]
    default:
      return [58, 96, 52]
  }
}

function mix(low: Rgb, high: Rgb, t: number): Rgb {
  return [
    low[0] + t * (high[0] - low[0]),
    low[1] + t * (high[1] - low[1]),
    low[2] + t * (high[2] - low[2]),
  ]
}

function ramp(stops: Ramp, value: number): Rgb {
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

function sampler(world: World, values: Float32Array) {
  return (u: number, v: number) => {
    const x = u * world.width - 0.5
    const y = Math.min(Math.max(v * world.height - 0.5, 0), world.height - 1)
    const x0 = Math.floor(x)
    const y0 = Math.floor(y)
    const tx = x - x0
    const ty = y - y0
    const y1 = Math.min(y0 + 1, world.height - 1)
    const at = (cx: number, cy: number) =>
      values[cy * world.width + (((cx % world.width) + world.width) % world.width)] ?? 0
    const top = at(x0, y0) * (1 - tx) + at(x0 + 1, y0) * tx
    const bottom = at(x0, y1) * (1 - tx) + at(x0 + 1, y1) * tx
    return top * (1 - ty) + bottom * ty
  }
}

function nearest(world: World, values: Float32Array, u: number, v: number) {
  const x = Math.min(Math.floor(u * world.width), world.width - 1)
  const y = Math.min(Math.floor(v * world.height), world.height - 1)
  return values[y * world.width + x] ?? 0
}

export function heightsFrom(world: World): Relief {
  return {
    kind: 'relief',
    width: world.width,
    height: world.height,
    seconds: 0,
    heights: world.layers.elevation,
  }
}

export function paint(world: World, relief: Relief, view: View): ImageData {
  const { width, height, heights } = relief
  const image = new ImageData(width, height)
  const smooth = view === 'surface' ? undefined : sampler(world, world.layers[view])
  const metresPerCell = 40_075_000 / width
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      const h = heights[i] ?? 0
      const east = heights[y * width + ((x + 1) % width)] ?? h
      const south = heights[Math.min(y + 1, height - 1) * width + x] ?? h
      const shade = Math.min(
        Math.max(1 + (((h - east) * 1.2 + (h - south) * 0.8) / metresPerCell) * 25, 0.55),
        1.35,
      )
      const u = (x + 0.5) / width
      const v = (y + 0.5) / height
      let rgb: Rgb
      if (smooth) {
        rgb = ramp(ramps[view as keyof typeof ramps], smooth(u, v))
      } else if (h < 0) {
        const ice = nearest(world, world.layers.cover, u, v) === 1
        rgb = ice
          ? SEA_ICE
          : ramp(
              [
                [-6000, [10, 30, 70]],
                [-200, [30, 80, 140]],
                [0, [70, 130, 180]],
              ],
              h,
            )
      } else {
        const code = nearest(world, world.layers.cover, u, v)
        rgb = coverColor(code)
      }
      const lit = h < 0 && !smooth ? 1 : shade
      const p = i * 4
      image.data[p] = Math.min(rgb[0] * lit, 255)
      image.data[p + 1] = Math.min(rgb[1] * lit, 255)
      image.data[p + 2] = Math.min(rgb[2] * lit, 255)
      image.data[p + 3] = 255
    }
  }
  return image
}
