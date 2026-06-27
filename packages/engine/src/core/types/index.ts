import { type Card, type Rank, type Suit } from "./card"

export const SUITS = ["clubs", "diamonds", "hearts", "spades"] as const
export const RANKS = ["6", "7", "8", "9", "10", "jack", "queen", "king", "ace"] as const

export const RANK_VALUES: Record<Rank, number> = {
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10,
  jack: 11,
  queen: 12,
  king: 13,
  ace: 14,
}

export const HAND_SIZE = 6
export const MAX_TABLE_PAIRS = 6
export const DECK_SIZE = 36

export const HUMAN_PLAYER_ID = "human"
export const BOT_PLAYER_ID = "bot"

export type GamePhase = "attack" | "defend" | "throw_in" | "dealing" | "finished"

export const GAME_PHASE = {
  attack: "attack",
  defend: "defend",
  throwIn: "throw_in",
  dealing: "dealing",
  finished: "finished",
} as const satisfies Record<string, GamePhase>

export const GAME_COMMAND_TYPE = {
  attack: "attack",
  defend: "defend",
  throwIn: "throw_in",
  take: "take",
  pass: "pass",
} as const

export const SUIT_SYMBOLS: Record<Suit, string> = {
  clubs: "♣",
  diamonds: "♦",
  hearts: "♥",
  spades: "♠",
}

export type TablePair = {
  attack: Card
  defense: Card | null
}

export type Player = {
  id: string
  name: string
  hand: Card[]
  isBot: boolean
}

export type GameState = {
  players: Player[]
  deck: Card[]
  trump: Card
  discard: Card[]
  table: TablePair[]
  phase: GamePhase
  attackerIndex: number
  defenderIndex: number
  currentPlayerId: string
  winnerId: string | null
  loserId: string | null
}

export type GameMode = "podkidnoy"

export type CreateGamePlayerDTO = {
  id: string
  name: string
  isBot?: boolean
}

export type CreateGameDTO = {
  mode: GameMode
  players: [CreateGamePlayerDTO, CreateGamePlayerDTO]
}

export type LegalMoveDTO = {
  command: GameCommand
  cardId?: string
  pairIndex?: number
}

export type GameCommand =
  | { type: "attack"; cardId: string }
  | { type: "defend"; cardId: string; pairIndex: number }
  | { type: "throw_in"; cardIds: string[] }
  | { type: "take" }
  | { type: "pass" }

export type CardDTO = {
  id: string
  suit: Suit
  rank: Rank
}

export type TablePairDTO = {
  attack: CardDTO
  defense: CardDTO | null
}

export type PlayerHandViewDTO = CardDTO[] | { count: number }

export type PlayerViewDTO = {
  id: string
  name: string
  email?: string | null
  hand: PlayerHandViewDTO
  isAttacker: boolean
  isDefender: boolean
  isBot: boolean
}

export type GameViewDTO = {
  players: PlayerViewDTO[]
  table: TablePairDTO[]
  trump: CardDTO
  deckCount: number
  discardCount: number
  phase: GamePhase
  currentPlayerId: string
  legalMoves: LegalMoveDTO[]
  turnDeadlineAt?: string | null
  turnDurationSeconds?: number
  winnerId: string | null
  loserId: string | null
  message: string | null
}

export type PlayCardDTO = {
  playerId: string
  cardId: string
  pairIndex?: number
}

export type WorkflowResult<TState, TView> =
  | { ok: true; state: TState; view: TView; events: DomainEvent[] }
  | { ok: false; error: GameError }

export type GameError = {
  code: GameErrorCode
  message: string
}

export type GameErrorCode =
  | "INVALID_PHASE"
  | "CARD_NOT_IN_HAND"
  | "ILLEGAL_MOVE"
  | "NOT_YOUR_TURN"
  | "GAME_FINISHED"
  | "PAIR_NOT_FOUND"
  | "PAIR_ALREADY_DEFENDED"

export type DomainEvent =
  | { type: "game.started"; payload: { gameId: string } }
  | { type: "card.played"; payload: { playerId: string; card: CardDTO } }
  | { type: "card.defended"; payload: { playerId: string; card: CardDTO; pairIndex: number } }
  | { type: "round.passed"; payload: { attackerId: string } }
  | { type: "cards.taken"; payload: { playerId: string; count: number } }
  | { type: "cards.dealt"; payload: { deals: { playerId: string; card: CardDTO }[] } }
  | { type: "game.ended"; payload: { winnerId: string; loserId: string } }

export type { Card, Rank, Suit } from "./card"
