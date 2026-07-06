import * as React from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const EMPTY_VALUE = '__lazuli_empty_value__'

interface SelectProps {
  children: React.ReactNode
  className?: string
  disabled?: boolean
  id?: string
  title?: string
  'aria-label'?: string
  value?: string | number | readonly string[]
  defaultValue?: string | number | readonly string[]
  onChange?: React.ChangeEventHandler<HTMLSelectElement>
}

interface SelectOption {
  value: string
  itemValue: string
  label: React.ReactNode
  disabled?: boolean
}

const Select = React.forwardRef<HTMLButtonElement, SelectProps>(
  ({ className, children, value, defaultValue, onChange, disabled, id, title, 'aria-label': ariaLabel }, ref) => {
    const options = React.Children.toArray(children).flatMap((child): SelectOption[] => {
      if (!React.isValidElement<React.OptionHTMLAttributes<HTMLOptionElement>>(child) || child.type !== 'option') return []
      const rawValue = child.props.value ?? child.props.children?.toString() ?? ''
      const normalizedValue = String(rawValue)
      return [{
        value: normalizedValue,
        itemValue: normalizedValue || EMPTY_VALUE,
        label: child.props.children,
        disabled: child.props.disabled,
      }]
    })
    const normalizedValue = normalizeSelectValue(value)
    const normalizedDefaultValue = normalizeSelectValue(defaultValue)

    const emitChange = (nextItemValue: string) => {
      const nextValue = denormalizeSelectValue(nextItemValue)
      onChange?.({ target: { value: nextValue }, currentTarget: { value: nextValue } } as React.ChangeEvent<HTMLSelectElement>)
    }

    return (
      <SelectPrimitive.Root
        value={normalizedValue}
        defaultValue={normalizedDefaultValue}
        onValueChange={emitChange}
        disabled={disabled}
      >
        <SelectPrimitive.Trigger
          ref={ref}
          id={id}
          title={title}
          aria-label={ariaLabel}
          className={cn(
            'flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-card px-3 py-2 text-left text-sm text-foreground shadow-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50',
            className,
          )}
        >
          <span className="min-w-0 truncate"><SelectPrimitive.Value /></span>
          <SelectPrimitive.Icon asChild><ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /></SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            sideOffset={4}
            className="z-[80] max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border border-border bg-card text-card-foreground shadow-xl"
          >
            <SelectPrimitive.Viewport className="p-1">
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.itemValue}
                  value={option.itemValue}
                  disabled={option.disabled}
                  className="relative flex min-h-9 cursor-pointer select-none items-center rounded px-8 py-2 text-sm outline-none data-[disabled]:pointer-events-none data-[highlighted]:bg-secondary data-[disabled]:opacity-50"
                >
                  <SelectPrimitive.ItemIndicator className="absolute left-2 inline-flex items-center">
                    <Check className="h-4 w-4" />
                  </SelectPrimitive.ItemIndicator>
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    )
  },
)
Select.displayName = 'Select'

function normalizeSelectValue(value: SelectProps['value'] | SelectProps['defaultValue']) {
  if (Array.isArray(value)) return String(value[0] ?? '') || EMPTY_VALUE
  if (value === undefined) return undefined
  return String(value) || EMPTY_VALUE
}

function denormalizeSelectValue(value: string) {
  return value === EMPTY_VALUE ? '' : value
}

export { Select }
