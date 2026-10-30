import { useRevalidator } from 'react-router'

import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'

import type { AnalyticsProblem } from '../../server/stats.server'

const messages: Record<AnalyticsProblem, string> = {
  unconfigured: 'Analytics is not configured: set the ANALYTICS_TOKEN secret.',
  unavailable: 'Analytics could not be loaded right now.',
}

export function AnalyticsNotice({ reason }: { reason: AnalyticsProblem }) {
  const revalidator = useRevalidator()
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 text-muted-foreground">
        <p>{messages[reason]}</p>
        {reason === 'unavailable' && (
          <Button
            variant="outline"
            size="sm"
            disabled={revalidator.state === 'loading'}
            onClick={() => revalidator.revalidate()}
          >
            Try again
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
