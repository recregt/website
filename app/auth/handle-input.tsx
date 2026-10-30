import { useEffect, useRef, useState } from 'react'

import { Input } from '~/components/ui/input'
import { cn } from '~/lib/utils'

import { handleLength, handleProblem, tidyHandle } from './protocol'

export function HandleInput({
  id,
  defaultValue = '',
  className,
}: {
  id: string
  defaultValue?: string
  className?: string
}) {
  const field = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState(defaultValue)
  const [checked, setChecked] = useState(false)
  const problem = handleProblem(value)
  const shown = checked ? problem : null

  useEffect(() => {
    field.current?.setCustomValidity(problem ?? '')
  }, [problem])

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground"
        >
          @
        </span>
        <Input
          ref={field}
          id={id}
          name="handle"
          value={value}
          onChange={(event) => setValue(tidyHandle(event.target.value))}
          onBlur={() => setChecked(value.length > 0)}
          onInvalid={(event) => {
            event.preventDefault()
            setChecked(true)
          }}
          required
          maxLength={handleLength.max}
          placeholder="alex-99"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          aria-invalid={shown ? true : undefined}
          aria-describedby={shown ? `${id}-problem` : undefined}
          className={cn('pl-7', className)}
        />
      </div>
      {shown && (
        <p id={`${id}-problem`} className="text-sm text-destructive">
          {shown}
        </p>
      )}
    </div>
  )
}
