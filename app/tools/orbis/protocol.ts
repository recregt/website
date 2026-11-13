export type Request = { seed: string; width: number; height: number }

export type RegionRequest = { kind: 'region'; i: number; j: number }

export type ShapeReply =
  | {
      kind: 'shape'
      width: number
      height: number
      elevation: Float32Array
      declination: Float32Array
      circumferenceMetres: number
      regionCells: number
      regionSpacingMetres: number
    }
  | {
      kind: 'relief'
      width: number
      height: number
      heights: Float32Array
      receivers: Uint32Array
      seconds: number
    }
  | { kind: 'region'; i: number; j: number; heights: Float32Array; seconds: number }

export type Climate = {
  kind: 'climate'
  width: number
  height: number
  seconds: number
  settled: boolean
  seaSalinity: number
  windMetresPerSecond: number
  wind: Float32Array
  layers: Record<
    'temperature' | 'summer' | 'rain' | 'ipse' | 'cover' | 'river' | 'gyre' | 'evaporation',
    Float32Array
  >
}

export type Shape = Extract<ShapeReply, { kind: 'shape' }>
export type Relief = Extract<ShapeReply, { kind: 'relief' }>
export type Region = Extract<ShapeReply, { kind: 'region' }>

export const DECLINATION_SAMPLES = 365

export function transfer(arrays: (Float32Array | Uint32Array)[]) {
  return { transfer: arrays.map((array) => array.buffer as ArrayBuffer) }
}
