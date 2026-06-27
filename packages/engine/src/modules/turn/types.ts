import type { Card, GameState, Player } from "../../core/types"

export interface ITurnService {
  determineFirstAttacker(players: Player[], trump: Card): number
  getAttacker(state: GameState): Player
  getDefender(state: GameState): Player
  getPlayerById(state: GameState, playerId: string): Player | null
  updatePlayerHand(state: GameState, playerId: string, hand: Card[]): GameState
}
