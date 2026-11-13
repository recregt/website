import init, { Shape } from '@recregt/orbis'

import {
  DECLINATION_SAMPLES,
  type RegionRequest,
  type Request,
  type ShapeReply,
  transfer,
} from './protocol'

const ready = init()
let shape: Shape | undefined
let queue: Promise<void> = Promise.resolve()

function post(reply: ShapeReply, arrays: (Float32Array | Uint32Array)[]) {
  self.postMessage(reply, transfer(arrays))
}

function build(request: Request) {
  shape?.free()
  shape = new Shape(BigInt(request.seed), request.width, request.height)
  const elevation = shape.elevation()
  const declination = new Float32Array(DECLINATION_SAMPLES)
  for (let day = 0; day < DECLINATION_SAMPLES; day++) {
    declination[day] = shape.sunDeclination((day + 0.5) / DECLINATION_SAMPLES)
  }
  post(
    {
      kind: 'shape',
      width: shape.width,
      height: shape.height,
      elevation,
      declination,
      circumferenceMetres: shape.circumferenceMetres,
      regionCells: shape.regionCells,
      regionSpacingMetres: shape.regionSpacingMetres,
    },
    [elevation, declination],
  )
  const started = performance.now()
  const heights = shape.relief()
  const receivers = shape.drainageReceivers()
  post(
    {
      kind: 'relief',
      width: shape.reliefWidth,
      height: shape.reliefHeight,
      heights,
      receivers,
      seconds: (performance.now() - started) / 1000,
    },
    [heights, receivers],
  )
}

function region({ i, j }: RegionRequest) {
  if (!shape) return
  const started = performance.now()
  const heights = shape.region(BigInt(i), BigInt(j), 0)
  post({ kind: 'region', i, j, heights, seconds: (performance.now() - started) / 1000 }, [heights])
}

self.onmessage = ({ data }: MessageEvent<Request | RegionRequest>) => {
  queue = queue.then(async () => {
    await ready
    if ('kind' in data) region(data)
    else build(data)
  })
}
