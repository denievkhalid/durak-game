import { createServer } from "node:http"

import { createApp } from "./create-app"
import { env } from "../shared/config/env"
import { connectDatabase } from "../shared/db/connection"
import { gameService } from "../modules/game"
import { createSocketServer } from "../modules/realtime"

async function main() {
  await connectDatabase()

  const app = createApp()
  const httpServer = createServer(app)

  createSocketServer(httpServer, gameService)

  httpServer.listen(env.PORT, () => {
    console.log(`API listening on http://localhost:${env.PORT}`)
  })
}

main().catch((error) => {
  console.error("Failed to start API:", error)
  process.exit(1)
})
