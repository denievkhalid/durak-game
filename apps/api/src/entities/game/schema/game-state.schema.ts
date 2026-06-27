import { Schema } from "mongoose"
import type { GameState } from "@durakjs/engine"

import { cardSchema } from "../../card/schema/card.schema"
import { tablePairSchema } from "../../table-pair/schema/table-pair.schema"
import { gamePlayerSchema } from "./game-player.schema"

export const gameStateSchema = new Schema<GameState>(
  {
    players: { type: [gamePlayerSchema], required: true },
    deck: { type: [cardSchema], default: [] },
    trump: { type: cardSchema, required: true },
    discard: { type: [cardSchema], default: [] },
    table: { type: [tablePairSchema], default: [] },
    phase: {
      type: String,
      enum: ["attack", "defend", "throw_in", "dealing", "finished"],
      required: true,
    },
    attackerIndex: { type: Number, required: true, min: 0 },
    defenderIndex: { type: Number, required: true, min: 0 },
    currentPlayerId: { type: String, required: true },
    winnerId: { type: String, default: null },
    loserId: { type: String, default: null },
  },
  { _id: false },
)
