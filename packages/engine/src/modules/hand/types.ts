import type { Card } from "../../core/types/card"

export type Hand = Card[]

export type HandMutationResult = {
  hand: Hand
  card: Card
}

export interface IHandService {
  findCard(hand: Hand, cardId: string): Card | null
  removeCard(hand: Hand, cardId: string): HandMutationResult | null
  addCards(hand: Hand, cards: Card[]): Hand
  hasCard(hand: Hand, cardId: string): boolean
}
