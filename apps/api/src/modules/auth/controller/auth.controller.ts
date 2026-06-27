import type { Request, Response } from "express"

import { asyncHandler } from "../../../shared/lib/async-handler"
import { AppError } from "../../../shared/errors/app-error"
import type { AuthService } from "../service/auth.service"

type RegisterBody = {
  email?: string
  password?: string
  name?: string
}

type LoginBody = {
  email?: string
  password?: string
}

export class AuthController {
  private readonly service: AuthService

  constructor(service: AuthService) {
    this.service = service
  }

  register = asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as RegisterBody
    const result = await this.service.register(body.email ?? "", body.password ?? "", body.name ?? "")
    res.status(201).json(result)
  })

  login = asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as LoginBody
    const result = await this.service.login(body.email ?? "", body.password ?? "")
    res.json(result)
  })

  me = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError("Unauthorized", 401)
    }

    const user = await this.service.getCurrentUser(req.user.id)
    res.json({ user })
  })
}
