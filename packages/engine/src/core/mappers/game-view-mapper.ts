import {
  RANK_VALUES,
  type Card,
  type CardDTO,
  type GameState,
  type GameViewDTO,
  type LegalMoveDTO,
  type Player,
  type PlayerViewDTO,
} from "../types"
import { toCardDTO } from "../factories/card-factory"

export function toGameViewDTO(
  state: GameState,
  viewerId: string,
  legalMoves: LegalMoveDTO[] = [],
  message: string | null = null,
): GameViewDTO {
  return {
    players: state.players.map((player, index) =>
      toPlayerViewDTO(player, index, state, viewerId),
    ),
    table: state.table.map((pair) => ({
      attack: toCardDTO(pair.attack),
      defense: pair.defense ? toCardDTO(pair.defense) : null,
    })),
    trump: toCardDTO(state.trump),
    deckCount: state.deck.length,
    discardCount: state.discard.length,
    phase: state.phase,
    currentPlayerId: state.currentPlayerId,
    legalMoves,
    winnerId: state.winnerId,
    loserId: state.loserId,
    message,
  }
}

function toPlayerViewDTO(
  player: Player,
  index: number,
  state: GameState,
  viewerId: string,
): PlayerViewDTO {
  const isViewer = player.id === viewerId

  return {
    id: player.id,
    name: player.name,
    hand: isViewer
      ? sortHand(player.hand).map(toCardDTO)
      : { count: player.hand.length },
    isAttacker: index === state.attackerIndex,
    isDefender: index === state.defenderIndex,
    isBot: player.isBot,
  }
}

function sortHand(hand: Card[]): Card[] {
  return [...hand].sort((a, b) => {
    const rankDiff = RANK_VALUES[a.rank] - RANK_VALUES[b.rank]
    if (rankDiff !== 0) return rankDiff
    return a.suit.localeCompare(b.suit)
  })
}

export function toCardDTOs(cards: Card[]): CardDTO[] {
  return cards.map(toCardDTO)
}
