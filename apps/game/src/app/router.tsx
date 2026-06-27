import { HomePage } from "@/pages/home"
import { AuthPage } from "@/pages/auth"
import { GamePage } from "@/pages/game"
import { LobbyPage } from "@/pages/lobby"
import { GAME_PATH, ROUTES } from "@/shared/config/routes"
import { createBrowserRouter } from "react-router-dom"

export const router = createBrowserRouter([
  {
    path: ROUTES.home,
    element: <HomePage />,
  },
  {
    path: ROUTES.authPath,
    element: <AuthPage />,
  },
  {
    path: ROUTES.lobby,
    element: <LobbyPage />,
  },
  {
    path: GAME_PATH,
    element: <GamePage />,
  },
])
