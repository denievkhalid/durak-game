import type { RefObject } from "react"
import { CardView } from "@/entities/card"
import { cn } from "@/shared/lib"
import {
  getOpponentHandArcPivotOrigin,
  getOpponentHandArcTransform,
  getOpponentHandArcVerticalPadding,
  getPlayerHandOverlapClass,
} from "@/shared/lib/hand-arc"

type HiddenHandStackProps = {
  count: number
  measureSlotRef?: RefObject<HTMLDivElement | null>
  measureSlotIndex?: number
}

export function HiddenHandStack({
  count,
  measureSlotRef,
  measureSlotIndex,
}: HiddenHandStackProps) {
  const visibleCount = Math.max(count, 0)
  const overlapClass = getPlayerHandOverlapClass(Math.max(visibleCount, 1))
  const arcPadding = getOpponentHandArcVerticalPadding(Math.max(visibleCount, 1))

  return (
    <div
      data-card-anchor="opponent-hand"
      className="mx-auto flex w-max min-h-card items-end justify-center overflow-visible px-1"
      style={{
        paddingTop: `${arcPadding.topRem}rem`,
        paddingBottom: `${arcPadding.bottomRem}rem`,
      }}
    >
      {Array.from({ length: visibleCount }).map((_, index) => {
        const arc = getOpponentHandArcTransform(index, visibleCount)

        return (
          <div
            key={`opponent-slot-${index}`}
            ref={measureSlotIndex === index ? measureSlotRef : undefined}
            className={cn("relative shrink-0", index > 0 && overlapClass)}
            style={{
              transform: `rotate(${arc.rotate}deg)`,
              transformOrigin: getOpponentHandArcPivotOrigin(),
              zIndex: arc.zIndex,
            }}
          >
            <CardView
              card={{ id: `opponent_slot_${index}`, suit: "spades", rank: "6" }}
              faceDown
            />
          </div>
        )
      })}
    </div>
  )
}
