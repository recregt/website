import type { ReactNode } from 'react'

import { PageHeader } from '~/components/page-header'

export function Message({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action: ReactNode
}) {
  return (
    <div className="flex flex-col items-start gap-8">
      <PageHeader title={title} description={description} />
      {action}
    </div>
  )
}
