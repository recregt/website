import init, { Layer, World } from '@recregt/orbis'

export type Request = { seed: string; width: number; height: number }

export type Reply =
  | {
      kind: 'world'
      width: number
      height: number
      seconds: number
      layers: Record<'elevation' | 'cover' | 'temperature' | 'rain' | 'ipse', Float32Array>
    }
  | { kind: 'relief'; width: number; height: number; seconds: number; heights: Float32Array }

const ready = init()
let world: World | undefined

function post(reply: Reply, buffers: Float32Array[]) {
  self.postMessage(reply, { transfer: buffers.map((array) => array.buffer as ArrayBuffer) })
}

self.onmessage = async ({ data }: MessageEvent<Request>) => {
  await ready
  world?.free()
  let started = performance.now()
  world = new World(BigInt(data.seed), data.width, data.height)
  const layers = {
    elevation: world.layer(Layer.Elevation),
    cover: world.layer(Layer.Cover),
    temperature: world.layer(Layer.Temperature),
    rain: world.layer(Layer.Rain),
    ipse: world.layer(Layer.Ipse),
  }
  const width = world.width
  const height = world.height
  post(
    { kind: 'world', width, height, seconds: (performance.now() - started) / 1000, layers },
    Object.values(layers),
  )
  started = performance.now()
  const heights = world.relief()
  post(
    {
      kind: 'relief',
      width: world.reliefWidth,
      height: world.reliefHeight,
      seconds: (performance.now() - started) / 1000,
      heights,
    },
    [heights],
  )
}
