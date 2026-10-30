import { cn } from '~/lib/utils'

export const segmentGroup =
  'flex max-w-full items-center gap-0.5 overflow-x-auto rounded-lg border border-border bg-muted p-0.5'

export function segmentItem(active: boolean): string {
  return cn(
    'shrink-0 rounded-md px-3 py-1 text-sm whitespace-nowrap transition-colors',
    active
      ? 'bg-background text-foreground shadow-sm'
      : 'text-muted-foreground hover:text-foreground',
  )
}

export function Segmented<Value extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { value: Value; label: string }[]
  value: Value
  onChange: (value: Value) => void
}) {
  return (
    <fieldset className={cn(segmentGroup, 'm-0 min-w-0')}>
      <legend className="sr-only">{label}</legend>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={segmentItem(option.value === value)}
        >
          {option.label}
        </button>
      ))}
    </fieldset>
  )
}
