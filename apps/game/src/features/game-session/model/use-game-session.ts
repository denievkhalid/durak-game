import { useEffect, useState } from "react"

import { useGameStore } from "@/features/game-model"
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
  GameSessionSnapshot,
  GameUpdatePayload,
} from "../lib/game-socket.types"

const OPPONENT_LEFT_TOAST_MESSAGE = "Соперник отключился"
const GAME_SOCKET_JOIN_ERROR = "Не удалось подключиться к игре через socket"

type GameSessionState = {
  data: GameSessionSnapshot | null
  isLoading: boolean
  isError: boolean
  error: Error | null
}

export function useGameSession(gameId: string | undefined) {
  const hasAccessToken = Boolean(getAccessToken())
  const applyServerView = useGameStore((store) => store.applyServerView)
  const resetSession = useGameStore((store) => store.resetSession)
  const setError = useGameStore((store) => store.setError)
  const clearError = useGameStore((store) => store.clearError)
  const [session, setSession] = useState<GameSessionState>({
    data: null,
    isLoading: Boolean(gameId) && hasAccessToken,
    isError: false,
    error: null,
  })

  useEffect(() => {
    if (!gameId || !hasAccessToken) {
      setSession({
        data: null,
        isLoading: false,
        isError: false,
        error: null,
      })
    }
  }, [gameId, hasAccessToken])

  useEffect(() => {
    if (!gameId || !hasAccessToken) {
      return
    }

    const socket = getGameSocket()
    let isDisposed = false

    const applySnapshot = (snapshot: GameSessionSnapshot) => {
      if (snapshot.view) {
        applyServerView(snapshot.view)
      }

      setSession({
        data: snapshot,
        isLoading: false,
        isError: false,
        error: null,
      })
    }

    const setJoinError = (message: string) => {
      setError(message)
      setSession((current) => ({
        data: current.data,
        isLoading: false,
        isError: true,
        error: new Error(message),
      }))
    }

    const handleUpdate = (payload: GameUpdatePayload) => {
      if (isDisposed) {
        return
      }

      applyServerView(payload.view)
      setSession((current) => {
        if (!current.data) {
          return {
            data: null,
            isLoading: false,
            isError: false,
            error: null,
          }
        }

        return {
          data: {
            ...current.data,
            view: payload.view,
          },
          isLoading: false,
          isError: false,
          error: null,
        }
      })
    }

    const handleLobby = (payload: GameLobbyPayload) => {
      if (isDisposed) {
        return
      }

      if (payload.gameId !== gameId) {
        return
      }

      setSession((current) => {
        const nextData: GameSessionSnapshot = {
          id: gameId,
          status: payload.status,
          participantIds: payload.participantIds,
          view: current.data?.view ?? null,
        }

        if (current.data?.joinCode !== undefined) {
          nextData.joinCode = current.data.joinCode
        }

        return {
          ...current,
          data: nextData,
          isLoading: false,
          isError: false,
          error: null,
        }
      })
    }

    const handleOpponentLeft = (payload: GameOpponentLeftPayload) => {
      if (isDisposed) {
        return
      }

      const currentView = useGameStore.getState().view
      const selfPlayerId = currentView?.players.find((player) => Array.isArray(player.hand))?.id
      if (selfPlayerId && payload.userId === selfPlayerId) {
        return
      }

      showToast(OPPONENT_LEFT_TOAST_MESSAGE)
    }

    const joinRoom = () => {
      setSession((current) => ({
        ...current,
        isLoading: current.data === null,
        isError: false,
        error: null,
      }))

      void joinGameSocketRoom(gameId).then((response) => {
        if (isDisposed) {
          return
        }

        if (response.ok) {
          clearError()
          applySnapshot(response.snapshot)
          return
        }

        if (
          response.error === SOCKET_CONNECTION_TIMEOUT_ERROR &&
          socket.connected
        ) {
          return
        }

        setJoinError(response.error ?? GAME_SOCKET_JOIN_ERROR)
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
  }, [applyServerView, clearError, gameId, hasAccessToken, resetSession, setError])

  return session
}

