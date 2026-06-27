import { httpClient } from "@/shared/api/http-client"
import { GAME_STATUS } from "@/shared/config/game-status"

export type WaitingLobby = {
  id: string
  status: typeof GAME_STATUS.waiting
  participants: { id: string; name: string }[]
  slotsAvailable: number
  createdAt: string
}

type WaitingLobbiesResponse = {
  lobbies: WaitingLobby[]
}

export async function fetchWaitingLobbies(): Promise<WaitingLobby[]> {
  const { data } = await httpClient.get<WaitingLobbiesResponse>("/games/lobbies")
  return data.lobbies
}
