import type { GameMode } from "@durakjs/engine"

export const GAME_MODE = {
  podkidnoy: "podkidnoy",
} as const satisfies Record<string, GameMode>

export const GAME_MODE_VALUES = Object.values(GAME_MODE)
