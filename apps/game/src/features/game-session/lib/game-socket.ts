import { io, type Socket } from "socket.io-client"

import { SOCKET_URL } from "@/shared/config/api"
import { getAccessToken } from "@/shared/lib/auth-token"
import type { GameSocketAck } from "./game-socket.types"

let socket: Socket | null = null
const SOCKET_ACK_TIMEOUT_MS = 5000
const NO_RESPONSE_ERROR = "No response"
export const SOCKET_CONNECTION_TIMEOUT_ERROR = "Socket connection timed out"
export const GAME_ROOM_JOIN_TIMEOUT_ERROR = "Game room join timed out"

export function getGameSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      auth: {
        token: getAccessToken() ?? "",
      },
    })
  }

  return socket
}

export function connectGameSocket(): Promise<GameSocketAck> {
  const socket = getGameSocket()
  socket.auth = {
    token: getAccessToken() ?? "",
  }

  if (socket.connected) {
    return Promise.resolve({ ok: true })
  }

  return new Promise((resolve) => {
    const cleanup = () => {
      clearTimeout(timeoutId)
      socket.off("connect", handleConnect)
      socket.off("connect_error", handleConnectError)
    }

    const handleConnect = () => {
      cleanup()
      resolve({ ok: true })
    }

    const handleConnectError = (error: Error) => {
      cleanup()
      resolve({ ok: false, error: error.message })
    }

    const timeoutId = window.setTimeout(() => {
      cleanup()
      resolve({ ok: false, error: SOCKET_CONNECTION_TIMEOUT_ERROR })
    }, SOCKET_ACK_TIMEOUT_MS)

    socket.once("connect", handleConnect)
    socket.once("connect_error", handleConnectError)
    socket.connect()
  })
}

export async function joinGameSocketRoom(gameId: string): Promise<GameSocketAck> {
  const connection = await connectGameSocket()
  if (!connection.ok) {
    return connection
  }

  const socket = getGameSocket()

  return new Promise((resolve) => {
    const timeoutId = window.setTimeout(() => {
      resolve({ ok: false, error: GAME_ROOM_JOIN_TIMEOUT_ERROR })
    }, SOCKET_ACK_TIMEOUT_MS)

    socket.emit("game:join", { gameId }, (response: GameSocketAck) => {
      clearTimeout(timeoutId)
      resolve(response ?? { ok: false, error: NO_RESPONSE_ERROR })
    })
  })
}

export function disconnectGameSocket(): void {
  if (!socket) {
    return
  }

  socket.disconnect()
  socket = null
}
