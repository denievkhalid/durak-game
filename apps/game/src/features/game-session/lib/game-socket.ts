import { io, type Socket } from "socket.io-client"

import { SOCKET_URL } from "@/shared/config/api"
import { getAccessToken } from "@/shared/lib/auth-token"
import type { GameJoinSocketAck, GameSocketAck } from "./game-socket.types"

let socket: Socket | null = null
let joinedGameId: string | null = null
const SOCKET_ACK_TIMEOUT_MS = 5000
const NO_RESPONSE_ERROR = "No response"
export const SOCKET_CONNECTION_TIMEOUT_ERROR = "Socket connection timed out"
export const GAME_ROOM_JOIN_TIMEOUT_ERROR = "Game room join timed out"
const SOCKET_LOG_PREFIX_INCOMING = "[socket][incoming]"
const SOCKET_LOG_PREFIX_OUTGOING = "[socket][outgoing]"
const SOCKET_LOG_PREFIX_STATUS = "[socket][status]"

function attachSocketDebugLogging(currentSocket: Socket): void {
  currentSocket.onAny((event, ...args) => {
    console.log(SOCKET_LOG_PREFIX_INCOMING, event, ...args)
  })

  currentSocket.onAnyOutgoing((event, ...args) => {
    console.log(SOCKET_LOG_PREFIX_OUTGOING, event, ...args)
  })

  currentSocket.on("connect", () => {
    console.log(SOCKET_LOG_PREFIX_STATUS, "connected", currentSocket.id)
  })

  currentSocket.on("disconnect", (reason) => {
    console.log(SOCKET_LOG_PREFIX_STATUS, "disconnected", reason)
  })

  currentSocket.on("connect_error", (error) => {
    console.log(SOCKET_LOG_PREFIX_STATUS, "connect_error", error.message)
  })
}

export function getGameSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      auth: {
        token: getAccessToken() ?? "",
      },
    })
    attachSocketDebugLogging(socket)

    socket.on("disconnect", () => {
      joinedGameId = null
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

function emitJoinGame(gameId: string): Promise<GameJoinSocketAck> {
  const socket = getGameSocket()

  return new Promise((resolve) => {
    const timeoutId = window.setTimeout(() => {
      resolve({ ok: false, error: GAME_ROOM_JOIN_TIMEOUT_ERROR })
    }, SOCKET_ACK_TIMEOUT_MS)

    socket.emit("game:join", { gameId }, (response: GameJoinSocketAck) => {
      clearTimeout(timeoutId)

      if (!response) {
        resolve({ ok: false, error: NO_RESPONSE_ERROR })
        return
      }

      if (response.ok) {
        joinedGameId = gameId
      }

      resolve(response)
    })
  })
}

export async function joinGameSocketRoom(gameId: string): Promise<GameJoinSocketAck> {
  const connection = await connectGameSocket()
  if (!connection.ok) {
    return connection
  }

  return emitJoinGame(gameId)
}

export async function ensureGameSocketRoom(gameId: string): Promise<GameSocketAck> {
  const connection = await connectGameSocket()
  if (!connection.ok) {
    return connection
  }

  if (joinedGameId === gameId) {
    return { ok: true }
  }

  const joinResponse = await emitJoinGame(gameId)
  if (!joinResponse.ok) {
    return joinResponse
  }

  return { ok: true }
}

export function disconnectGameSocket(): void {
  if (!socket) {
    return
  }

  joinedGameId = null
  socket.disconnect()
  socket = null
}
