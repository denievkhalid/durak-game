import { CardView } from "@/entities/card"
import { cn } from "@/shared/lib"
import { FLIGHT_ROLE } from "../lib/constants"
import type { CardFlight } from "./types"

type LandedCardOverlayProps = {
  flight: CardFlight
}

export function LandedCardOverlay({ flight }: LandedCardOverlayProps) {
  const tableAngleClass =
    flight.role === FLIGHT_ROLE.attack
      ? "-rotate-6"
      : flight.role === FLIGHT_ROLE.defense
        ? "rotate-6"
        : null

  return (
    <div
      className="pointer-events-none fixed z-40"
      style={{
        left: flight.to.x,
        top: flight.to.y,
        width: flight.to.width,
        height: flight.to.height,
      }}
    >
      <CardView
        card={flight.card}
        faceDown={flight.faceDown ?? false}
        className={cn(
          "h-full w-full [&>button]:h-full [&>button]:w-full [&>div]:h-full [&>div]:w-full",
          tableAngleClass,
        )}
      />
    </div>
  )
}
