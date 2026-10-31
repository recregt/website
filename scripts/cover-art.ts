export type ArtOptions = {
  seed: string
  width: number
  height: number
  density: number
  style?: string
}
export type ArtResult = { style: string; accent: string }

export function draw({
  seed,
  width: W,
  height: H,
  density,
  style: requested,
}: ArtOptions): ArtResult {
  type RGB = [number, number, number]
  type Field = (x: number, y: number) => number

  const canvas = document.createElement('canvas')
  canvas.width = W * density
  canvas.height = H * density
  canvas.style.width = `${W}px`
  canvas.style.height = `${H}px`
  document.body.appendChild(canvas)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('canvas 2d context unavailable')
  const ctx = context
  ctx.scale(density, density)

  const background: RGB = [14, 15, 17]
  const foreground: RGB = [244, 244, 245]
  const accents: Record<string, RGB> = {
    emerald: [16, 185, 129],
    blue: [96, 165, 250],
    cyan: [34, 211, 238],
  }

  function hash(text: string): number {
    let h = 2166136261
    for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
    return h >>> 0
  }

  function random(start: number): () => number {
    let a = start
    return () => {
      a = (a + 0x6d2b79f5) | 0
      let t = Math.imul(a ^ (a >>> 15), 1 | a)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }

  const rand = random(hash(seed))
  const between = (min: number, max: number) => min + rand() * (max - min)
  const pick = <T>(list: T[]): T => list[Math.floor(rand() * list.length)] as T

  function perlin(start: number): Field {
    const r = random(start)
    const perm = Array.from({ length: 256 }, (_, i) => i)
    for (let i = perm.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1))
      ;[perm[i], perm[j]] = [perm[j] as number, perm[i] as number]
    }
    const p = [...perm, ...perm]
    const at = (i: number) => p[i] as number
    const grad = (h: number, x: number, y: number) => {
      const g = h & 7
      const u = g < 4 ? x : y
      const v = g < 4 ? y : x
      return (g & 1 ? -u : u) + (g & 2 ? -2 * v : 2 * v)
    }
    const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)
    const lerp = (a: number, b: number, t: number) => a + t * (b - a)
    return (x, y) => {
      const X = Math.floor(x) & 255
      const Y = Math.floor(y) & 255
      const xf = x - Math.floor(x)
      const yf = y - Math.floor(y)
      const u = fade(xf)
      const v = fade(yf)
      return (
        lerp(
          lerp(grad(at(at(X) + Y), xf, yf), grad(at(at(X + 1) + Y), xf - 1, yf), u),
          lerp(grad(at(at(X) + Y + 1), xf, yf - 1), grad(at(at(X + 1) + Y + 1), xf - 1, yf - 1), u),
          v,
        ) / 2
      )
    }
  }

  const noise = perlin(hash(seed) ^ 0x9e3779b9)
  const octaves = Math.floor(between(2, 5))
  const fbm: Field = (x, y) => {
    let sum = 0
    let amp = 1
    let freq = 1
    let norm = 0
    for (let i = 0; i < octaves; i++) {
      sum += amp * noise(x * freq, y * freq)
      norm += amp
      amp /= 2
      freq *= 2
    }
    return sum / norm
  }

  const accentName = pick(Object.keys(accents))
  const accent = accents[accentName] as RGB
  const secondName =
    rand() < 0.4 ? pick(Object.keys(accents).filter((name) => name !== accentName)) : accentName
  const second = accents[secondName] as RGB
  const rgba = ([r, g, b]: RGB, a: number) => `rgba(${r},${g},${b},${a})`
  const tint = (a: number) => rgba(rand() < 0.5 ? accent : second, a)

  type Trace = {
    lines: number
    steps: number
    step: number
    accentShare: number
    faint: number
    width: number
  }

  function trace(field: Field, { lines, steps, step, accentShare, faint, width }: Trace) {
    ctx.lineCap = 'round'
    for (let i = 0; i < lines; i++) {
      let x = rand() * W
      let y = rand() * H
      const lit = rand() < accentShare
      ctx.beginPath()
      ctx.moveTo(x, y)
      for (let s = 0; s < steps; s++) {
        const angle = field(x, y)
        x += Math.cos(angle) * step
        y += Math.sin(angle) * step
        if (x < 0 || x > W || y < 0 || y > H) break
        ctx.lineTo(x, y)
      }
      ctx.strokeStyle = lit ? tint(between(0.35, 0.75)) : rgba(foreground, faint)
      ctx.lineWidth = lit ? width * 1.4 : width
      ctx.stroke()
    }
  }

  function flow() {
    const scale = between(0.0008, 0.003)
    const turns = between(2, 6)
    trace((x, y) => fbm(x * scale, y * scale) * Math.PI * turns, {
      lines: Math.floor(between(1500, 3500)),
      steps: Math.floor(between(120, 320)),
      step: between(2, 4),
      accentShare: between(0.06, 0.2),
      faint: between(0.04, 0.09),
      width: 1,
    })
  }

  function streams() {
    const heading = between(0, Math.PI * 2)
    const scale = between(0.001, 0.004)
    const turbulence = between(0.6, 1.6)
    trace((x, y) => heading + fbm(x * scale, y * scale) * turbulence * Math.PI, {
      lines: Math.floor(between(2000, 4000)),
      steps: Math.floor(between(200, 400)),
      step: between(2, 4),
      accentShare: between(0.04, 0.12),
      faint: between(0.05, 0.1),
      width: between(0.8, 1.4),
    })
  }

  function orbits() {
    const centers = Array.from({ length: Math.floor(between(2, 5)) }, () => ({
      x: between(0.15, 0.85) * W,
      y: between(0.15, 0.85) * H,
      spin: rand() < 0.5 ? -1 : 1,
      pull: between(0.15, 0.45),
    }))
    const scale = between(0.001, 0.003)
    trace(
      (x, y) => {
        let vx = 0
        let vy = 0
        for (const c of centers) {
          const d = Math.hypot(x - c.x, y - c.y) + 1
          const tangent = Math.atan2(y - c.y, x - c.x) + (c.spin * Math.PI) / 2 - c.pull * c.spin
          vx += Math.cos(tangent) / d
          vy += Math.sin(tangent) / d
        }
        return Math.atan2(vy, vx) + fbm(x * scale, y * scale) * 0.8
      },
      {
        lines: Math.floor(between(1500, 3000)),
        steps: Math.floor(between(200, 400)),
        step: between(2, 3.5),
        accentShare: between(0.08, 0.2),
        faint: between(0.05, 0.1),
        width: 1,
      },
    )
  }

  function contours() {
    const scale = between(0.0012, 0.0035)
    const levels = Math.floor(between(14, 30))
    const cell = 6
    const cols = Math.ceil(W / cell) + 1
    const rows = Math.ceil(H / cell) + 1
    const values = new Float32Array(cols * rows)
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) values[j * cols + i] = fbm(i * cell * scale, j * cell * scale)
    }
    const value = (i: number, j: number) => values[j * cols + i] as number
    let min = Number.POSITIVE_INFINITY
    let max = Number.NEGATIVE_INFINITY
    for (const v of values) {
      min = Math.min(min, v)
      max = Math.max(max, v)
    }
    const lit = new Set(
      Array.from({ length: Math.floor(between(1, 4)) }, () => Math.floor(rand() * levels)),
    )
    ctx.lineCap = 'round'
    for (let l = 1; l < levels; l++) {
      const t = min + ((max - min) * l) / levels
      ctx.beginPath()
      for (let j = 0; j < rows - 1; j++) {
        for (let i = 0; i < cols - 1; i++) {
          const x = i * cell
          const y = j * cell
          const corners: [number, number, number][] = [
            [value(i, j), x, y],
            [value(i + 1, j), x + cell, y],
            [value(i + 1, j + 1), x + cell, y + cell],
            [value(i, j + 1), x, y + cell],
          ]
          const crossings: [number, number][] = []
          corners.forEach(([v1, x1, y1], k) => {
            const [v2, x2, y2] = corners[(k + 1) % corners.length] as [number, number, number]
            if (v1 < t !== v2 < t) {
              const f = (t - v1) / (v2 - v1)
              crossings.push([x1 + (x2 - x1) * f, y1 + (y2 - y1) * f])
            }
          })
          for (let k = 0; k + 1 < crossings.length; k += 2) {
            const [ax, ay] = crossings[k] as [number, number]
            const [bx, by] = crossings[k + 1] as [number, number]
            ctx.moveTo(ax, ay)
            ctx.lineTo(bx, by)
          }
        }
      }
      ctx.strokeStyle = lit.has(l) ? tint(0.85) : rgba(foreground, 0.16 + (l / levels) * 0.24)
      ctx.lineWidth = lit.has(l) ? 2 : 1.2
      ctx.stroke()
    }
  }

  function polyline(points: [number, number][], stroke: string, width: number) {
    ctx.beginPath()
    for (const [i, [x, y]] of points.entries()) {
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.strokeStyle = stroke
    ctx.lineWidth = width
    ctx.stroke()
  }

  function waves() {
    const count = Math.floor(between(40, 90))
    const amplitude = between(0.08, 0.2) * H
    const scale = between(0.002, 0.006)
    const drift = between(0.08, 0.25)
    const accentShare = between(0.05, 0.15)
    ctx.lineCap = 'round'
    for (let i = 0; i <= count; i++) {
      const base = (i / count) * H
      const points: [number, number][] = []
      for (let x = 0; x <= W; x += 4) {
        points.push([x, base + fbm(x * scale, i * drift) * amplitude])
      }
      const lit = rand() < accentShare
      polyline(points, lit ? tint(0.85) : rgba(foreground, between(0.14, 0.3)), lit ? 2 : 1.2)
    }
  }

  function grid() {
    const cell = between(28, 64)
    const scale = between(0.001, 0.003)
    const strength = between(100, 260)
    const warp = (x: number, y: number): [number, number] => [
      x + fbm(x * scale, y * scale) * strength,
      y + fbm(x * scale + 31.7, y * scale + 17.3) * strength,
    ]
    const accentShare = between(0.04, 0.12)
    const line = (points: [number, number][]) => {
      const lit = rand() < accentShare
      polyline(points, lit ? tint(0.8) : rgba(foreground, 0.18), lit ? 1.8 : 1)
    }
    for (let y = -cell; y <= H + cell; y += cell) {
      const points: [number, number][] = []
      for (let x = -cell; x <= W + cell; x += 6) points.push(warp(x, y))
      line(points)
    }
    for (let x = -cell; x <= W + cell; x += cell) {
      const points: [number, number][] = []
      for (let y = -cell; y <= H + cell; y += 6) points.push(warp(x, y))
      line(points)
    }
  }

  function rings() {
    const centers = Array.from({ length: rand() < 0.5 ? 1 : 2 }, () => ({
      x: between(0.2, 0.8) * W,
      y: between(0.2, 0.8) * H,
    }))
    const count = Math.floor(between(30, 70))
    const gap = between(14, 30)
    const distortion = between(0.25, 0.7)
    const frequency = between(1, 3)
    const accentShare = between(0.06, 0.16)
    for (const c of centers) {
      for (let i = 1; i <= count; i++) {
        const radius = i * gap
        const points: [number, number][] = []
        for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.02) {
          const nx = Math.cos(a)
          const ny = Math.sin(a)
          const r =
            radius * (1 + fbm(nx * frequency + c.x * 0.001, ny * frequency + i * 0.05) * distortion)
          points.push([c.x + nx * r, c.y + ny * r])
        }
        const lit = rand() < accentShare
        polyline(
          points,
          lit ? tint(0.8) : rgba(foreground, 0.14 + (1 - i / count) * 0.18),
          lit ? 2 : 1,
        )
      }
    }
  }

  function dots() {
    const spacing = between(9, 18)
    const scale = between(0.001, 0.003)
    const threshold = between(-0.2, 0)
    const accentShare = between(0.08, 0.2)
    for (let y = spacing / 2; y < H; y += spacing) {
      for (let x = spacing / 2; x < W; x += spacing) {
        const jx = x + (rand() - 0.5) * spacing * 0.6
        const jy = y + (rand() - 0.5) * spacing * 0.6
        const v = fbm(jx * scale, jy * scale)
        if (v < threshold) continue
        const size = Math.min(1, (v - threshold) * 4) * spacing * 0.36
        ctx.beginPath()
        ctx.arc(jx, jy, Math.max(0.6, size), 0, Math.PI * 2)
        ctx.fillStyle = rand() < accentShare ? tint(0.85) : rgba(foreground, 0.18)
        ctx.fill()
      }
    }
  }

  function glow() {
    const x = between(0.2, 0.8) * W
    const y = between(0.2, 0.8) * H
    const g = ctx.createRadialGradient(x, y, 0, x, y, H * between(0.5, 0.9))
    const color = rand() < 0.5 ? accent : second
    g.addColorStop(0, rgba(color, between(0.08, 0.18)))
    g.addColorStop(1, rgba(color, 0))
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
  }

  function vignette() {
    const g = ctx.createRadialGradient(W / 2, H / 2, H / 3, W / 2, H / 2, W / 1.4)
    g.addColorStop(0, rgba(background, 0))
    g.addColorStop(1, rgba(background, 0.85))
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
  }

  function grain(amount: number) {
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const d = image.data
    for (let i = 0; i < d.length; i += 4) {
      const n = (rand() - 0.5) * amount
      d[i] = (d[i] as number) + n
      d[i + 1] = (d[i + 1] as number) + n
      d[i + 2] = (d[i + 2] as number) + n
    }
    ctx.putImageData(image, 0, 0)
  }

  const styles: Record<string, () => void> = {
    flow,
    streams,
    orbits,
    contours,
    waves,
    grid,
    rings,
    dots,
  }
  if (requested && !(requested in styles)) {
    throw new Error(`unknown style ${requested}, expected one of ${Object.keys(styles).join(', ')}`)
  }
  const style = requested ?? pick(Object.keys(styles))
  ctx.fillStyle = rgba(background, 1)
  ctx.fillRect(0, 0, W, H)
  if (rand() < 0.6) glow()
  styles[style]?.()
  vignette()
  grain(14)
  return {
    style,
    accent: secondName === accentName ? accentName : `${accentName}+${secondName}`,
  }
}
