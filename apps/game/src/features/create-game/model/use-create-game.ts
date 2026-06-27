import { useMutation } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"

import { createLobby } from "../api/game-api"
import { ROUTES } from "@/shared/config/routes"

export function useCreateGame() {
  const navigate = useNavigate()

  return useMutation({
    mutationFn: createLobby,
    onSuccess: (game) => {
      navigate(ROUTES.game(game.id))
    },
  })
}
