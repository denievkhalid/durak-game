import {
  createEngineContainer,
  executeCommandWorkflow,
  forfeitGameWorkflow,
  getLegalMoves,
  startGameWorkflow,
  surrenderGameWorkflow,
  toGameViewDTO,
  type CreateGamePlayerDTO,
  type GameCommand,
  type GameState,
  type GameViewDTO,
} from "@durakjs/engine"
import type { Server } from "socket.io"

import {
  GAME_LIMITS,
  GAME_MODE,
  GAME_ROOM_PREFIX,
  GAME_STATUS,
  TURN_TIMER_SECONDS,
  type GameStatus,
} from "../../../entities/game"
import type { GameDocument } from "../../../entities/game/lib/game.mapper"
import { AppError } from "../../../shared/errors/app-error"
import { NotFoundError } from "../../../shared/errors/not-found-error"
import { hashPassword, verifyPassword } from "../../../shared/lib/password"
import { UserRepository } from "../../auth/repository/user.repository"
import { GameRepository } from "../repository/game.repository"

type LobbySnapshot = {
  id: string
  status: GameStatus
  participantIds: string[]
  joinCode?: string | null
}

export type WaitingLobbyDTO = {
  id: string
  status: typeof GAME_STATUS.waiting
  participants: { id: string; name: string }[]
  slotsAvailable: number
  createdAt: string
}

type JoinGameResult = LobbySnapshot & {
  started: boolean
  view: GameViewDTO | null
}

type RematchResult =
  | {
      status: "pending"
      gameId: string
      requesterId: string
      opponentId: string
      expiresAt: string
    }
  | {
      status: "started"
      gameId: string
    }

const REMATCH_TIMEOUT_MS = 30_000

export class GameService {
  private readonly container = createEngineContainer(GAME_MODE.podkidnoy)
  private readonly repository: GameRepository
  private readonly userRepository: UserRepository
  private io: Server | null = null
  private readonly rematchTimers = new Map<string, ReturnType<typeof setTimeout>>()

  constructor(repository: GameRepository, userRepository: UserRepository) {
    this.repository = repository
    this.userRepository = userRepository
  }

  setSocketServer(io: Server): void {
    this.io = io
  }

  async createLobby(creatorUserId: string): Promise<LobbySnapshot> {
    const user = await this.userRepository.findById(creatorUserId)
    if (!user) {
      throw new NotFoundError("User not found")
    }

    const game = await this.repository.createLobby(creatorUserId)

    return {
      id: game.id,
      status: game.status,
      participantIds: game.participantIds,
      joinCode: game.joinCode,
    }
  }

  async createPrivateLobby(creatorUserId: string, password: string): Promise<LobbySnapshot> {
    const user = await this.userRepository.findById(creatorUserId)
    if (!user) {
      throw new NotFoundError("User not found")
    }

    const normalizedPassword = password.trim()
    if (normalizedPassword.length < 4) {
      throw new AppError("Password must be at least 4 characters", 400)
    }

    const passwordHash = await hashPassword(normalizedPassword)
    const joinCode = await this.generateUniqueJoinCode()
    const game = await this.repository.createPrivateLobby(
      creatorUserId,
      joinCode,
      passwordHash,
    )

    return {
      id: game.id,
      status: game.status,
      participantIds: game.participantIds,
      joinCode: game.joinCode,
    }
  }

  async listWaitingLobbies(limit: number, userId: string): Promise<WaitingLobbyDTO[]> {
    const games = await this.repository.findOpenLobbies(limit, userId)

    return Promise.all(
      games.map(async (game) => {
        const users = await this.userRepository.findByIds(game.participantIds)
        const usersById = new Map(users.map((user) => [user.id, user.name]))

        return {
          id: game.id,
          status: GAME_STATUS.waiting,
          participants: game.participantIds.map((id) => ({
            id,
            name: usersById.get(id) ?? "Unknown",
          })),
          slotsAvailable: GAME_LIMITS.maxPlayers - game.participantIds.length,
          createdAt: game.createdAt.toISOString(),
        }
      }),
    )
  }

  async joinGame(
    gameId: string,
    userId: string,
    options: { allowPrivateJoin?: boolean } = {},
  ): Promise<JoinGameResult> {
    const user = await this.userRepository.findById(userId)
    if (!user) {
      throw new NotFoundError("User not found")
    }

    const game = await this.repository.findById(gameId)
    if (!game) {
      throw new NotFoundError("Game not found")
    }

    if (
      game.visibility === "private" &&
      game.status === GAME_STATUS.waiting &&
      !game.participantIds.includes(userId) &&
      !options.allowPrivateJoin
    ) {
      throw new AppError("Password is required to join this game", 403)
    }

    await this.expireGameIfTimedOut(game)

    if (game.status === GAME_STATUS.finished) {
      this.assertParticipant(game.participantIds, userId)

      const joinResult: JoinGameResult = {
        id: game.id,
        status: game.status,
        participantIds: game.participantIds,
        joinCode: game.joinCode,
        started: true,
        view: game.state ? await this.buildView(game, userId) : null,
      }

      await this.publishLobbyUpdate(gameId, joinResult)

      return joinResult
    }

    if (game.status === GAME_STATUS.active && game.state) {
      this.assertParticipant(game.participantIds, userId)

      const joinResult: JoinGameResult = {
        id: game.id,
        status: game.status,
        participantIds: game.participantIds,
        joinCode: game.joinCode,
        started: true,
        view: await this.buildView(game, userId),
      }

      await this.publishLobbyUpdate(gameId, joinResult)

      return joinResult
    }

    if (!game.participantIds.includes(userId)) {
      if (game.status !== GAME_STATUS.waiting) {
        throw new AppError("Game already started", 400)
      }

      if (game.participantIds.length >= GAME_LIMITS.maxPlayers) {
        throw new AppError("Game is full", 400)
      }

      game.participantIds.push(userId)
    }

    if (
      game.participantIds.length === GAME_LIMITS.minPlayersToStart &&
      game.status === GAME_STATUS.waiting
    ) {
      const players = await this.resolveParticipants(game.participantIds)
      const result = startGameWorkflow({ mode: GAME_MODE.podkidnoy, players }, this.container)

      if (!result.ok) {
        throw new AppError(result.error.message)
      }

      await this.repository.saveState(game, result.state)

      const joinResult: JoinGameResult = {
        id: game.id,
        status: game.status,
        participantIds: game.participantIds,
        joinCode: game.joinCode,
        started: true,
        view: await this.buildView(game, userId),
      }

      await this.publishLobbyUpdate(gameId, joinResult)

      return joinResult
    }

    await game.save()

    const joinResult: JoinGameResult = {
      id: game.id,
      status: game.status,
      participantIds: game.participantIds,
      joinCode: game.joinCode,
      started: false,
      view: null,
    }

    await this.publishLobbyUpdate(gameId, joinResult)

    return joinResult
  }

  async joinPrivateGame(joinCode: string, password: string, userId: string): Promise<LobbySnapshot> {
    const normalizedJoinCode = joinCode.trim().toUpperCase()
    const normalizedPassword = password.trim()

    if (!normalizedJoinCode || !normalizedPassword) {
      throw new AppError("Code and password are required", 400)
    }

    const game = await this.repository.findByJoinCode(normalizedJoinCode)
    if (!game) {
      throw new NotFoundError("Private game not found")
    }

    if (!game.passwordHash) {
      throw new AppError("Private game is misconfigured", 500)
    }

    const hasValidPassword = await verifyPassword(normalizedPassword, game.passwordHash)
    if (!hasValidPassword) {
      throw new AppError("Invalid code or password", 401)
    }

    const result = await this.joinGame(game.id, userId, { allowPrivateJoin: true })

    return {
      id: result.id,
      status: result.status,
      participantIds: result.participantIds,
      joinCode: game.joinCode,
    }
  }

  async getGameSnapshot(gameId: string, userId: string) {
    const game = await this.repository.findById(gameId)
    if (!game) {
      throw new NotFoundError("Game not found")
    }

    await this.expireGameIfTimedOut(game)

    if (!game.participantIds.includes(userId)) {
      if (game.status !== GAME_STATUS.waiting) {
        throw new AppError("Not a game participant", 403)
      }

      return this.joinGame(gameId, userId)
    }

    return {
      id: game.id,
      status: game.status,
      participantIds: game.participantIds,
      joinCode: game.joinCode,
      view: game.state ? await this.buildView(game, userId) : null,
    }
  }

  async requestRematch(originalGameId: string, userId: string): Promise<RematchResult> {
    const originalGame = await this.repository.findById(originalGameId)
    if (!originalGame) {
      throw new NotFoundError("Game not found")
    }

    if (originalGame.status !== GAME_STATUS.finished || !originalGame.state) {
      throw new AppError("Rematch is available only after the game finishes", 400)
    }

    this.assertParticipant(originalGame.participantIds, userId)

    const opponentId = originalGame.participantIds.find((id) => id !== userId)
    if (!opponentId) {
      throw new AppError("Cannot determine rematch opponent", 400)
    }

    const pendingRematch = await this.repository.findPendingRematch(originalGameId)
    if (pendingRematch) {
      if (pendingRematch.creatorId === userId) {
        return this.toPendingRematchResult(pendingRematch)
      }

      if (pendingRematch.rematchOpponentId === userId) {
        return this.acceptRematch(originalGameId, pendingRematch, userId)
      }

      throw new AppError("Rematch already requested", 400)
    }

    const expiresAt = new Date(Date.now() + REMATCH_TIMEOUT_MS)
    const rematch = await this.repository.createRematchLobby(
      originalGameId,
      userId,
      opponentId,
      expiresAt,
    )

    this.scheduleRematchExpiration(originalGameId, rematch.id)

    const result = this.toPendingRematchResult(rematch)
    this.publishRematchUpdate(originalGameId, result)

    return result
  }

  async executeCommand(gameId: string, userId: string, command: GameCommand): Promise<GameState> {
    const game = await this.repository.findById(gameId)
    if (!game) {
      throw new NotFoundError("Game not found")
    }

    if (await this.expireGameIfTimedOut(game)) {
      throw new AppError("Turn timed out", 400)
    }

    if (game.status !== GAME_STATUS.active || !game.state) {
      throw new AppError("Game has not started yet", 400)
    }

    this.assertParticipant(game.participantIds, userId)

    const state = this.repository.toGameState(game)
    const result = executeCommandWorkflow(
      state,
      command,
      userId,
      this.container,
      userId,
    )

    if (!result.ok) {
      throw new AppError(result.error.message)
    }

    await this.repository.saveState(game, result.state)

    return result.state
  }

  async forfeitTurn(gameId: string, userId: string): Promise<GameState> {
    const game = await this.repository.findById(gameId)
    if (!game) {
      throw new NotFoundError("Game not found")
    }

    if (await this.expireGameIfTimedOut(game)) {
      return this.repository.toGameState(game)
    }

    if (game.status !== GAME_STATUS.active || !game.state) {
      throw new AppError("Game has not started yet", 400)
    }

    this.assertParticipant(game.participantIds, userId)

    const state = this.repository.toGameState(game)
    const result = forfeitGameWorkflow(state, userId, this.container, userId)

    if (!result.ok) {
      throw new AppError(result.error.message)
    }

    await this.repository.saveState(game, result.state)

    return result.state
  }

  async surrenderGame(gameId: string, userId: string): Promise<GameState> {
    const game = await this.repository.findById(gameId)
    if (!game) {
      throw new NotFoundError("Game not found")
    }

    if (await this.expireGameIfTimedOut(game)) {
      return this.repository.toGameState(game)
    }

    if (game.status !== GAME_STATUS.active || !game.state) {
      throw new AppError("Game has not started yet", 400)
    }

    this.assertParticipant(game.participantIds, userId)

    const state = this.repository.toGameState(game)
    const result = surrenderGameWorkflow(state, userId, this.container, userId)

    if (!result.ok) {
      throw new AppError(result.error.message)
    }

    await this.repository.saveState(game, result.state)

    return result.state
  }

  async broadcastGameState(io: Server, gameId: string): Promise<void> {
    const game = await this.repository.findById(gameId)
    if (!game?.state) {
      return
    }

    await this.broadcastGameUpdate(io, gameId)
  }

  async broadcastGameUpdate(io: Server, gameId: string): Promise<void> {
    const game = await this.repository.findById(gameId)
    if (!game?.state) {
      return
    }

    const room = this.getRoomName(gameId)
    const sockets = await io.in(room).fetchSockets()

    for (const socket of sockets) {
      const viewerId = socket.data.userId
      if (typeof viewerId !== "string") continue

      socket.emit("game:update", {
        view: await this.buildView(game, viewerId),
      })
    }
  }

  async notifyOpponentLeft(
    io: Server,
    gameId: string,
    userId: string,
    disconnectingSocketId: string,
  ): Promise<void> {
    const game = await this.repository.findById(gameId)
    if (!game || !game.participantIds.includes(userId)) {
      return
    }

    const room = this.getRoomName(gameId)
    const sockets = await io.in(room).fetchSockets()
    const hasAnotherSocketForUser = sockets.some((socket) => {
      const socketUserId = socket.data.userId
      return (
        typeof socketUserId === "string" &&
        socketUserId === userId &&
        socket.id !== disconnectingSocketId
      )
    })

    if (hasAnotherSocketForUser) {
      return
    }

    const opponentSockets = sockets.filter((socket) => {
      const socketUserId = socket.data.userId
      return typeof socketUserId === "string" && socketUserId !== userId
    })

    const pendingRematch = await this.repository.findPendingRematch(gameId)
    if (pendingRematch) {
      await this.repository.deleteById(pendingRematch.id)
      this.clearRematchTimer(pendingRematch.id)
    }

    for (const socket of opponentSockets) {
      socket.emit("game:opponent-left", { userId })
    }
  }

  getRoomName(gameId: string): string {
    return `${GAME_ROOM_PREFIX}${gameId}`
  }

  private async publishLobbyUpdate(gameId: string, result: JoinGameResult): Promise<void> {
    if (!this.io) {
      return
    }

    this.io.to(this.getRoomName(gameId)).emit("game:lobby", {
      gameId,
      status: result.status,
      participantIds: result.participantIds,
    })

    if (result.started) {
      await this.broadcastGameState(this.io, gameId)
    }
  }

  private async acceptRematch(
    originalGameId: string,
    rematch: GameDocument,
    userId: string,
  ): Promise<RematchResult> {
    if (!rematch.participantIds.includes(userId)) {
      rematch.participantIds.push(userId)
    }

    const players = await this.resolveParticipants(rematch.participantIds)
    const result = startGameWorkflow({ mode: GAME_MODE.podkidnoy, players }, this.container)

    if (!result.ok) {
      throw new AppError(result.error.message)
    }

    await this.repository.saveState(rematch, result.state)
    this.clearRematchTimer(rematch.id)

    const rematchResult: RematchResult = {
      status: "started",
      gameId: rematch.id,
    }

    this.publishRematchUpdate(originalGameId, rematchResult)

    return rematchResult
  }

  private toPendingRematchResult(rematch: GameDocument): RematchResult {
    const opponentId = rematch.rematchOpponentId
    const expiresAt = rematch.rematchExpiresAt

    if (!opponentId || !expiresAt) {
      throw new AppError("Invalid rematch state", 500)
    }

    return {
      status: "pending",
      gameId: rematch.id,
      requesterId: rematch.creatorId,
      opponentId,
      expiresAt: expiresAt.toISOString(),
    }
  }

  private publishRematchUpdate(originalGameId: string, result: RematchResult): void {
    this.io?.to(this.getRoomName(originalGameId)).emit("game:rematch", result)
  }

  private scheduleRematchExpiration(originalGameId: string, rematchGameId: string): void {
    this.clearRematchTimer(rematchGameId)

    const timer = setTimeout(() => {
      void this.expireRematch(originalGameId, rematchGameId)
    }, REMATCH_TIMEOUT_MS)

    this.rematchTimers.set(rematchGameId, timer)
  }

  private clearRematchTimer(rematchGameId: string): void {
    const timer = this.rematchTimers.get(rematchGameId)
    if (!timer) {
      return
    }

    clearTimeout(timer)
    this.rematchTimers.delete(rematchGameId)
  }

  private async expireRematch(originalGameId: string, rematchGameId: string): Promise<void> {
    const rematch = await this.repository.findById(rematchGameId)
    if (!rematch || rematch.status !== GAME_STATUS.waiting) {
      this.clearRematchTimer(rematchGameId)
      return
    }

    await this.repository.deleteById(rematchGameId)
    this.clearRematchTimer(rematchGameId)

    this.io?.to(this.getRoomName(originalGameId)).emit("game:rematch", {
      status: "expired",
      gameId: rematchGameId,
    })
  }

  private async generateUniqueJoinCode(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const joinCode = Math.random().toString(36).slice(2, 8).toUpperCase()
      const existing = await this.repository.findByJoinCode(joinCode)
      if (!existing) {
        return joinCode
      }
    }

    throw new AppError("Could not generate private game code", 500)
  }

  private async expireGameIfTimedOut(game: GameDocument): Promise<boolean> {
    if (
      game.status !== GAME_STATUS.active ||
      !game.state ||
      game.state.phase === "finished" ||
      !game.turnDeadlineAt ||
      game.turnDeadlineAt.getTime() > Date.now()
    ) {
      return false
    }

    const state = this.repository.toGameState(game)
    const result = forfeitGameWorkflow(
      state,
      state.currentPlayerId,
      this.container,
      state.currentPlayerId,
    )

    if (!result.ok) {
      throw new AppError(result.error.message)
    }

    await this.repository.saveState(game, result.state)

    if (this.io) {
      await this.broadcastGameUpdate(this.io, game.id)
    }

    return true
  }

  private async buildView(game: GameDocument, viewerId: string): Promise<GameViewDTO> {
    const state = this.repository.toGameState(game)
    const legalMoves = getLegalMoves(state, this.container)
    const view = toGameViewDTO(state, viewerId, legalMoves)
    const withEmails = await this.enrichViewWithPlayerEmails(view)

    return {
      ...withEmails,
      turnDeadlineAt: game.turnDeadlineAt?.toISOString() ?? null,
      turnDurationSeconds: TURN_TIMER_SECONDS,
    }
  }

  private async enrichViewWithPlayerEmails(view: GameViewDTO): Promise<GameViewDTO> {
    const humanPlayerIds = view.players.filter((player) => !player.isBot).map((player) => player.id)
    if (humanPlayerIds.length === 0) {
      return view
    }

    const users = await this.userRepository.findByIds(humanPlayerIds)
    const emailsById = new Map(users.map((user) => [user.id, user.email]))

    return {
      ...view,
      players: view.players.map((player) => ({
        ...player,
        email: player.isBot ? null : emailsById.get(player.id) ?? null,
      })),
    }
  }

  private async resolveParticipants(
    participantIds: string[],
  ): Promise<[CreateGamePlayerDTO, CreateGamePlayerDTO]> {
    const [firstId, secondId] = participantIds

    if (!firstId || !secondId) {
      throw new AppError("Two players are required to start the game", 400)
    }

    const [firstUser, secondUser] = await Promise.all([
      this.userRepository.findById(firstId),
      this.userRepository.findById(secondId),
    ])

    if (!firstUser || !secondUser) {
      throw new NotFoundError("User not found")
    }

    return [
      { id: firstUser.id, name: firstUser.name, isBot: false },
      { id: secondUser.id, name: secondUser.name, isBot: false },
    ]
  }

  private assertParticipant(participantIds: string[], userId: string): void {
    if (!participantIds.includes(userId)) {
      throw new AppError("Not a game participant", 403)
    }
  }
}
