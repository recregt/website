export type Rating = 'good' | 'needs improvement' | 'poor'

const thresholds = {
  ttfbMs: [800, 1800],
  fcpMs: [1800, 3000],
  lcpMs: [2500, 4000],
} as const

export type Vital = keyof typeof thresholds

export function rate(vital: Vital, value: number): Rating {
  const [good, poor] = thresholds[vital]
  if (value <= good) return 'good'
  if (value <= poor) return 'needs improvement'
  return 'poor'
}
