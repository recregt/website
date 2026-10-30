import type { ReactNode } from 'react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { cn } from '~/lib/utils'

export function Section({
  title,
  description,
  action,
  className,
  children,
}: {
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="p-4 pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm">{title}</CardTitle>
          {action}
        </div>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col p-4 pt-0">{children}</CardContent>
    </Card>
  )
}
