import type { PlayerViewDTO } from "@durakjs/engine"
import { CardView } from "@/entities/card"
import { cn } from "@/shared/lib"
import {
  getHandArcPivotOrigin,
  getHandArcTransform,
  getHandArcVerticalPadding,
  getPlayerHandOverlapClass,
} from "@/shared/lib/hand-arc"

type PlayerHandProps = {
  player: PlayerViewDTO
  playableIds: Set<string | undefined>
  hiddenCardIds: Set<string>
  onCardClick: (cardId: string, element: HTMLElement) => void
  disabled: boolean
}

export function PlayerHand({
  player,
  playableIds,
  hiddenCardIds,
  onCardClick,
  disabled,
}: PlayerHandProps) {
  if (!Array.isArray(player.hand)) return null

  const visibleHand = player.hand.filter((card) => !hiddenCardIds.has(card.id))
  const overlapClass = getPlayerHandOverlapClass(visibleHand.length)
  const arcPadding = getHandArcVerticalPadding(visibleHand.length)

  return (
    <div className="flex flex-col items-center overflow-visible">
      <div className="w-full overflow-visible px-2">
        <div
          data-card-anchor="player-hand"
          className="mx-auto flex w-max items-end justify-center overflow-visible px-1"
          style={{
            paddingTop: `${arcPadding.topRem}rem`,
            paddingBottom: `${arcPadding.bottomRem}rem`,
          }}
        >
          {visibleHand.map((card, index) => {
            const arc = getHandArcTransform(index, visibleHand.length)

            return (
              <div
                key={card.id}
                className={cn("relative shrink-0", index > 0 && overlapClass)}
                style={{
                  transform: `rotate(${arc.rotate}deg)`,
                  transformOrigin: getHandArcPivotOrigin(),
                  zIndex: arc.zIndex,
                }}
              >
                <CardView
                  card={card}
                  anchor={`hand-${card.id}`}
                  playable={!disabled && playableIds.has(card.id)}
                  onClick={
                    !disabled && playableIds.has(card.id)
                      ? (event) => onCardClick(card.id, event.currentTarget)
                      : undefined
                  }
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
