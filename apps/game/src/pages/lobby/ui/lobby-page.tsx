import { Link, useNavigate } from "react-router-dom"

import { useLobbyList } from "@/features/lobby-list"
import { Button } from "@/shared/ui"
import { AUTH_TYPE, ROUTES } from "@/shared/config/routes"
import { getApiErrorMessage } from "@/shared/lib/api-error"
import { getAccessToken } from "@/shared/lib/auth-token"

function formatParticipants(participants: { name: string }[]): string {
  if (participants.length === 0) {
    return "Нет игроков"
  }

  return participants.map((participant) => participant.name).join(", ")
}

export function LobbyPage() {
  const navigate = useNavigate()
  const lobbyList = useLobbyList()

  if (!getAccessToken()) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 px-6">
        <p className="text-lg text-white">Войдите, чтобы смотреть лобби</p>
        <Link
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          to={ROUTES.auth(AUTH_TYPE.login)}
        >
          Войти
        </Link>
        <Link className="text-sm text-slate-400 hover:text-slate-300" to={ROUTES.home}>
          На главную
        </Link>
      </div>
    )
  }

  const errorMessage = lobbyList.error
    ? getApiErrorMessage(lobbyList.error, "Не удалось загрузить лобби")
    : null

  return (
    <div className="flex h-dvh flex-col items-center overflow-hidden px-6 py-8">
      <div className="flex w-full max-w-lg flex-col gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-3xl font-bold text-white">Лобби</h1>
          <p className="text-slate-400">Игры, ожидающие соперника</p>
        </div>

        {lobbyList.isLoading && <p className="text-center text-slate-400">Загрузка…</p>}

        {errorMessage && <p className="text-center text-sm text-red-400">{errorMessage}</p>}

        {!lobbyList.isLoading && !errorMessage && lobbyList.data?.length === 0 && (
          <p className="text-center text-slate-400">Сейчас нет открытых игр</p>
        )}

        {lobbyList.data && lobbyList.data.length > 0 && (
          <ul className="flex flex-col gap-3">
            {lobbyList.data.map((lobby) => (
              <li
                key={lobby.id}
                className="flex items-center justify-between gap-4 rounded-xl bg-slate-800/80 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-white">{formatParticipants(lobby.participants)}</p>
                  <p className="text-xs text-slate-400">
                    {lobby.participants.length} / {lobby.participants.length + lobby.slotsAvailable}
                  </p>
                </div>
                <Button
                  className="shrink-0"
                  onClick={() => navigate(ROUTES.game(lobby.id))}
                >
                  Войти
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex justify-center gap-4">
          <Button variant="secondary" onClick={() => lobbyList.refetch()} disabled={lobbyList.isFetching}>
            {lobbyList.isFetching ? "Обновление…" : "Обновить"}
          </Button>
          <Link
            className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
            to={ROUTES.home}
          >
            На главную
          </Link>
        </div>
      </div>
    </div>
  )
}
