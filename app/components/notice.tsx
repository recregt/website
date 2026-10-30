import type { ReactNode } from 'react'

export function Notice({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-4 py-8 text-center">
      <p className="font-mono text-xs text-muted-foreground">{children}</p>
      {action}
    </div>
  )
}
