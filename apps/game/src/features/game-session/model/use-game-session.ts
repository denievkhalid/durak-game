import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"

import { fetchGameSnapshot, type GameSnapshot } from "@/features/create-game/api/game-api"
import { useGameStore } from "@/features/game-model"
import { GAME_STATUS } from "@/shared/config/game-status"
import { getAccessToken } from "@/shared/lib/auth-token"
import { showToast } from "@/shared/ui"
import {
  disconnectGameSocket,
  getGameSocket,
  joinGameSocketRoom,
  SOCKET_CONNECTION_TIMEOUT_ERROR,
} from "../lib/game-socket"
import type {
  GameLobbyPayload,
  GameOpponentLeftPayload,
  GameUpdatePayload,
} from "../lib/game-socket.types"

const OPPONENT_LEFT_TOAST_MESSAGE = "Соперник отключился"
const GAME_SOCKET_JOIN_ERROR = "Не удалось подключиться к игре через socket"

export function useGameSession(gameId: string | undefined) {
  const queryClient = useQueryClient()
  const applyServerView = useGameStore((store) => store.applyServerView)
  const resetSession = useGameStore((store) => store.resetSession)
  const setError = useGameStore((store) => store.setError)
  const clearError = useGameStore((store) => store.clearError)

  const query = useQuery({
    queryKey: ["game", gameId],
    queryFn: () => fetchGameSnapshot(gameId!),
    enabled: Boolean(gameId) && Boolean(getAccessToken()),
    refetchInterval: (query) =>
      query.state.data?.status === GAME_STATUS.finished ? false : 1000,
  })

  useEffect(() => {
    if (!query.data?.view) {
      return
    }

    applyServerView(query.data.view)
  }, [applyServerView, query.data])

  useEffect(() => {
    if (!gameId || !getAccessToken()) {
      return
    }

    const socket = getGameSocket()
    let isDisposed = false

    const handleUpdate = (payload: GameUpdatePayload) => {
      if (isDisposed) {
        return
      }
      applyServerView(payload.view)
    }

    const handleLobby = (payload: GameLobbyPayload) => {
      if (isDisposed) {
        return
      }

      if (payload.gameId !== gameId) {
        return
      }

      queryClient.setQueryData<GameSnapshot>(["game", gameId], (current) => {
        if (!current) {
          return current
        }

        return {
          ...current,
          status: payload.status,
          participantIds: payload.participantIds,
        }
      })

      void queryClient.invalidateQueries({ queryKey: ["game", gameId] })
    }

    const handleOpponentLeft = (payload: GameOpponentLeftPayload) => {
      if (isDisposed) {
        return
      }

      const currentView =
        useGameStore.getState().view ??
        queryClient.getQueryData<GameSnapshot>(["game", gameId])?.view
      const selfPlayerId = currentView?.players.find((player) => Array.isArray(player.hand))?.id
      if (selfPlayerId && payload.userId === selfPlayerId) {
        return
      }

      showToast(OPPONENT_LEFT_TOAST_MESSAGE)
    }

    const joinRoom = () => {
      void joinGameSocketRoom(gameId).then((response) => {
        if (isDisposed) {
          return
        }

        if (response.ok) {
          clearError()
          void queryClient.invalidateQueries({ queryKey: ["game", gameId] })
          return
        }

        if (
          response.error === SOCKET_CONNECTION_TIMEOUT_ERROR &&
          socket.connected
        ) {
          return
        }

        setError(response.error ?? GAME_SOCKET_JOIN_ERROR)
      })
    }

    const handleConnect = () => {
      joinRoom()
    }

    socket.on("connect", handleConnect)
    socket.on("game:update", handleUpdate)
    socket.on("game:lobby", handleLobby)
    socket.on("game:opponent-left", handleOpponentLeft)

    joinRoom()

    return () => {
      isDisposed = true
      socket.off("connect", handleConnect)
      socket.off("game:update", handleUpdate)
      socket.off("game:lobby", handleLobby)
      socket.off("game:opponent-left", handleOpponentLeft)
      disconnectGameSocket()
      resetSession()
    }
  }, [applyServerView, clearError, gameId, queryClient, resetSession, setError])

  return query
}

