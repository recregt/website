export function startShapeWorker() {
  return new Worker(new URL('./shape.worker.ts', import.meta.url), { type: 'module' })
}

export function startClimateWorker() {
  return new Worker(new URL('./climate.worker.ts', import.meta.url), { type: 'module' })
}
