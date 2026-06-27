import type { GameError, GameErrorCode } from "../types"

export function createGameError(code: GameErrorCode, message: string): GameError {
  return { code, message }
}

export function fail(
  code: GameErrorCode,
  message: string,
): { ok: false; error: GameError } {
  return { ok: false, error: createGameError(code, message) }
}
