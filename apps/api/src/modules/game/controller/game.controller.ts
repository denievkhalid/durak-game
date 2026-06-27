import type { Request, Response } from "express"

import { asyncHandler } from "../../../shared/lib/async-handler"
import { AppError } from "../../../shared/errors/app-error"
import type { GameService } from "../service/game.service"

function getRouteParam(value: string | string[] | undefined, name: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new AppError(`${name} is required`, 400)
  }

  return value
}

function getAuthUser(req: Request) {
  if (!req.user) {
    throw new AppError("Unauthorized", 401)
  }

  return req.user
}

function parseLimit(value: unknown): number {
  if (value === undefined) {
    return 20
  }

  const limit = Number(value)
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    throw new AppError("Invalid limit", 400)
  }

  return limit
}

function getBodyString(value: unknown, name: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new AppError(`${name} is required`, 400)
  }

  return value
}

export class GameController {
  private readonly service: GameService

  constructor(service: GameService) {
    this.service = service
  }

  createLobby = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req)
    const result = await this.service.createLobby(user.id)
    res.status(201).json(result)
  })

  createPrivateLobby = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req)
    const password = getBodyString(req.body?.password, "password")
    const result = await this.service.createPrivateLobby(user.id, password)
    res.status(201).json(result)
  })

  joinPrivateLobby = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req)
    const joinCode = getBodyString(req.body?.joinCode, "joinCode")
    const password = getBodyString(req.body?.password, "password")
    const result = await this.service.joinPrivateGame(joinCode, password, user.id)
    res.json(result)
  })

  listWaitingLobbies = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req)
    const limit = parseLimit(req.query.limit)
    const lobbies = await this.service.listWaitingLobbies(limit, user.id)
    res.json({ lobbies })
  })

  getById = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req)
    const id = getRouteParam(req.params.id, "id")
    const snapshot = await this.service.getGameSnapshot(id, user.id)
    res.json(snapshot)
  })

  requestRematch = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req)
    const id = getRouteParam(req.params.id, "id")
    const result = await this.service.requestRematch(id, user.id)
    res.json(result)
  })
}
