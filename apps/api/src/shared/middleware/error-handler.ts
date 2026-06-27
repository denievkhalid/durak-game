import type { NextFunction, Request, Response } from "express"
import mongoose from "mongoose"

import { AppError } from "../errors/app-error"

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ error: error.message })
    return
  }

  if (error instanceof mongoose.Error.CastError) {
    res.status(404).json({ error: "Game not found" })
    return
  }

  console.error(error)
  res.status(500).json({ error: "Internal server error" })
}
