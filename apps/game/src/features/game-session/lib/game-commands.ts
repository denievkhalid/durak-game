import type { GameCommand } from "@durakjs/engine"

import type { GameSocketAck } from "./game-socket.types"
import { getGameSocket, joinGameSocketRoom } from "./game-socket"

const COMMAND_ACK_TIMEOUT_MS = 5000

function emitWithAck(
  event: "game:command" | "game:forfeit" | "game:surrender",
  payload: unknown,
): Promise<GameSocketAck> {
  const socket = getGameSocket()

  return new Promise((resolve) => {
    const timeoutId = window.setTimeout(() => {
      resolve({ ok: false, error: "Socket response timed out" })
    }, COMMAND_ACK_TIMEOUT_MS)

    socket.emit(event, payload, (response: GameSocketAck) => {
      clearTimeout(timeoutId)
      resolve(response ?? { ok: false, error: "No response" })
    })
  })
}

export async function emitGameCommand(
  gameId: string,
  command: GameCommand,
): Promise<GameSocketAck> {
  const joinResult = await joinGameSocketRoom(gameId)
  if (!joinResult.ok) {
    return joinResult
  }

  return emitWithAck("game:command", { gameId, command })
}

export async function emitGameForfeit(gameId: string): Promise<GameSocketAck> {
  const joinResult = await joinGameSocketRoom(gameId)
  if (!joinResult.ok) {
    return joinResult
  }

  return emitWithAck("game:forfeit", { gameId })
}

export async function emitGameSurrender(gameId: string): Promise<GameSocketAck> {
  const joinResult = await joinGameSocketRoom(gameId)
  if (!joinResult.ok) {
    return joinResult
  }

  return emitWithAck("game:surrender", { gameId })
}
