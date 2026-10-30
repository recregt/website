import 'uplot/dist/uPlot.min.css'

import { useEffect, useRef, useState } from 'react'
import uPlot from 'uplot'

import { useTheme } from '~/hooks/use-theme'

import type { SiteStats } from '../../server/stats.server'

type Series = SiteStats['series']

const height = 280
const axisFont = '11px "Geist Variable", sans-serif'

const stepSeconds = { hour: 3600, day: 86400 } as const
const tickSteps = {
  hour: [1, 2, 3, 6, 12].map((hours) => hours * stepSeconds.hour),
  day: [1, 2, 7, 14, 30].map((days) => days * stepSeconds.day),
}
const tickFormats = {
  hour: new Intl.DateTimeFormat('en', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'UTC',
  }),
  day: new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
}
const readoutFormats = {
  hour: new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'UTC',
  }),
  day: new Intl.DateTimeFormat('en', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }),
}

export const seriesTokens = { views: '--chart-1', visitors: '--chart-2' } as const

export function TrafficChart({ series }: { series: Series }) {
  const [hovered, setHovered] = useState<number | null>(null)
  const point = series.points[hovered ?? series.points.length - 1]
  return (
    <div className="flex flex-col gap-3">
      {point && (
        <p className="flex flex-wrap gap-x-4 text-sm">
          <span className="text-muted-foreground">
            {readoutFormats[series.step].format(point.time * 1000)}
          </span>
          <span className="tabular-nums">
            <span className="mr-1.5 inline-block size-2 rounded-sm bg-chart-1" />
            {point.views.toLocaleString('en')} views
          </span>
          <span className="tabular-nums">
            <span className="mr-1.5 inline-block size-2 rounded-full bg-chart-2" />
            {point.visitors.toLocaleString('en')} visitors
          </span>
        </p>
      )}
      <Plot series={series} onHover={setHovered} />
    </div>
  )
}

function Plot({
  series: { step, points },
  onHover,
}: {
  series: Series
  onHover: (index: number | null) => void
}) {
  const container = useRef<HTMLDivElement>(null)
  const theme = useTheme()

  useEffect(() => {
    const element = container.current
    if (!element || points.length === 0) return
    const half = stepSeconds[step] / 2
    const views = theme(seriesTokens.views)
    const axis: uPlot.Axis = {
      stroke: theme('--muted-foreground'),
      grid: { stroke: theme('--border'), width: 1 },
      ticks: { show: false },
      font: axisFont,
      size: 40,
    }
    const chart = new uPlot(
      {
        width: element.clientWidth,
        height,
        padding: [8, 0, 0, 0],
        legend: { show: false },
        cursor: {
          y: false,
          points: { show: false },
          drag: { x: false, y: false, setScale: false },
        },
        hooks: { setCursor: [(plot) => onHover(plot.cursor.idx ?? null)] },
        tzDate: (seconds) => uPlot.tzDate(new Date(seconds * 1000), 'Etc/UTC'),
        scales: {
          x: { range: (_plot, min, max) => [min - half, max + half] },
          y: { range: (_plot, _min, max) => [0, Math.max(1, max)] },
        },
        axes: [
          {
            ...axis,
            size: 28,
            grid: { show: false },
            incrs: tickSteps[step],
            values: (_plot, ticks) => ticks.map((tick) => tickFormats[step].format(tick * 1000)),
          },
          axis,
        ],
        series: [
          {},
          {
            stroke: views,
            width: 0,
            fill: withAlpha(views, 85),
            paths: uPlot.paths.bars?.({ size: [0.7] }),
            points: { show: false },
          },
          {
            stroke: theme(seriesTokens.visitors),
            width: 2,
            paths: uPlot.paths.linear?.(),
            points: { show: false },
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
    const resize = new ResizeObserver(() => chart.setSize({ width: element.clientWidth, height }))
    resize.observe(element)
    document.fonts.ready.then(() => chart.redraw(false, true)).catch(() => {})
    return () => {
      resize.disconnect()
      chart.destroy()
    }
  }, [step, points, theme, onHover])

  return <div ref={container} className="w-full" style={{ height }} />
}

function withAlpha(color: string, percent: number): string {
  const context = document.createElement('canvas').getContext('2d')
  if (!context) return color
  context.fillStyle = color
  const alpha = Math.round((percent / 100) * 255)
    .toString(16)
    .padStart(2, '0')
  return `${String(context.fillStyle)}${alpha}`
}
