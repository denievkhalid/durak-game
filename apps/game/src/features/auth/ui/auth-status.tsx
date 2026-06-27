import { useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"

import { CURRENT_USER_QUERY_KEY, useCurrentUser } from "../model/use-current-user"
import { Button } from "@/shared/ui"
import { AUTH_TYPE, ROUTES } from "@/shared/config/routes"
import { clearAccessToken, getAccessToken } from "@/shared/lib/auth-token"

export function AuthStatus() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const hasToken = Boolean(getAccessToken())
  const currentUser = useCurrentUser()

  const handleLogout = () => {
    clearAccessToken()
    queryClient.removeQueries({ queryKey: CURRENT_USER_QUERY_KEY })
    navigate(ROUTES.home)
  }

  if (!hasToken) {
    return (
      <Button variant="secondary" onClick={() => navigate(ROUTES.auth(AUTH_TYPE.login))}>
        Авторизация
      </Button>
    )
  }

  if (currentUser.isLoading) {
    return <p className="text-sm text-slate-400">Загрузка…</p>
  }

  if (currentUser.isError) {
    clearAccessToken()
    queryClient.removeQueries({ queryKey: CURRENT_USER_QUERY_KEY })

    return (
      <Button variant="secondary" onClick={() => navigate(ROUTES.auth(AUTH_TYPE.login))}>
        Авторизация
      </Button>
    )
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {currentUser.data && (
        <div className="text-center text-sm">
          <p className="font-medium text-slate-200">{currentUser.data.name}</p>
          <p className="text-slate-400">{currentUser.data.email}</p>
        </div>
      )}
      <Button variant="ghost" onClick={handleLogout}>
        Выйти
      </Button>
    </div>
  )
}
