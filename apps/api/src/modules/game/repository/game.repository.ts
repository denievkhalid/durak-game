import type { HydratedDocument } from "mongoose"
import { Types } from "mongoose"
import type { GameState } from "@durakjs/engine"

import {
  GAME_LIMITS,
  GAME_STATUS,
  GameModel,
  applyState,
  buildLobbyPayload,
  toGameState,
  type Game,
} from "../../../entities/game"

export type GameDocument = HydratedDocument<Game>

function isValidObjectId(id: string): boolean {
  return Types.ObjectId.isValid(id) && new Types.ObjectId(id).toString() === id
}

export class GameRepository {
  async createLobby(creatorUserId: string): Promise<GameDocument> {
    return GameModel.create(buildLobbyPayload(creatorUserId))
  }

  async createPrivateLobby(
    creatorUserId: string,
    joinCode: string,
    passwordHash: string,
  ): Promise<GameDocument> {
    return GameModel.create({
      ...buildLobbyPayload(creatorUserId),
      visibility: "private",
      joinCode,
      passwordHash,
    })
  }

  async createRematchLobby(
    originalGameId: string,
    creatorUserId: string,
    opponentUserId: string,
    expiresAt: Date,
  ): Promise<GameDocument> {
    return GameModel.create({
      ...buildLobbyPayload(creatorUserId),
      rematchOfGameId: originalGameId,
      rematchOpponentId: opponentUserId,
      rematchExpiresAt: expiresAt,
    })
  }

  async findById(id: string): Promise<GameDocument | null> {
    if (!isValidObjectId(id)) {
      return null
    }

    return GameModel.findById(id)
  }

  async findByJoinCode(joinCode: string): Promise<GameDocument | null> {
    return GameModel.findOne({
      joinCode,
      visibility: "private",
      status: GAME_STATUS.waiting,
    })
  }

  async findPendingRematch(originalGameId: string): Promise<GameDocument | null> {
    return GameModel.findOne({
      status: GAME_STATUS.waiting,
      rematchOfGameId: originalGameId,
      rematchExpiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 })
  }

  async findOpenLobbies(limit: number, excludeUserId: string): Promise<GameDocument[]> {
    return GameModel.find({
      status: GAME_STATUS.waiting,
      visibility: "public",
      creatorId: { $ne: excludeUserId },
      rematchOfGameId: null,
      $expr: { $lt: [{ $size: "$participantIds" }, GAME_LIMITS.maxPlayers] },
    })
      .sort({ updatedAt: -1 })
      .limit(limit)
  }

  async deleteById(id: string): Promise<void> {
    await GameModel.findByIdAndDelete(id)
  }

  toGameState(game: Game): GameState {
    return toGameState(game)
  }

  async saveState(game: GameDocument, state: GameState): Promise<GameDocument> {
    applyState(game, state)
    return game.save()
  }
}
