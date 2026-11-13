import type { Relief } from './protocol'

const SMALLEST_RIVER = 1.5e9

type Point = { x: number; y: number; discharge: number }

export type River = Point[]

export function traceRivers(
  relief: Relief,
  circumferenceMetres: number,
  runoff: (u: number, v: number) => number,
): River[] {
  const { width, height, heights, receivers } = relief
  const cells = width * height
  const cellArea = (circumferenceMetres / width) ** 2
  const discharge = new Float64Array(cells)
  const waiting = new Uint32Array(cells)
  for (let i = 0; i < cells; i++) {
    if ((heights[i] ?? 0) >= 0) {
      discharge[i] =
        Math.max(runoff(((i % width) + 0.5) / width, (Math.floor(i / width) + 0.5) / height), 0) *
        cellArea
    }
    const r = receivers[i] ?? i
    if (r !== i) waiting[r] = (waiting[r] ?? 0) + 1
  }
  const ready: number[] = []
  for (let i = 0; i < cells; i++) if (waiting[i] === 0) ready.push(i)
  while (ready.length > 0) {
    const i = ready.pop() as number
    const r = receivers[i] ?? i
    if (r === i) continue
    discharge[r] = (discharge[r] ?? 0) + (discharge[i] ?? 0)
    waiting[r] = (waiting[r] ?? 1) - 1
    if (waiting[r] === 0) ready.push(r)
  }

  const flowing = (i: number) => (heights[i] ?? -1) >= 0 && (discharge[i] ?? 0) > SMALLEST_RIVER
  const fed = new Uint8Array(cells)
  for (let i = 0; i < cells; i++) {
    if (flowing(i)) fed[receivers[i] ?? i] = 1
  }
  const heads: number[] = []
  for (let i = 0; i < cells; i++) if (flowing(i) && !fed[i]) heads.push(i)

  const drawn = new Uint8Array(cells)
  const rivers: River[] = []
  for (const head of heads) {
    const river: River = []
    let i = head
    let x = (i % width) + 0.5
    for (;;) {
      const y = Math.floor(i / width) + 0.5
      river.push({ x, y, discharge: discharge[i] ?? 0 })
      if (drawn[i] || (heights[i] ?? -1) < 0) break
      drawn[i] = 1
      const r = receivers[i] ?? i
      if (r === i) break
      let next = (r % width) + 0.5
      if (next - x > width / 2) next -= width
      else if (x - next > width / 2) next += width
      x = next
      i = r
    }
    if (river.length > 1) rivers.push(smooth(smooth(river)))
  }
  return rivers
}

function smooth(river: River): River {
  if (river.length < 3) return river
  const out: River = [river[0] as Point]
  for (let k = 0; k < river.length - 1; k++) {
    const a = river[k] as Point
    const b = river[k + 1] as Point
    out.push(
      {
        x: a.x * 0.75 + b.x * 0.25,
        y: a.y * 0.75 + b.y * 0.25,
        discharge: a.discharge,
      },
      {
        x: a.x * 0.25 + b.x * 0.75,
        y: a.y * 0.25 + b.y * 0.75,
        discharge: b.discharge,
      },
    )
  }
  out.push(river[river.length - 1] as Point)
  return out
}

export function riverWidth(discharge: number) {
  return Math.min(0.16 * (discharge / SMALLEST_RIVER) ** 0.4, 2.4)
}

export function drawRivers(
  context: CanvasRenderingContext2D,
  rivers: River[],
  scale: number,
  width: number,
  style: string,
) {
  context.save()
  context.lineCap = 'round'
  context.lineJoin = 'round'
  context.strokeStyle = style
  for (const shift of [-width, 0, width]) {
    for (const river of rivers) {
      for (let k = 0; k < river.length - 1; k++) {
        const a = river[k] as Point
        const b = river[k + 1] as Point
        context.lineWidth = riverWidth((a.discharge + b.discharge) / 2) * scale
        context.beginPath()
        context.moveTo((a.x + shift) * scale, a.y * scale)
        context.lineTo((b.x + shift) * scale, b.y * scale)
        context.stroke()
      }
    }
  }
  context.restore()
}
