import type { GameCommand } from "@durakjs/engine"

import type { GameActionSocketAck } from "./game-socket.types"
import { ensureGameSocketRoom, getGameSocket } from "./game-socket"

const COMMAND_ACK_TIMEOUT_MS = 5000

function emitWithAck(
  event: "game:command" | "game:forfeit" | "game:surrender",
  payload: unknown,
): Promise<GameActionSocketAck> {
  const socket = getGameSocket()

  return new Promise((resolve) => {
    const timeoutId = window.setTimeout(() => {
      resolve({ ok: false, error: "Socket response timed out" })
    }, COMMAND_ACK_TIMEOUT_MS)

    socket.emit(event, payload, (response: GameActionSocketAck) => {
      clearTimeout(timeoutId)
      resolve(response ?? { ok: false, error: "No response" })
    })
  })
}

export async function emitGameCommand(
  gameId: string,
  command: GameCommand,
): Promise<GameActionSocketAck> {
  const joinResult = await ensureGameSocketRoom(gameId)
  if (!joinResult.ok) {
    return joinResult
  }

  return emitWithAck("game:command", { gameId, command })
}

export async function emitGameForfeit(gameId: string): Promise<GameActionSocketAck> {
  const joinResult = await ensureGameSocketRoom(gameId)
  if (!joinResult.ok) {
    return joinResult
  }

  return emitWithAck("game:forfeit", { gameId })
}

export async function emitGameSurrender(gameId: string): Promise<GameActionSocketAck> {
  const joinResult = await ensureGameSocketRoom(gameId)
  if (!joinResult.ok) {
    return joinResult
  }

  return emitWithAck("game:surrender", { gameId })
}
