import { useQuery } from "@tanstack/react-query"

import { fetchCurrentUser } from "../api/auth-api"
import { getAccessToken } from "@/shared/lib/auth-token"

export const CURRENT_USER_QUERY_KEY = ["auth", "me"] as const

export function useCurrentUser() {
  return useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: async () => {
      const { user } = await fetchCurrentUser()
      return user
    },
    enabled: Boolean(getAccessToken()),
    retry: false,
  })
}
