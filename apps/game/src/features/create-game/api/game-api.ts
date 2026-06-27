import type { GameViewDTO } from "@durakjs/engine"
import { httpClient } from "@/shared/api/http-client"
import type { GameStatus } from "@/shared/config/game-status"

export type CreateLobbyResponse = {
  id: string
  status: GameStatus
  participantIds: string[]
  joinCode?: string | null
}

export type GameSnapshot = {
  id: string
  status: GameStatus
  participantIds: string[]
  joinCode?: string | null
  view: GameViewDTO | null
}

export type RematchResponse =
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

export async function createLobby(): Promise<CreateLobbyResponse> {
  const { data } = await httpClient.post<CreateLobbyResponse>("/games")
  return data
}

export async function createPrivateLobby(password: string): Promise<CreateLobbyResponse> {
  const { data } = await httpClient.post<CreateLobbyResponse>("/games/private", { password })
  return data
}

export async function joinPrivateLobby(
  joinCode: string,
  password: string,
): Promise<CreateLobbyResponse> {
  const { data } = await httpClient.post<CreateLobbyResponse>("/games/private/join", {
    joinCode,
    password,
  })
  return data
}

export async function fetchGameSnapshot(gameId: string): Promise<GameSnapshot> {
  const { data } = await httpClient.get<GameSnapshot>(`/games/${gameId}`)
  return data
}

export async function requestRematch(gameId: string): Promise<RematchResponse> {
  const { data } = await httpClient.post<RematchResponse>(`/games/${gameId}/rematch`)
  return data
}
