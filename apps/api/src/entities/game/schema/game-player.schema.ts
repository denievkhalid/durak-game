import { Schema } from "mongoose"
import type { Player as EnginePlayer } from "@durakjs/engine"

import { cardSchema } from "../../card/schema/card.schema"

export const gamePlayerSchema = new Schema<EnginePlayer>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    hand: { type: [cardSchema], default: [] },
    isBot: { type: Boolean, required: true },
  },
  { _id: false },
)
