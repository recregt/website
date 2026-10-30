import type { ReactNode } from 'react'

export function Notice({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-10 text-center">
      <p className="text-sm text-muted-foreground">{children}</p>
      {action}
    </div>
  )
}
