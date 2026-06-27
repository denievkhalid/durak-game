import jwt from "jsonwebtoken"

import { env } from "../config/env"
import type { AuthUser } from "../types/auth-user"

type AccessTokenPayload = {
  sub: string
  email: string
  name: string
}

export function signAccessToken(user: AuthUser): string {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN as `${number}d` },
  )
}

export function verifyAccessToken(token: string): AuthUser {
  const payload = jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload

  return {
    id: payload.sub,
    email: payload.email,
    name: payload.name,
  }
}
