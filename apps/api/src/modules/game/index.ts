import { GameController } from "./controller/game.controller"
import { GameRepository } from "./repository/game.repository"
import { createGameRouter } from "./routes/game.routes"
import { GameService } from "./service/game.service"
import { userRepository } from "../auth"

const repository = new GameRepository()
export const gameService = new GameService(repository, userRepository)

const controller = new GameController(gameService)

export const gameRouter = createGameRouter(controller)
