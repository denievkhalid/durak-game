import { Router } from "express"

import { authMiddleware } from "../../../shared/middleware/auth.middleware"
import type { AuthController } from "../controller/auth.controller"

export function createAuthRouter(controller: AuthController): Router {
  const router = Router()

  router.post("/register", controller.register)
  router.post("/login", controller.login)
  router.get("/me", authMiddleware, controller.me)

  return router
}
