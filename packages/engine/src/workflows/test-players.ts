import { BOT_PLAYER_ID, HUMAN_PLAYER_ID } from "../core/types"
import type { CreateGameDTO } from "../core/types"

export function createTestGameInput(
  overrides?: Partial<CreateGameDTO>,
): CreateGameDTO {
  return {
    mode: "podkidnoy",
    players: [
      { id: HUMAN_PLAYER_ID, name: "Human", isBot: false },
      { id: BOT_PLAYER_ID, name: "Bot", isBot: true },
    ],
    ...overrides,
  }
}
