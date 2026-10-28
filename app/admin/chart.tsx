import 'uplot/dist/uPlot.min.css'

import { useEffect, useRef } from 'react'
import uPlot from 'uplot'

const height = 320
const axisFont = '10px "Geist Mono Variable", monospace'

export const seriesColors = { views: '#d07a4f', visitors: '#69a37c' }

export function TrafficChart({
  points,
}: {
  points: { time: string; views: number; visitors: number }[]
}) {
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = container.current
    if (!element || points.length === 0) return
    const data: uPlot.AlignedData = [
      points.map((point) => Date.parse(`${point.time.replace(' ', 'T')}Z`) / 1000),
      points.map((point) => point.views),
      points.map((point) => point.visitors),
    ]
    const axis: uPlot.Axis = {
      stroke: 'rgba(255, 255, 255, 0.1)',
      grid: { stroke: 'rgba(255, 255, 255, 0.04)', width: 1 },
      ticks: { stroke: 'rgba(255, 255, 255, 0.62)', width: 1 },
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
        axes: [
          {
            ...axis,
            size: 28,
            values: (_chart, values) =>
              values.map((value) => uPlot.fmtDate('{MMM} {D}')(new Date(value * 1000))),
          },
          axis,
        ],
        scales: { y: { range: (_chart, _min, max) => [0, Math.max(1, max)] } },
        series: [
          {},
          {
            stroke: seriesColors.views,
            width: 2,
            paths: uPlot.paths.spline?.(),
            fill: (chart) => fillGradient(chart, seriesColors.views, 0.18),
          },
          {
            stroke: seriesColors.visitors,
            width: 2,
            paths: uPlot.paths.spline?.(),
          },
        ],
      },
      data,
      element,
    )
    const resize = new ResizeObserver(() => chart.setSize({ width: element.clientWidth, height }))
    resize.observe(element)
    document.fonts.ready.then(() => chart.redraw(false, true)).catch(() => {})
    return () => {
      resize.disconnect()
      chart.destroy()
    }
  }, [points])

  return <div ref={container} className="h-80 w-full" />
}

export function Sparkline({ values, color }: { values: number[]; color: string }) {
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = container.current
    if (!element || values.length === 0) return
    const chart = new uPlot(
      {
        width: element.clientWidth,
        height: 36,
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
            fill: (chart) => fillGradient(chart, color, 0.22),
          },
        ],
      },
      [values.map((_, index) => index), values],
      element,
    )
    const resize = new ResizeObserver(() =>
      chart.setSize({ width: element.clientWidth, height: 36 }),
    )
    resize.observe(element)
    document.fonts.ready.then(() => chart.redraw(false, true)).catch(() => {})
    return () => {
      resize.disconnect()
      chart.destroy()
    }
  }, [values, color])

  return <div ref={container} className="h-9 w-full" />
}

function fillGradient(chart: uPlot, color: string, alpha: number) {
  const gradient = chart.ctx.createLinearGradient(0, 0, 0, chart.bbox.height / devicePixelRatio)
  gradient.addColorStop(0, withAlpha(color, alpha))
  gradient.addColorStop(1, withAlpha(color, 0))
  return gradient
}

function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace('#', '')
  const red = Number.parseInt(value.slice(0, 2), 16)
  const green = Number.parseInt(value.slice(2, 4), 16)
  const blue = Number.parseInt(value.slice(4, 6), 16)
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}
