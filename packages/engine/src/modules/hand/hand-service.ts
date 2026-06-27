import type { Card } from "../../core/types/card"
import type { Hand, HandMutationResult, IHandService } from "./types"

export class HandService implements IHandService {
  findCard(hand: Hand, cardId: string): Card | null {
    return hand.find((card) => card.id === cardId) ?? null
  }

  removeCard(hand: Hand, cardId: string): HandMutationResult | null {
    const index = hand.findIndex((card) => card.id === cardId)
    if (index === -1) return null

    const card = hand[index]!
    return {
      hand: [...hand.slice(0, index), ...hand.slice(index + 1)],
      card,
    }
  }

  addCards(hand: Hand, cards: Card[]): Hand {
    return [...hand, ...cards]
  }

  hasCard(hand: Hand, cardId: string): boolean {
    return hand.some((card) => card.id === cardId)
  }
}

export type { Hand, HandMutationResult, IHandService } from "./types"
