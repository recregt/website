import { Check, Copy } from 'lucide-react'
import { useState } from 'react'

import { Button } from '~/components/ui/button'

export function RecoveryCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
  }
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-muted py-2 pr-2 pl-4">
      <code className="min-w-0 flex-1 overflow-x-auto font-mono text-sm">{code}</code>
      <Button variant="ghost" size="sm" onClick={() => copy().catch(() => setCopied(false))}>
        {copied ? <Check /> : <Copy />}
        {copied ? 'Copied' : 'Copy'}
      </Button>
    </div>
  )
}
