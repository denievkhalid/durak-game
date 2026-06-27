import { RANK_VALUES, type Card, type GameState, type TablePair } from "../../core/types"

export interface IRulesStrategy {
  canBeat(attack: Card, defense: Card, trumpSuit: Card["suit"]): boolean
  canThrowIn(card: Card, table: TablePair[]): boolean
  canAddToTable(state: GameState): boolean
  getMaxTablePairs(defenderHandSize: number): number
}

export class PodkidnoyRules implements IRulesStrategy {
  canBeat(attack: Card, defense: Card, trumpSuit: Card["suit"]): boolean {
    if (defense.suit === attack.suit) {
      return RANK_VALUES[defense.rank] > RANK_VALUES[attack.rank]
    }

    if (defense.suit === trumpSuit && attack.suit !== trumpSuit) {
      return true
    }

    return false
  }

  canThrowIn(card: Card, table: TablePair[]): boolean {
    const ranks = new Set<Card["rank"]>()
    for (const pair of table) {
      ranks.add(pair.attack.rank)
      if (pair.defense) ranks.add(pair.defense.rank)
    }
    return ranks.has(card.rank)
  }

  canAddToTable(state: GameState): boolean {
    const defender = state.players[state.defenderIndex]
    if (!defender) return false

    const maxPairs = this.getMaxTablePairs(defender.hand.length)
    return state.table.length < maxPairs
  }

  getMaxTablePairs(defenderHandSize: number): number {
    return Math.min(6, defenderHandSize)
  }
}
