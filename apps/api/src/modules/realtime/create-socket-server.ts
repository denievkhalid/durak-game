import type { Server as HttpServer } from "node:http"
import { Server } from "socket.io"

import { env } from "../../shared/config/env"
import { authenticateSocket } from "../../shared/middleware/socket-auth.middleware"
import type { GameService } from "../game/service/game.service"
import { registerGameHandlers } from "./handlers/game.handler"

export function createSocketServer(httpServer: HttpServer, gameService: GameService): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN,
      credentials: true,
    },
  })

  io.use((socket, next) => {
    try {
      authenticateSocket(socket)
      next()
    } catch (error) {
      next(error instanceof Error ? error : new Error("Unauthorized"))
    }
  })

  registerGameHandlers(io, gameService)
  gameService.setSocketServer(io)

  return io
}
