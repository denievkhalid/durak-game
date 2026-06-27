import { Schema } from "mongoose"
import type { TablePair } from "@durakjs/engine"

import { cardSchema } from "../../card/schema/card.schema"

export const tablePairSchema = new Schema<TablePair>(
  {
    attack: { type: cardSchema, required: true },
    defense: { type: cardSchema, default: null },
  },
  { _id: false },
)
