import { Router } from "express"

import type { HealthController } from "../controller/health.controller"

export function createHealthRouter(controller: HealthController): Router {
  const router = Router()

  router.get("/", controller.check.bind(controller))

  return router
}
