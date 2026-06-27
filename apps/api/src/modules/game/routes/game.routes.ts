import { Router } from "express"

import { authMiddleware } from "../../../shared/middleware/auth.middleware"
import type { GameController } from "../controller/game.controller"

export function createGameRouter(controller: GameController): Router {
  const router = Router()

  router.post("/", authMiddleware, controller.createLobby)
  router.post("/private", authMiddleware, controller.createPrivateLobby)
  router.post("/private/join", authMiddleware, controller.joinPrivateLobby)
  router.get("/lobbies", authMiddleware, controller.listWaitingLobbies)
  router.post("/:id/rematch", authMiddleware, controller.requestRematch)
  router.get("/:id", authMiddleware, controller.getById)

  return router
}
