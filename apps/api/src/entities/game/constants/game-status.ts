export const GAME_STATUS = {
  waiting: "waiting",
  active: "active",
  finished: "finished",
} as const

export type GameStatus = (typeof GAME_STATUS)[keyof typeof GAME_STATUS]

export const GAME_STATUS_VALUES = Object.values(GAME_STATUS)
