import type { MouseEvent } from "react"
import type { CardDTO } from "@durakjs/engine"
import { cn, formatRank, SUIT_COLOR_CLASS, SUIT_SYMBOLS } from "@/shared/lib"

type CardViewProps = {
  card: CardDTO
  playable?: boolean
  selected?: boolean
  faceDown?: boolean
  hidden?: boolean
  anchor?: string
  onClick?: ((event: MouseEvent<HTMLButtonElement>) => void) | undefined
  className?: string | undefined
}

export function CardView({
  card,
  playable: _playable = false,
  selected = false,
  faceDown = false,
  hidden = false,
  anchor,
  onClick,
  className,
}: CardViewProps) {
  const anchorProps = anchor ? { "data-card-anchor": anchor } : {}

  if (faceDown) {
    return (
      <div
        {...anchorProps}
        className={cn(
          "flex h-card w-card items-center justify-center rounded-lg border-2 border-slate-600 bg-gradient-to-br from-indigo-700 to-indigo-900 shadow-md",
          hidden && "opacity-0",
          className,
        )}
      />
    )
  }

  return (
    <button
      type="button"
      {...anchorProps}
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "flex h-card w-card flex-col items-center justify-center rounded-lg border-2 border-slate-300 bg-white shadow-md transition",
        SUIT_COLOR_CLASS[card.suit],
        selected && "ring-2 ring-amber-400",
        onClick && "cursor-pointer",
        !onClick && "cursor-default",
        hidden && "opacity-0",
        className,
      )}
    >
      <span className="text-sm font-bold">{formatRank(card.rank)}</span>
      <span className="text-2xl leading-none">{SUIT_SYMBOLS[card.suit]}</span>
    </button>
  )
}
