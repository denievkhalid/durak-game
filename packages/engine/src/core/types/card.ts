export const SUITS = ["clubs", "diamonds", "hearts", "spades"] as const
export type Suit = (typeof SUITS)[number]

export const RANKS = ["6", "7", "8", "9", "10", "jack", "queen", "king", "ace"] as const
export type Rank = (typeof RANKS)[number]

export type Card = {
  id: string
  suit: Suit
  rank: Rank
}
