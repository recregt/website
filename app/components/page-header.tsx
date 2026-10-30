import type { ReactNode } from 'react'

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: string
  description?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
            {eyebrow}
          </p>
        )}
        <h1 className="font-heading text-3xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-2 text-muted-foreground">{description}</p>}
      </div>
      {actions}
    </div>
  )
}
