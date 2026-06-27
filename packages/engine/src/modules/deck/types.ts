import type { Card } from "../../core/types/card"

export type Deck = Card[]

export interface IDeckService {
  create(shuffled?: boolean): Deck
  shuffle(cards: Card[]): Card[]
  draw(deck: Deck, count: number): { deck: Deck; cards: Card[] }
  peekTrump(deck: Deck): Card | null
}
