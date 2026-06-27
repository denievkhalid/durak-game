import { Schema, model } from "mongoose"
import type { GameState } from "@durakjs/engine"

import { GAME_MODE, GAME_MODE_VALUES } from "../constants/game-mode"
import { GAME_STATUS, GAME_STATUS_VALUES } from "../constants/game-status"
import { gameStateSchema } from "../schema/game-state.schema"

export type { GameStatus } from "../constants/game-status"

export type Game = {
  mode: (typeof GAME_MODE)[keyof typeof GAME_MODE]
  status: import("../constants/game-status").GameStatus
  visibility: "public" | "private"
  creatorId: string
  participantIds: string[]
  joinCode: string | null
  passwordHash: string | null
  state: GameState | null
  turnDeadlineAt: Date | null
  rematchOfGameId: string | null
  rematchOpponentId: string | null
  rematchExpiresAt: Date | null
  createdAt: Date
  updatedAt: Date
}

const gameSchema = new Schema<Game>(
  {
    mode: { type: String, enum: GAME_MODE_VALUES, required: true, default: GAME_MODE.podkidnoy },
    status: {
      type: String,
      enum: GAME_STATUS_VALUES,
      required: true,
      default: GAME_STATUS.waiting,
    },
    visibility: {
      type: String,
      enum: ["public", "private"],
      required: true,
      default: "public",
      index: true,
    },
    creatorId: { type: String, required: true, index: true },
    participantIds: { type: [String], default: [] },
    joinCode: { type: String, default: null, index: true },
    passwordHash: { type: String, default: null },
    state: { type: gameStateSchema, default: null },
    turnDeadlineAt: { type: Date, default: null },
    rematchOfGameId: { type: String, default: null, index: true },
    rematchOpponentId: { type: String, default: null, index: true },
    rematchExpiresAt: { type: Date, default: null },
  },
  { timestamps: true },
)

gameSchema.index({ status: 1, creatorId: 1, updatedAt: -1 })
gameSchema.index({ joinCode: 1, visibility: 1, status: 1 })
gameSchema.index({ rematchOfGameId: 1, rematchOpponentId: 1, status: 1 })

export const GameModel = model<Game>("Game", gameSchema)
