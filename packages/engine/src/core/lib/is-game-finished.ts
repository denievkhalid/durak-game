import { GAME_PHASE, type GameState } from "../types"

export function isGameFinished(
  state: Pick<GameState, "phase" | "winnerId" | "loserId">,
): boolean {
  return (
    state.phase === GAME_PHASE.finished ||
    state.winnerId !== null ||
    state.loserId !== null
  )
}
