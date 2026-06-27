import { useNavigate } from "react-router-dom"

import { AuthStatus } from "@/features/auth"
import { useGameStore } from "@/features/game-model"
import { useGameActions } from "@/features/game-actions"
import { useCreateGame } from "@/features/create-game"
import { GameBoard } from "@/widgets/game-board"
import { Button } from "@/shared/ui"
import { ROUTES } from "@/shared/config/routes"
import { getApiErrorMessage } from "@/shared/lib/api-error"

export function HomePage() {
  const navigate = useNavigate()
  const view = useGameStore((store) => store.view)
  const error = useGameStore((store) => store.error)
  const { startGame, clearError } = useGameActions()
  const createGame = useCreateGame()

  if (view) {
    return (
      <div className="h-dvh overflow-hidden">
        {error && (
          <div
            className="fixed top-4 left-1/2 z-50 -translate-x-1/2 cursor-pointer rounded-lg bg-red-900/90 px-4 py-2 text-sm text-red-100"
            onClick={clearError}
          >
            {error}
          </div>
        )}
        <GameBoard view={view} />
      </div>
    )
  }

  const createGameError = createGame.error
    ? getApiErrorMessage(createGame.error, "Не удалось создать игру")
    : null

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 overflow-y-auto px-6 py-8">
      <h1 className="text-3xl font-bold text-white">Дурак</h1>
      <p className="text-slate-400">Подкидной · 1 на 1</p>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
        <Button onClick={() => createGame.mutate()} disabled={createGame.isPending}>
          {createGame.isPending ? "Создание…" : "Создать игру"}
        </Button>
        <Button variant="secondary" onClick={() => navigate(ROUTES.lobby)}>
          Лобби
        </Button>
        <Button variant="secondary" onClick={startGame}>
          Локальная игра с ботом
        </Button>
      </div>
      <AuthStatus />
      {createGameError && <p className="text-sm text-red-400">{createGameError}</p>}
      {error && (
        <p className="cursor-pointer text-sm text-red-400" onClick={clearError}>
          {error}
        </p>
      )}
    </div>
  )
}
