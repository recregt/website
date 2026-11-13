import init, { Layer, World } from '@recregt/orbis'

import { type Climate, type Request, transfer } from './protocol'

const ready = init()

self.onmessage = async ({ data }: MessageEvent<Request>) => {
  await ready
  const started = performance.now()
  const world = new World(BigInt(data.seed), data.width, data.height)
  const layers = {
    temperature: world.layer(Layer.Temperature),
    summer: world.layer(Layer.SummerTemperature),
    rain: world.layer(Layer.Rain),
    ipse: world.layer(Layer.Ipse),
    cover: world.layer(Layer.Cover),
    river: world.layer(Layer.River),
    gyre: world.layer(Layer.Gyre),
    evaporation: world.layer(Layer.Evaporation),
  }
  const wind = new Float32Array(world.height * 2)
  for (let row = 0; row < world.height; row++) {
    const north = 90 - ((row + 0.5) * 180) / world.height
    const [east = 0, toward = 0] = world.surfaceWind(north)
    wind[row * 2] = east
    wind[row * 2 + 1] = toward
  }
  const reply: Climate = {
    kind: 'climate',
    width: world.width,
    height: world.height,
    seconds: (performance.now() - started) / 1000,
    settled: world.settled,
    seaSalinity: world.seaSalinity,
    windMetresPerSecond: world.windMetresPerSecond,
    wind,
    layers,
  }
  world.free()
  self.postMessage(reply, transfer([wind, ...Object.values(layers)]))
}
