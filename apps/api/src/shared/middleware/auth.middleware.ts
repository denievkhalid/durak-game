import type { NextFunction, Request, Response } from "express"

import { AppError } from "../errors/app-error"
import { verifyAccessToken } from "../lib/jwt"

function extractBearerToken(header: string | undefined): string | null {
  if (!header?.startsWith("Bearer ")) {
    return null
  }

  const token = header.slice("Bearer ".length).trim()
  return token.length > 0 ? token : null
}

export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  try {
    const token = extractBearerToken(req.headers.authorization)

    if (!token) {
      throw new AppError("Authorization token is required", 401)
    }

    req.user = verifyAccessToken(token)
    next()
  } catch (error) {
    if (error instanceof AppError) {
      next(error)
      return
    }

    next(new AppError("Invalid or expired token", 401))
  }
}
