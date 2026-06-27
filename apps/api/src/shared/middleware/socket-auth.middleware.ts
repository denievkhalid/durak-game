import type { Socket } from "socket.io"

import { AppError } from "../errors/app-error"
import { verifyAccessToken } from "../lib/jwt"
import type { AuthUser } from "../types/auth-user"

declare module "socket.io" {
  interface SocketData {
    user?: AuthUser
    userId?: string
    gameId?: string
  }
}

export function authenticateSocket(socket: Socket): AuthUser {
  const token = socket.handshake.auth.token

  if (typeof token !== "string" || token.length === 0) {
    throw new AppError("Authorization token is required", 401)
  }

  const user = verifyAccessToken(token)
  socket.data.user = user
  socket.data.userId = user.id

  return user
}
