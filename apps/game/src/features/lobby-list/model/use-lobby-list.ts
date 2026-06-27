import { useQuery } from "@tanstack/react-query"

import { fetchWaitingLobbies } from "../api/lobby-api"

export const LOBBY_LIST_QUERY_KEY = ["lobbies"] as const

export function useLobbyList() {
  return useQuery({
    queryKey: LOBBY_LIST_QUERY_KEY,
    queryFn: fetchWaitingLobbies,
    refetchInterval: 5_000,
  })
}
