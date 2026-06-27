import { Button } from "@/shared/ui"
import { cn } from "@/shared/lib"

const ACTION_BUTTON_CLASS =
  "inline-flex h-10 w-28 shrink-0 cursor-pointer items-center justify-center text-center transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50"

type TakeActionButtonProps = {
  onClick: () => void
  disabled: boolean
}

export function TakeActionButton({ onClick, disabled }: TakeActionButtonProps) {
  return (
    <Button
      variant="secondary"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        ACTION_BUTTON_CLASS,
        "bg-black text-white hover:bg-zinc-800 disabled:hover:bg-black",
      )}
    >
      Беру
    </Button>
  )
}

type PassActionButtonProps = {
  onClick: () => void
  disabled: boolean
}

export function PassActionButton({ onClick, disabled }: PassActionButtonProps) {
  return (
    <Button
      variant="secondary"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        ACTION_BUTTON_CLASS,
        "bg-black text-white hover:bg-zinc-800 disabled:hover:bg-black",
      )}
    >
      Бито
    </Button>
  )
}

type SurrenderActionButtonProps = {
  onClick: () => void
  disabled: boolean
}

export function SurrenderActionButton({ onClick, disabled }: SurrenderActionButtonProps) {
  return (
    <Button
      variant="secondary"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        ACTION_BUTTON_CLASS,
        "bg-red-600 text-white hover:bg-red-500 disabled:hover:bg-red-600",
      )}
    >
      Сдаться
    </Button>
  )
}
