import type { GameCommand, GameViewDTO } from "@durakjs/engine"
import type { Server, Socket } from "socket.io"

import type { GameStatus } from "../../../entities/game"
import { AppError } from "../../../shared/errors/app-error"
import type { GameService } from "../../game/service/game.service"

type GameJoinPayload = {
  gameId: string
}

type GameCommandPayload = {
  gameId: string
  command: GameCommand
}

type GameSurrenderPayload = {
  gameId: string
}

type GameForfeitPayload = {
  gameId: string
}

type GameJoinSnapshot = {
  id: string
  status: GameStatus
  participantIds: string[]
  joinCode?: string | null
  view: GameViewDTO | null
}

type GameJoinAckResponse =
  | { ok: true; snapshot: GameJoinSnapshot }
  | { ok: false; error: string }

type GameActionAckResponse =
  | { ok: true }
  | { ok: false; error: string }

function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return "Unexpected error"
}

function getSocketUser(socket: Socket) {
  const user = socket.data.user
  if (!user) {
    throw new AppError("Unauthorized", 401)
  }

  return user
}

async function bindPlayerSocket(
  socket: Socket,
  userId: string,
  gameId: string,
  gameService: GameService,
): Promise<void> {
  socket.data.userId = userId
  socket.data.gameId = gameId
  await socket.join(gameService.getRoomName(gameId))
}

export function registerGameHandlers(io: Server, gameService: GameService): void {
  io.on("connection", (socket) => {
    socket.on(
      "game:join",
      async (payload: GameJoinPayload, ack?: (response: GameJoinAckResponse) => void) => {
        try {
          const user = getSocketUser(socket)

          await bindPlayerSocket(socket, user.id, payload.gameId, gameService)
          const joinResult = await gameService.joinGame(payload.gameId, user.id)
          const snapshot: GameJoinSnapshot = {
            id: joinResult.id,
            status: joinResult.status,
            participantIds: joinResult.participantIds,
            view: joinResult.view,
          }

          if (joinResult.joinCode !== undefined) {
            snapshot.joinCode = joinResult.joinCode
          }

          ack?.({
            ok: true,
            snapshot,
          })
        } catch (error) {
          if (typeof payload?.gameId === "string") {
            await socket.leave(gameService.getRoomName(payload.gameId))
          }

          ack?.({ ok: false, error: getErrorMessage(error) })
        }
      },
    )

    socket.on(
      "game:command",
      async (payload: GameCommandPayload, ack?: (response: GameActionAckResponse) => void) => {
        try {
          getSocketUser(socket)

          const userId = socket.data.userId
          if (typeof userId !== "string") {
            throw new AppError("Join the game before sending commands", 400)
          }

          await gameService.executeCommand(payload.gameId, userId, payload.command)
          await gameService.broadcastGameUpdate(io, payload.gameId)

          ack?.({ ok: true })
        } catch (error) {
          ack?.({ ok: false, error: getErrorMessage(error) })
        }
      },
    )

    socket.on(
      "game:surrender",
      async (payload: GameSurrenderPayload, ack?: (response: GameActionAckResponse) => void) => {
        try {
          getSocketUser(socket)

          const userId = socket.data.userId
          if (typeof userId !== "string") {
            throw new AppError("Join the game before sending commands", 400)
          }

          await gameService.surrenderGame(payload.gameId, userId)
          await gameService.broadcastGameUpdate(io, payload.gameId)

          ack?.({ ok: true })
        } catch (error) {
          ack?.({ ok: false, error: getErrorMessage(error) })
        }
      },
    )

    socket.on(
      "game:forfeit",
      async (payload: GameForfeitPayload, ack?: (response: GameActionAckResponse) => void) => {
        try {
          getSocketUser(socket)

          const userId = socket.data.userId
          if (typeof userId !== "string") {
            throw new AppError("Join the game before sending commands", 400)
          }

          await gameService.forfeitTurn(payload.gameId, userId)
          await gameService.broadcastGameUpdate(io, payload.gameId)

          ack?.({ ok: true })
        } catch (error) {
          ack?.({ ok: false, error: getErrorMessage(error) })
        }
      },
    )

    socket.on("disconnecting", () => {
      const userId = socket.data.userId
      const gameId = socket.data.gameId
      if (typeof userId !== "string" || typeof gameId !== "string") {
        return
      }

      void gameService.notifyOpponentLeft(io, gameId, userId, socket.id)
    })
  })
}
