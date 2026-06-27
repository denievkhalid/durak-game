import { SUITS, RANKS, type Card, type Rank, type Suit } from "../types/card"

export function createCard(suit: Suit, rank: Rank): Card {
  return { id: `${suit}_${rank}`, suit, rank }
}

export function createDeck36(): Card[] {
  return SUITS.flatMap((suit) => RANKS.map((rank) => createCard(suit, rank)))
}

export function toCardDTO(card: Card): { id: string; suit: Suit; rank: Rank } {
  return { id: card.id, suit: card.suit, rank: card.rank }
}
