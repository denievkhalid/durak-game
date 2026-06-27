import type { Rank, Suit } from "@durakjs/engine"

export const SUIT_SYMBOLS: Record<Suit, string> = {
  clubs: "♣",
  diamonds: "♦",
  hearts: "♥",
  spades: "♠",
}

export const SUIT_COLOR_CLASS: Record<Suit, string> = {
  clubs: "text-slate-900",
  spades: "text-slate-900",
  hearts: "text-red-600",
  diamonds: "text-red-600",
}

const RANK_LABELS: Record<Rank, string> = {
  "6": "6",
  "7": "7",
  "8": "8",
  "9": "9",
  "10": "10",
  jack: "J",
  queen: "Q",
  king: "K",
  ace: "A",
}

export function formatRank(rank: Rank): string {
  return RANK_LABELS[rank]
}

export function formatCardLabel(rank: Rank, suit: Suit): string {
  return `${formatRank(rank)}${SUIT_SYMBOLS[suit]}`
}
