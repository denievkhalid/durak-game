import { Link } from "react-router-dom"
import { isAxiosError } from "axios"

import { useGameStore } from "@/features/game-model"
import { useGameActions } from "@/features/game-actions"
import { useGameSession } from "@/features/game-session"
import { GameBoard } from "@/widgets/game-board"
import { AUTH_TYPE, GAME_ID_PARAM, ROUTES } from "@/shared/config/routes"
import { GAME_STATUS } from "@/shared/config/game-status"
import { getApiErrorMessage } from "@/shared/lib/api-error"
import { getAccessToken } from "@/shared/lib/auth-token"
import { useParams } from "react-router-dom"

const GAME_NOT_FOUND_ERROR = "Game not found"

function isNotFoundError(error: unknown): boolean {
  return (
    (isAxiosError(error) && error.response?.status === 404) ||
    (error instanceof Error && error.message === GAME_NOT_FOUND_ERROR)
  )
}

export function GamePage() {
  const params = useParams<Record<string, string | undefined>>()
  const gameId = params[GAME_ID_PARAM]
  const view = useGameStore((store) => store.view)
  const error = useGameStore((store) => store.error)
  const { clearError } = useGameActions()
  const gameSession = useGameSession(gameId)

  if (!gameId) {
    return (
      <div className="flex h-dvh items-center justify-center text-slate-400">
        Некорректная ссылка на игру
      </div>
    )
  }

  if (!getAccessToken()) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 px-6">
        <p className="text-lg text-white">Войдите, чтобы подключиться к игре</p>
        <Link
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          to={ROUTES.auth(AUTH_TYPE.login)}
        >
          Войти
        </Link>
      </div>
    )
  }

  if (gameSession.isLoading) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-3 px-6">
        <p className="text-lg text-white">Загрузка игры…</p>
        <p className="font-mono text-sm text-slate-400">{gameId}</p>
      </div>
    )
  }

  if (gameSession.isError) {
    if (isNotFoundError(gameSession.error)) {
      return (
        <div className="flex h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
          <img
            alt=""
            className="w-full max-w-xs"
            src="/game-not-found.png"
          />
          <div className="space-y-2">
            <p className="text-2xl font-bold text-white">Игра не найдена</p>
            <p className="max-w-sm text-sm text-slate-400">
              Возможно, ссылка устарела или игра была удалена.
            </p>
          </div>
          <Link className="text-emerald-400 hover:text-emerald-300" to={ROUTES.home}>
            На главную
          </Link>
        </div>
      )
    }

    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-3 px-6">
        <p className="text-lg text-white">Не удалось загрузить игру</p>
        <p className="text-sm text-red-400">
          {getApiErrorMessage(gameSession.error, "Ошибка загрузки")}
        </p>
        <Link className="text-emerald-400 hover:text-emerald-300" to={ROUTES.home}>
          На главную
        </Link>
      </div>
    )
  }

  if (!view && gameSession.data?.status === GAME_STATUS.waiting) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-3 px-6">
        <p className="text-lg text-white">Ожидание соперника…</p>
        <p className="text-sm text-slate-400">
          {gameSession.data.participantIds.length} / 2
        </p>
        {gameSession.data.joinCode && (
          <p className="rounded-lg bg-slate-800/80 px-3 py-2 font-mono text-sm text-emerald-300">
            Код: {gameSession.data.joinCode}
          </p>
        )}
        <p className="font-mono text-xs text-slate-500">{gameId}</p>
      </div>
    )
  }

  if (!view) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-3 px-6">
        <p className="text-lg text-white">Подключение к игре…</p>
        <p className="font-mono text-sm text-slate-400">{gameId}</p>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    )
  }

  return (
    <div className="h-dvh overflow-hidden">
      {error && (
        <p
          className="fixed top-4 left-1/2 z-50 -translate-x-1/2 cursor-pointer rounded-lg bg-red-900/90 px-4 py-2 text-sm text-red-100"
          onClick={clearError}
        >
          {error}
        </p>
      )}
      <GameBoard view={view} gameId={gameId} />
    </div>
  )
}
