import 'uplot/dist/uPlot.min.css'

import { useEffect, useRef } from 'react'
import uPlot from 'uplot'

import { useTheme } from '~/hooks/use-theme'

import type { SiteStats } from '../../server/stats.server'

const height = 320
const sparklineHeight = 36
const axisFont = '10px "Geist Mono Variable", monospace'

const tickFormats = {
  hour: new Intl.DateTimeFormat('en', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'UTC',
  }),
  day: new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
}

export const seriesTokens = { views: '--chart-1', visitors: '--chart-2' } as const
type Token = (typeof seriesTokens)[keyof typeof seriesTokens]

export function TrafficChart({ series: { step, points } }: { series: SiteStats['series'] }) {
  const container = useRef<HTMLDivElement>(null)
  const theme = useTheme()

  useEffect(() => {
    const element = container.current
    if (!element || points.length === 0) return
    const axis: uPlot.Axis = {
      stroke: theme('--muted-foreground'),
      grid: { stroke: theme('--border'), width: 1 },
      ticks: { stroke: theme('--border'), width: 1 },
      font: axisFont,
      size: 44,
    }
    const chart = new uPlot(
      {
        width: element.clientWidth,
        height,
        padding: [8, 8, 4, 44],
        cursor: { show: false },
        legend: { show: false },
        tzDate: (seconds) => uPlot.tzDate(new Date(seconds * 1000), 'Etc/UTC'),
        axes: [
          {
            ...axis,
            size: 28,
            values: (_chart, values) =>
              values.map((value) => tickFormats[step].format(value * 1000)),
          },
          axis,
        ],
        scales: { y: { range: (_chart, _min, max) => [0, Math.max(1, max)] } },
        series: [
          {},
          {
            stroke: theme(seriesTokens.views),
            width: 2,
            paths: uPlot.paths.spline?.(),
            fill: (chart) => fade(chart, theme(seriesTokens.views), 18),
          },
          {
            stroke: theme(seriesTokens.visitors),
            width: 2,
            paths: uPlot.paths.spline?.(),
          },
        ],
      },
      [
        points.map((point) => point.time),
        points.map((point) => point.views),
        points.map((point) => point.visitors),
      ],
      element,
    )
    return follow(element, chart, height)
  }, [step, points, theme])

  return <div ref={container} className="h-80 w-full" />
}

export function Sparkline({ values, token }: { values: number[]; token: Token }) {
  const container = useRef<HTMLDivElement>(null)
  const theme = useTheme()

  useEffect(() => {
    const element = container.current
    if (!element || values.length === 0) return
    const color = theme(token)
    const chart = new uPlot(
      {
        width: element.clientWidth,
        height: sparklineHeight,
        padding: [2, 0, 2, 0],
        cursor: { show: false },
        legend: { show: false },
        axes: [{ show: false }, { show: false }],
        series: [
          {},
          {
            stroke: color,
            width: 1.5,
            paths: uPlot.paths.spline?.(),
            fill: (chart) => fade(chart, color, 22),
          },
        ],
      },
      [values.map((_, index) => index), values],
      element,
    )
    return follow(element, chart, sparklineHeight)
  }, [values, token, theme])

  return <div ref={container} className="h-9 w-full" />
}

function follow(element: HTMLElement, chart: uPlot, chartHeight: number) {
  const resize = new ResizeObserver(() =>
    chart.setSize({ width: element.clientWidth, height: chartHeight }),
  )
  resize.observe(element)
  document.fonts.ready.then(() => chart.redraw(false, true)).catch(() => {})
  return () => {
    resize.disconnect()
    chart.destroy()
  }
}

function fade(chart: uPlot, color: string, percent: number) {
  const context = chart.ctx
  context.fillStyle = color
  const opaque = String(context.fillStyle)
  const alpha = Math.round((percent / 100) * 255)
    .toString(16)
    .padStart(2, '0')
  const gradient = context.createLinearGradient(0, 0, 0, chart.bbox.height / devicePixelRatio)
  gradient.addColorStop(0, `${opaque}${alpha}`)
  gradient.addColorStop(1, `${opaque}00`)
  return gradient
}
