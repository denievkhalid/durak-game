import type { GameViewDTO } from "@durakjs/engine"

import type { GameStatus } from "@/shared/config/game-status"

export type GameLobbyPayload = {
  gameId: string
  status: GameStatus
  participantIds: string[]
}

export type GameUpdatePayload = {
  view: GameViewDTO
}

export type GameRematchPayload =
  | {
      status: "pending"
      gameId: string
      requesterId: string
      opponentId: string
      expiresAt: string
    }
  | {
      status: "started"
      gameId: string
    }
  | {
      status: "expired"
      gameId: string
    }

export type GameOpponentLeftPayload = {
  userId: string
}

export type GameSocketAck = {
  ok: boolean
  error?: string
}
