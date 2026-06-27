import type { Request, Response } from "express"

export class HealthController {
  check(_req: Request, res: Response): void {
    res.json({ ok: true })
  }
}
