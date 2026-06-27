import { Schema } from "mongoose"
import { RANKS, SUITS } from "@durakjs/engine"
import type { Card } from "@durakjs/engine"

export const cardSchema = new Schema<Card>(
  {
    id: { type: String, required: true },
    suit: { type: String, enum: SUITS, required: true },
    rank: { type: String, enum: RANKS, required: true },
  },
  { _id: false },
)
