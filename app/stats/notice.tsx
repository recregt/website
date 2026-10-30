import { useRevalidator } from 'react-router'

import { Notice } from '~/components/notice'
import { Button } from '~/components/ui/button'

import type { AnalyticsProblem } from '../../server/stats.server'

const messages: Record<AnalyticsProblem, string> = {
  unconfigured: 'Analytics is not configured: set the ANALYTICS_TOKEN secret.',
  unavailable: 'Analytics could not be loaded right now.',
}

export function AnalyticsNotice({ reason }: { reason: AnalyticsProblem }) {
  const revalidator = useRevalidator()
  return (
    <Notice
      action={
        reason === 'unavailable' && (
          <Button
            variant="outline"
            size="sm"
            disabled={revalidator.state === 'loading'}
            onClick={() => revalidator.revalidate()}
          >
            Try again
          </Button>
        )
      }
    >
      {messages[reason]}
    </Notice>
  )
}
