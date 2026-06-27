import type { HydratedDocument } from "mongoose"
import type { GameState } from "@durakjs/engine"

import { GAME_MODE } from "../constants/game-mode"
import { GAME_STATUS } from "../constants/game-status"
import { TURN_TIMER_MS } from "../constants/game-timing"
import type { Game } from "../model/game.model"
import { resolveGameStatus } from "./resolve-game-status"

export type GameDocument = HydratedDocument<Game>
type MongooseState = GameState & {
  toObject?: () => GameState
}

export function toGameState(game: Game): GameState {
  if (!game.state) {
    throw new Error("Game has not started yet")
  }

  const state = game.state as MongooseState

  return typeof state.toObject === "function" ? state.toObject() : state
}

export function buildLobbyPayload(creatorUserId: string): Omit<Game, "createdAt" | "updatedAt"> {
  return {
    mode: GAME_MODE.podkidnoy,
    status: GAME_STATUS.waiting,
    visibility: "public",
    creatorId: creatorUserId,
    participantIds: [creatorUserId],
    joinCode: null,
    passwordHash: null,
    state: null,
    turnDeadlineAt: null,
    rematchOfGameId: null,
    rematchOpponentId: null,
    rematchExpiresAt: null,
  }
}

export function resolveTurnDeadline(state: GameState): Date | null {
  if (state.phase === "finished") {
    return null
  }

  return new Date(Date.now() + TURN_TIMER_MS)
}

export function applyState(game: GameDocument, state: GameState): void {
  game.state = state
  game.status = resolveGameStatus(state)
  game.turnDeadlineAt = resolveTurnDeadline(state)
}
