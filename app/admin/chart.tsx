import 'uplot/dist/uPlot.min.css'

import { useEffect, useRef } from 'react'
import uPlot from 'uplot'

const height = 260

export function TrafficChart({
  points,
}: {
  points: { time: string; views: number; visitors: number }[]
}) {
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = container.current
    if (!element) return
    const data: uPlot.AlignedData = [
      points.map((point) => Date.parse(`${point.time.replace(' ', 'T')}Z`) / 1000),
      points.map((point) => point.views),
      points.map((point) => point.visitors),
    ]
    const chart = new uPlot(
      {
        width: element.clientWidth,
        height,
        series: [
          {},
          { label: 'Views', stroke: '#2563eb', width: 2, points: { show: true } },
          { label: 'Visitors', stroke: '#16a34a', width: 2, points: { show: true } },
        ],
        scales: { y: { range: (_chart, _min, max) => [0, Math.max(1, max)] } },
      },
      data,
      element,
    )
    const resize = new ResizeObserver(() => chart.setSize({ width: element.clientWidth, height }))
    resize.observe(element)
    return () => {
      resize.disconnect()
      chart.destroy()
    }
  }, [points])

  return <div ref={container} />
}
