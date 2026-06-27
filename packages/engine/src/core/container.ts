import { DeckService } from "../modules/deck"
import { HandService } from "../modules/hand"
import { TableService } from "../modules/table"
import { TurnService } from "../modules/turn"
import { PodkidnoyRules } from "../modules/rules"
import { SimpleBotStrategy } from "../modules/ai"
import type { GameMode } from "./types"

export type EngineContainer = {
  deck: DeckService
  hand: HandService
  table: TableService
  turn: TurnService
  rules: PodkidnoyRules
  bot: SimpleBotStrategy
}

export function createEngineContainer(mode: GameMode): EngineContainer {
  void mode
  return {
    deck: new DeckService(),
    hand: new HandService(),
    table: new TableService(),
    turn: new TurnService(),
    rules: new PodkidnoyRules(),
    bot: new SimpleBotStrategy(),
  }
}
