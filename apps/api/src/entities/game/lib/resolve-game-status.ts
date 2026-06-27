import { isGameFinished, type GameState } from "@durakjs/engine"

import { GAME_STATUS, type GameStatus } from "../constants/game-status"

export function resolveGameStatus(state: GameState): GameStatus {
  if (isGameFinished(state)) {
    return GAME_STATUS.finished
  }

  return GAME_STATUS.active
}
