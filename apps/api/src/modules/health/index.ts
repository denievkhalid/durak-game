import { HealthController } from "./controller/health.controller"
import { createHealthRouter } from "./routes/health.routes"

const controller = new HealthController()

export const healthRouter = createHealthRouter(controller)
