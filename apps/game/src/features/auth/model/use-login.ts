import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"

import { login, type LoginPayload } from "../api/auth-api"
import { CURRENT_USER_QUERY_KEY } from "./use-current-user"
import { ROUTES } from "@/shared/config/routes"
import { setAccessToken } from "@/shared/lib/auth-token"

export function useLogin() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: LoginPayload) => login(payload),
    onSuccess: (data) => {
      setAccessToken(data.token)
      queryClient.setQueryData(CURRENT_USER_QUERY_KEY, data.user)
      navigate(ROUTES.home)
    },
  })
}
