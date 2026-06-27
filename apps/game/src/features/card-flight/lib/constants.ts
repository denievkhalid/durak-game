export const FLIGHT_ROLE = {
  attack: "attack",
  defense: "defense",
  deal: "deal",
  discard: "discard",
  take: "take",
} as const

export type FlightRole = (typeof FLIGHT_ROLE)[keyof typeof FLIGHT_ROLE]

export type TableFlightRole = typeof FLIGHT_ROLE.attack | typeof FLIGHT_ROLE.defense

export function isDealFlightRole(role: FlightRole | undefined): boolean {
  return role === FLIGHT_ROLE.deal
}

export function isTableFlightRole(role: FlightRole): role is TableFlightRole {
  return role === FLIGHT_ROLE.attack || role === FLIGHT_ROLE.defense
}

export function isDiscardFlightRole(role: FlightRole | undefined): boolean {
  return role === FLIGHT_ROLE.discard
}

export function isTakeFlightRole(role: FlightRole | undefined): boolean {
  return role === FLIGHT_ROLE.take
}

export const FLIGHT_ENQUEUE = {
  deal: { isDeal: true },
  take: { isTake: true },
} as const
