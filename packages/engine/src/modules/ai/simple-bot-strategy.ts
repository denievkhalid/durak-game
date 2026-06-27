import { RANK_VALUES, GAME_COMMAND_TYPE, GAME_PHASE, type Card, type GameCommand, type GameState } from "../../core/types"
import type { EngineContainer } from "../../core/container"

export interface IBotStrategy {
  pickCommand(state: GameState, container: EngineContainer): GameCommand | null
}

export class SimpleBotStrategy implements IBotStrategy {
  pickCommand(state: GameState, container: EngineContainer): GameCommand | null {
    const bot = state.players.find((player) => player.isBot)
    if (!bot || state.currentPlayerId !== bot.id) return null

    const { rules, table: tableService } = container
    const trumpSuit = state.trump.suit

    if (state.phase === GAME_PHASE.attack) {
      return this.pickAttackCard(bot.hand, trumpSuit)
    }

    if (state.phase === GAME_PHASE.defend) {
      const pairIndex = tableService.getUndefendedPairIndex(state.table)
      if (pairIndex === null) return null

      const attackCard = state.table[pairIndex]?.attack
      if (!attackCard) return null

      const defenseCard = this.pickDefenseCard(bot.hand, attackCard, trumpSuit, rules)
      if (defenseCard) {
        return { type: GAME_COMMAND_TYPE.defend, cardId: defenseCard.id, pairIndex }
      }

      return { type: GAME_COMMAND_TYPE.take }
    }

    if (state.phase === GAME_PHASE.throwIn) {
      const throwable = bot.hand.filter((card) => rules.canThrowIn(card, state.table))
      if (throwable.length === 0) {
        return { type: GAME_COMMAND_TYPE.pass }
      }

      const card = this.pickLowestCard(throwable)
      return { type: GAME_COMMAND_TYPE.throwIn, cardIds: [card.id] }
    }

    return null
  }

  private pickAttackCard(hand: Card[], trumpSuit: Card["suit"]): GameCommand {
    const nonTrump = hand.filter((card) => card.suit !== trumpSuit)
    const pool = nonTrump.length > 0 ? nonTrump : hand
    const card = this.pickLowestCard(pool)
    return { type: GAME_COMMAND_TYPE.attack, cardId: card.id }
  }

  private pickDefenseCard(
    hand: Card[],
    attack: Card,
    trumpSuit: Card["suit"],
    rules: EngineContainer["rules"],
  ): Card | null {
    const candidates = hand
      .filter((card) => rules.canBeat(attack, card, trumpSuit))
      .sort((a, b) => this.compareDefensePreference(a, b, trumpSuit))

    return candidates[0] ?? null
  }

  private compareDefensePreference(a: Card, b: Card, trumpSuit: Card["suit"]): number {
    const aIsTrump = a.suit === trumpSuit ? 1 : 0
    const bIsTrump = b.suit === trumpSuit ? 1 : 0
    if (aIsTrump !== bIsTrump) return aIsTrump - bIsTrump
    return RANK_VALUES[a.rank] - RANK_VALUES[b.rank]
  }

  private pickLowestCard(hand: Card[]): Card {
    return [...hand].sort((a, b) => RANK_VALUES[a.rank] - RANK_VALUES[b.rank])[0]!
  }
}
