import { RANK_VALUES, type Card, type GameState, type Player } from "../../core/types"
import type { ITurnService } from "./types"

export class TurnService implements ITurnService {
  determineFirstAttacker(players: Player[], trump: Card): number {
    let bestIndex = 0
    let bestScore = Number.POSITIVE_INFINITY

    players.forEach((player, index) => {
      for (const card of player.hand) {
        const score = this.getCardPriority(card, trump)
        if (score < bestScore) {
          bestScore = score
          bestIndex = index
        }
      }
    })

    return bestIndex
  }

  getAttacker(state: GameState): Player {
    return state.players[state.attackerIndex]!
  }

  getDefender(state: GameState): Player {
    return state.players[state.defenderIndex]!
  }

  getPlayerById(state: GameState, playerId: string): Player | null {
    return state.players.find((player) => player.id === playerId) ?? null
  }

  updatePlayerHand(state: GameState, playerId: string, hand: Card[]): GameState {
    return {
      ...state,
      players: state.players.map((player) =>
        player.id === playerId ? { ...player, hand } : player,
      ),
    }
  }

  private getCardPriority(card: Card, trump: Card): number {
    const rankValue = RANK_VALUES[card.rank]
    if (card.suit === trump.suit) {
      return rankValue
    }
    return rankValue + 100
  }
}

