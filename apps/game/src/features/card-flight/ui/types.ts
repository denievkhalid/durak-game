import type { CardDTO } from "@durakjs/engine"
import type { Rect } from "@/shared/lib/dom-rect"
import type { Transition } from "framer-motion"
import type { FlightRole } from "../lib/constants"

export type CardFlight = {
  card: CardDTO
  from: Rect
  to: Rect
  faceDown?: boolean | undefined
  role?: FlightRole | undefined
  playerId?: string | undefined
  transition?: Transition | undefined
}

export type FlyingCardOverlayProps = {
  flight: CardFlight
  onComplete: () => void
}
