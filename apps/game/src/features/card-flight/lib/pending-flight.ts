import type { CardDTO } from "@durakjs/engine"
import type { Rect } from "@/shared/lib/dom-rect"
import type { FlightRole } from "./constants"

export type PendingFlight = {
  cardId: string
  from: Rect
  target?: Rect | undefined
  faceDown?: boolean | undefined
  role: FlightRole
  playerId?: string | undefined
  card?: CardDTO | undefined
  handSlotIndex?: number | undefined
}
