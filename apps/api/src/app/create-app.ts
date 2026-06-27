import express from "express"

import { authRouter } from "../modules/auth"
import { gameRouter } from "../modules/game"
import { healthRouter } from "../modules/health"
import { errorHandler } from "../shared/middleware/error-handler"

export function createApp() {
  const app = express()

  app.use(express.json())
  app.use("/health", healthRouter)
  app.use("/auth", authRouter)
  app.use("/games", gameRouter)
  app.use(errorHandler)

  return app
}
