import type { GameViewDTO } from "@durakjs/engine"
import { getTableCardSelector, measureElement } from "@/shared/lib/dom-rect"
import { FLIGHT_ROLE } from "./constants"
import type { PendingFlight } from "./pending-flight"

export function buildDiscardFlights(view: GameViewDTO): PendingFlight[] {
  const flights: PendingFlight[] = []

  for (const pair of view.table) {
    const attackFrom = measureElement(getTableCardSelector(pair.attack.id, FLIGHT_ROLE.attack))
    if (attackFrom) {
      flights.push({
        cardId: pair.attack.id,
        card: pair.attack,
        from: attackFrom,
        role: FLIGHT_ROLE.discard,
      })
    }

    if (pair.defense) {
      const defenseFrom = measureElement(
        getTableCardSelector(pair.defense.id, FLIGHT_ROLE.defense),
      )
      if (defenseFrom) {
        flights.push({
          cardId: pair.defense.id,
          card: pair.defense,
          from: defenseFrom,
          role: FLIGHT_ROLE.discard,
        })
      }
    }
  }

  return flights
}
