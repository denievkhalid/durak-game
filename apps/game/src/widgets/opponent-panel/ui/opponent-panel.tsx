import { useLayoutEffect, useRef } from "react"
import type { CardDTO, PlayerViewDTO } from "@durakjs/engine"
import { PlayerAvatar } from "@/entities/player"
import { HiddenHandStack } from "@/entities/hand"
import { usePlayerActionStore } from "@/features/player-action"
import { getOpponentHandSelector, measureElement, toRect, type Rect } from "@/shared/lib/dom-rect"

type OpponentPanelProps = {
  player: PlayerViewDTO
  handCount: number
  pendingBotMove: { card: CardDTO } | null
  onBotCardReady: (from: Rect, cardId: string) => void
}

export function OpponentPanel({
  player,
  handCount,
  pendingBotMove,
  onBotCardReady,
}: OpponentPanelProps) {
  const botCardRef = useRef<HTMLDivElement>(null)
  const actionLabel = usePlayerActionStore((store) => store.actions[player.id]?.label)

  useLayoutEffect(() => {
    if (!pendingBotMove) return

    let cancelled = false

    const tryReady = (attempt: number) => {
      if (cancelled) return

      const cardId = pendingBotMove.card.id
      if (botCardRef.current) {
        onBotCardReady(toRect(botCardRef.current.getBoundingClientRect()), cardId)
        return
      }

      if (attempt >= 8) {
        const fallback = measureElement(getOpponentHandSelector())
        if (fallback) {
          onBotCardReady(fallback, cardId)
        }
        return
      }

      requestAnimationFrame(() => tryReady(attempt + 1))
    }

    tryReady(0)
    return () => {
      cancelled = true
    }
  }, [pendingBotMove, onBotCardReady, handCount])

  return (
    <div className="flex flex-col items-center gap-3 overflow-visible">
      <PlayerAvatar player={player} actionLabel={actionLabel} />
      <div className="w-full overflow-visible px-2">
        <HiddenHandStack
          count={handCount}
          {...(pendingBotMove && handCount > 0
            ? {
                measureSlotRef: botCardRef,
                measureSlotIndex: handCount - 1,
              }
            : {})}
        />
      </div>
    </div>
  )
}
