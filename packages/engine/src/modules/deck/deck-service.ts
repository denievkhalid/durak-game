import { createDeck36 } from "../../core/factories/card-factory"
import type { Card } from "../../core/types/card"
import type { Deck, IDeckService } from "./types"

export class DeckService implements IDeckService {
  create(shuffled = true): Deck {
    const cards = createDeck36()
    return shuffled ? this.shuffle(cards) : cards
  }

  shuffle(cards: Card[]): Card[] {
    const shuffled = [...cards]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const temp = shuffled[i]!
      shuffled[i] = shuffled[j]!
      shuffled[j] = temp
    }
    return shuffled
  }

  draw(deck: Deck, count: number): { deck: Deck; cards: Card[] } {
    if (count <= 0) {
      return { deck: [...deck], cards: [] }
    }

    const cards = deck.slice(0, count)
    return { deck: deck.slice(count), cards }
  }

  peekTrump(deck: Deck): Card | null {
    return deck.length > 0 ? (deck[deck.length - 1] ?? null) : null
  }
}

export type { Deck, IDeckService } from "./types"
