import type { CardDTO } from "@durakjs/engine"
import { CardView } from "@/entities/card"
import { cn } from "@/shared/lib"

type DeckPileProps = {
  trump: CardDTO
}

export function DeckPile({ trump }: DeckPileProps) {
  return (
    <div className="relative h-card w-[calc(var(--width-card)*2-1.5rem)] shrink-0">
      <CardView
        card={trump}
        className="absolute left-0 top-0 z-0 origin-center -rotate-6 opacity-95"
      />
      <div
        data-card-anchor="deck-pile"
        className={cn(
          "absolute top-0 z-10 h-card w-card origin-center rotate-3 rounded-lg border-2 border-slate-600",
          "left-[calc(var(--width-card)-1.5rem)]",
          "bg-gradient-to-br from-indigo-800 to-indigo-950 shadow-md",
        )}
      />
    </div>
  )
}
