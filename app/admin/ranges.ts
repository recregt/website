export const ranges = { '1d': 1, '7d': 7, '30d': 30, '90d': 90 } as const
export type Range = keyof typeof ranges

export function parseRange(value: string | null): Range {
  return isRange(value) ? value : '7d'
}

function isRange(value: string | null): value is Range {
  return value !== null && Object.hasOwn(ranges, value)
}
