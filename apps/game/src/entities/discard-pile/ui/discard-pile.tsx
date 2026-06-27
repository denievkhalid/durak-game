import { CardView } from "@/entities/card"

const DISCARD_CARD_ROTATIONS = [4, -12, 8, -6, 14, -9] as const
const PILE_TILT_DEG = 11

type DiscardPileProps = {
  count: number
}

export function DiscardPile({ count }: DiscardPileProps) {
  const visibleCards = Math.min(
    Math.max(count, 1),
    DISCARD_CARD_ROTATIONS.length,
  )

  return (
    <div
      className="relative ml-3 shrink-0"
      style={{ transform: `rotate(${PILE_TILT_DEG}deg)` }}
    >
      <div data-card-anchor="discard-pile" className="relative h-card w-card">
        {Array.from({ length: visibleCards }).map((_, index) => (
          <div
            key={index}
            className="absolute inset-0 origin-center"
            style={{
              transform: `rotate(${DISCARD_CARD_ROTATIONS[index]}deg) translate(${index}px, ${index * -0.5}px)`,
              zIndex: index,
            }}
          >
            <CardView
              card={{ id: `discard_stack_${index}`, suit: "spades", rank: "6" }}
              faceDown
              className="h-full w-full from-slate-700 to-slate-900"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
