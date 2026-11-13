import type { Climate, Shape } from './protocol'

export type Field = (u: number, v: number) => [number, number] | null

export type FlowKind = 'none' | 'winds' | 'currents'

const TRAIL = 18

export function windField(climate: Climate): Field {
  const rows = climate.height
  return (_u, v) => {
    const row = Math.min(Math.max(v * rows - 0.5, 0), rows - 1)
    const r0 = Math.floor(row)
    const r1 = Math.min(r0 + 1, rows - 1)
    const t = row - r0
    const at = (r: number, k: number) => climate.wind[r * 2 + k] ?? 0
    return [at(r0, 0) * (1 - t) + at(r1, 0) * t, at(r0, 1) * (1 - t) + at(r1, 1) * t]
  }
}

export function currentField(climate: Climate, shape: Shape): Field {
  const { width, height } = climate
  const psi = climate.layers.gyre
  const sea = (x: number, y: number) =>
    (shape.elevation[y * width + (((x % width) + width) % width)] ?? 0) < 0
  const at = (x: number, y: number) => psi[y * width + (((x % width) + width) % width)] ?? 0
  const east = new Float32Array(width * height)
  const north = new Float32Array(width * height)
  let strongest = 0
  for (let y = 1; y < height - 1; y++) {
    const breadth = Math.max(Math.sin(((y + 0.5) / height) * Math.PI), 0.1)
    for (let x = 0; x < width; x++) {
      if (!(sea(x, y) && sea(x + 1, y) && sea(x - 1, y) && sea(x, y - 1) && sea(x, y + 1))) {
        continue
      }
      const i = y * width + x
      east[i] = (at(x, y + 1) - at(x, y - 1)) / 2
      north[i] = (at(x + 1, y) - at(x - 1, y)) / 2 / breadth
      strongest = Math.max(strongest, Math.hypot(east[i] ?? 0, north[i] ?? 0))
    }
  }
  const scale = strongest > 0 ? 1 / strongest : 0
  return (u, v) => {
    const x = Math.min(Math.floor(u * width), width - 1)
    const y = Math.min(Math.floor(v * height), height - 1)
    if (!sea(x, y)) return null
    const i = y * width + x
    const e = (east[i] ?? 0) * scale
    const n = (north[i] ?? 0) * scale
    const boost = 2.5 / Math.sqrt(Math.max(Math.hypot(e, n), 1e-3))
    return [e * boost, n * boost]
  }
}

export class Particles {
  readonly positions: Float32Array
  readonly colors: Float32Array
  private readonly u: Float32Array
  private readonly v: Float32Array
  private readonly age: Float32Array
  private readonly trail: Float32Array
  private field: Field | null = null

  constructor(
    readonly count: number,
    private readonly radius: number,
    private readonly tint: [number, number, number],
  ) {
    this.positions = new Float32Array(count * (TRAIL - 1) * 2 * 3)
    this.colors = new Float32Array(count * (TRAIL - 1) * 2 * 3)
    this.u = new Float32Array(count)
    this.v = new Float32Array(count)
    this.age = new Float32Array(count)
    this.trail = new Float32Array(count * TRAIL * 3)
  }

  follow(field: Field | null) {
    this.field = field
    for (let p = 0; p < this.count; p++) this.spawn(p, Math.random() * 120)
  }

  private spawn(p: number, age = 0) {
    for (let tries = 0; tries < 20; tries++) {
      const u = Math.random()
      const v = Math.acos(1 - 2 * Math.random()) / Math.PI
      if (v < 0.03 || v > 0.97) continue
      if (this.field && !this.field(u, v)) continue
      this.u[p] = u
      this.v[p] = v
      break
    }
    this.age[p] = age
    const [x, y, z] = this.point(this.u[p] ?? 0, this.v[p] ?? 0)
    for (let k = 0; k < TRAIL; k++) this.trail.set([x, y, z], (p * TRAIL + k) * 3)
  }

  private point(u: number, v: number): [number, number, number] {
    const lon = u * Math.PI * 2
    const lat = Math.PI / 2 - v * Math.PI
    const r = this.radius
    return [
      -Math.cos(lon) * Math.cos(lat) * r,
      Math.sin(lat) * r,
      Math.sin(lon) * Math.cos(lat) * r,
    ]
  }

  step(seconds: number) {
    const field = this.field
    if (!field) return
    const speed = seconds * 0.05
    for (let p = 0; p < this.count; p++) {
      let u = this.u[p] ?? 0
      let v = this.v[p] ?? 0
      const flow = field(u, v)
      const age = (this.age[p] ?? 0) + seconds * 60
      if (!flow || age > 240 || v < 0.03 || v > 0.97) {
        this.spawn(p)
        continue
      }
      const breadth = Math.max(Math.sin(v * Math.PI), 0.05)
      u = (u + (flow[0] * speed) / (Math.PI * 2 * breadth) + 1) % 1
      v -= (flow[1] * speed) / Math.PI
      this.u[p] = u
      this.v[p] = v
      this.age[p] = age
      const base = p * TRAIL * 3
      this.trail.copyWithin(base + 3, base, base + (TRAIL - 1) * 3)
      this.trail.set(this.point(u, v), base)
    }
    this.draw()
  }

  private draw() {
    const [r, g, b] = this.tint
    let s = 0
    for (let p = 0; p < this.count; p++) {
      const fade = Math.min((this.age[p] ?? 0) / 30, 1, (240 - (this.age[p] ?? 0)) / 30)
      for (let k = 0; k < TRAIL - 1; k++) {
        const head = 1 - k / (TRAIL - 1)
        const tail = 1 - (k + 1) / (TRAIL - 1)
        for (const [at, bright] of [
          [k, head],
          [k + 1, tail],
        ] as const) {
          const from = (p * TRAIL + at) * 3
          this.positions[s] = this.trail[from] ?? 0
          this.positions[s + 1] = this.trail[from + 1] ?? 0
          this.positions[s + 2] = this.trail[from + 2] ?? 0
          const light = bright * fade
          this.colors[s] = r * light
          this.colors[s + 1] = g * light
          this.colors[s + 2] = b * light
          s += 3
        }
      }
    }
  }
}
