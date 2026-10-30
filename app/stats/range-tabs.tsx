import { Link } from 'react-router'

import { segmentGroup, segmentItem } from '~/components/segmented'

import { type Range, ranges } from './ranges'

export function RangeTabs({ range }: { range: Range }) {
  return (
    <nav aria-label="Range" className={segmentGroup}>
      {Object.keys(ranges).map((option) => (
        <Link
          key={option}
          to={`?range=${option}`}
          viewTransition
          aria-current={option === range ? 'page' : undefined}
          className={segmentItem(option === range)}
        >
          {option}
        </Link>
      ))}
    </nav>
  )
}
