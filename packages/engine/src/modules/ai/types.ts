import type { GameCommand, GameState } from "../../core/types"
import type { EngineContainer } from "../../core/container"

export interface IBotStrategy {
  pickCommand(state: GameState, container: EngineContainer): GameCommand | null
}
