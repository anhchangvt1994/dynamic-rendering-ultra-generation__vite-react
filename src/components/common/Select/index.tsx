import * as SelectPrimitive from '@radix-ui/react-select'
import { CheckIcon, ChevronDownIcon } from '@radix-ui/react-icons'
import { ContentStyle, ItemStyle, TriggerStyle } from './styles'

export type SelectOption = {
  value: string
  label: string
  description?: string
}

/** Shared, authored single-select. Radix owns focus, keyboard, typeahead,
 * outside dismissal and collision handling; the app owns all visible styles. */
export default function AppSelect({
  label,
  value,
  options,
  onValueChange,
  disabled = false,
}: {
  label: string
  value: string
  options: SelectOption[]
  onValueChange: (value: string) => void
  disabled?: boolean
}) {
  return (
    <SelectPrimitive.Root
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <TriggerStyle aria-label={label}>
        <span className="select-value">
          <SelectPrimitive.Value />
        </span>
        <SelectPrimitive.Icon className="select-chevron">
          <ChevronDownIcon width={16} height={16} />
        </SelectPrimitive.Icon>
      </TriggerStyle>
      <SelectPrimitive.Portal>
        <ContentStyle
          position="popper"
          sideOffset={6}
          align="start"
          collisionPadding={18}
          avoidCollisions
        >
          <SelectPrimitive.Viewport className="select-viewport">
            {options.map((option) => (
              <ItemStyle
                key={option.value}
                value={option.value}
                textValue={option.label}
                aria-label={
                  option.description
                    ? `${option.label}, ${option.description}`
                    : option.label
                }
              >
                <span className="select-option-copy">
                  <SelectPrimitive.ItemText>
                    {option.label}
                  </SelectPrimitive.ItemText>
                  {option.description && (
                    <span className="select-description">
                      {option.description}
                    </span>
                  )}
                </span>
                <SelectPrimitive.ItemIndicator className="select-check">
                  <CheckIcon width={16} height={16} />
                </SelectPrimitive.ItemIndicator>
              </ItemStyle>
            ))}
          </SelectPrimitive.Viewport>
        </ContentStyle>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}
