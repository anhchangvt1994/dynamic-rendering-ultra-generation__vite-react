import * as SelectPrimitive from '@radix-ui/react-select'
import { CheckIcon, ChevronDownIcon } from '@radix-ui/react-icons'
import { useRef, useState } from 'react'
import { ContentStyle, ItemStyle, TriggerStyle } from './styles'

export type SelectOption = {
  value: string
  label: string
  description?: string
}

// upper bound for the tap that closed the list to deliver its click
const REOPEN_GUARD_MS = 1000

/** Shared, authored single-select. Radix owns focus, keyboard, typeahead,
 * outside dismissal and collision handling; the app owns all visible styles.
 * The trigger toggles: a second tap on it closes the list. */
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
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  // NOTE - On touch Radix opens on the trigger's click. A second tap on the
  // trigger first closes the list (pointer down outside it), then that same
  // tap's click opened it again: the list could never be closed that way.
  // That click is ignored; the next press on the trigger lifts the guard.
  const reopenBlockedUntil = useRef(0)

  return (
    <SelectPrimitive.Root
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      open={open}
      onOpenChange={(next) => {
        if (next && Date.now() < reopenBlockedUntil.current) return
        setOpen(next)
      }}
    >
      <TriggerStyle
        ref={triggerRef}
        aria-label={label}
        onPointerDown={() => {
          reopenBlockedUntil.current = 0
        }}
      >
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
          onPointerDownOutside={(event) => {
            const { clientX, clientY } = event.detail.originalEvent
            const box = triggerRef.current?.getBoundingClientRect()
            if (
              box &&
              clientX >= box.left &&
              clientX <= box.right &&
              clientY >= box.top &&
              clientY <= box.bottom
            )
              reopenBlockedUntil.current = Date.now() + REOPEN_GUARD_MS
          }}
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
