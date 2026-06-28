import { GAME_PHASE, HUMAN_PLAYER_ID, type CardDTO, type GameViewDTO } from "@durakjs/engine"
import { FLIGHT_ROLE, type TableFlightRole } from "./constants"

export function isHumanPlayer(playerId: string): boolean {
  return playerId === HUMAN_PLAYER_ID
}

export function isHumanThrowInPhase(view: GameViewDTO): boolean {
  const viewer = view.players.find((player) => Array.isArray(player.hand))
  const viewerId = viewer?.id ?? HUMAN_PLAYER_ID
  return view.phase === GAME_PHASE.throwIn && view.currentPlayerId === viewerId
}

export function findCardInView(view: GameViewDTO, cardId: string): CardDTO | null {
  for (const pair of view.table) {
    if (pair.attack.id === cardId) return pair.attack
    if (pair.defense?.id === cardId) return pair.defense
  }

  const viewer = view.players.find((player) => Array.isArray(player.hand))
  if (viewer && Array.isArray(viewer.hand)) {
    return viewer.hand.find((card) => card.id === cardId) ?? null
  }

  return null
}

export function getTableRoleForCard(
  view: GameViewDTO,
  cardId: string,
): TableFlightRole | null {
  for (const pair of view.table) {
    if (pair.attack.id === cardId) return FLIGHT_ROLE.attack
    if (pair.defense?.id === cardId) return FLIGHT_ROLE.defense
  }
  return null
}
