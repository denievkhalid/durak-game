import { describe, expect, it } from "vitest"
import { createDeck36 } from "../../core/factories/card-factory"
import { DECK_SIZE } from "../../core/types"
import { DeckService } from "./deck-service"

describe("DeckService", () => {
  const deckService = new DeckService()

  it("creates a deck of 36 cards", () => {
    const deck = deckService.create(false)
    expect(deck).toHaveLength(DECK_SIZE)
  })

  it("draws cards from the top of the deck", () => {
    const deck = createDeck36()
    const { deck: remaining, cards } = deckService.draw(deck, 3)

    expect(cards).toHaveLength(3)
    expect(cards[0]).toEqual(deck[0])
    expect(remaining).toHaveLength(deck.length - 3)
  })

  it("returns trump as the last card", () => {
    const deck = createDeck36()
    expect(deckService.peekTrump(deck)?.id).toBe(deck[deck.length - 1]?.id)
  })
})
