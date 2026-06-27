import { GAME_PHASE, HUMAN_PLAYER_ID, type CardDTO, type GameViewDTO } from "@durakjs/engine"
import { FLIGHT_ROLE, type TableFlightRole } from "./constants"

export function isHumanPlayer(playerId: string): boolean {
  return playerId === HUMAN_PLAYER_ID
}

export function isHumanThrowInPhase(view: GameViewDTO): boolean {
  return view.phase === GAME_PHASE.throwIn && view.currentPlayerId === HUMAN_PLAYER_ID
}

export function findCardInView(view: GameViewDTO, cardId: string): CardDTO | null {
  for (const pair of view.table) {
    if (pair.attack.id === cardId) return pair.attack
    if (pair.defense?.id === cardId) return pair.defense
  }

  const human = view.players.find((player) => player.id === HUMAN_PLAYER_ID)
  if (human && Array.isArray(human.hand)) {
    return human.hand.find((card) => card.id === cardId) ?? null
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
