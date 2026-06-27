export const AUTH_QUERY = {
  type: "type",
} as const

export const AUTH_TYPE = {
  login: "login",
  register: "register",
} as const

export type AuthType = (typeof AUTH_TYPE)[keyof typeof AUTH_TYPE]

export const AUTH_TYPE_VALUES = Object.values(AUTH_TYPE)

export const ROUTES = {
  home: "/",
  lobby: "/lobby",
  game: (id: string) => `/game/${id}`,
  auth: (type: AuthType) => `/auth?${AUTH_QUERY.type}=${type}`,
  authPath: "/auth",
} as const

export const GAME_ID_PARAM = "id"

export const GAME_PATH = `/game/:${GAME_ID_PARAM}` as const
