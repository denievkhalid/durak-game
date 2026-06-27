import { AuthController } from "./controller/auth.controller"
import { UserRepository } from "./repository/user.repository"
import { createAuthRouter } from "./routes/auth.routes"
import { AuthService } from "./service/auth.service"

const userRepository = new UserRepository()
const authService = new AuthService(userRepository)

const controller = new AuthController(authService)

export const authRouter = createAuthRouter(controller)
export { authService, userRepository }
