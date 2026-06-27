export type Rect = {
  x: number
  y: number
  width: number
  height: number
}

export function toRect(dom: DOMRect): Rect {
  return {
    x: dom.x,
    y: dom.y,
    width: dom.width,
    height: dom.height,
  }
}

export function measureElement(selector: string): Rect | null {
  const element = document.querySelector(selector)
  if (!element) return null
  return toRect(element.getBoundingClientRect())
}

function remToPx(rem: number): number {
  return rem * parseFloat(getComputedStyle(document.documentElement).fontSize)
}

export function estimateHandCardRect(
  container: Rect,
  cardIndex: number,
  totalCards: number,
  overlapRem: number,
): Rect {
  const cardWidth = remToPx(3.75)
  const cardHeight = remToPx(5.5)
  const overlapPx = remToPx(overlapRem)
  const step = cardWidth - overlapPx
  const handWidth = cardWidth + step * Math.max(totalCards - 1, 0)
  const startX = container.x + (container.width - handWidth) / 2

  return {
    x: startX + cardIndex * step,
    y: container.y + container.height - cardHeight,
    width: cardWidth,
    height: cardHeight,
  }
}

export function getPlayerHandSelector(): string {
  return `[data-card-anchor="player-hand"]`
}

export function getDiscardPileSelector(): string {
  return `[data-card-anchor="discard-pile"]`
}

export function getDeckPileSelector(): string {
  return `[data-card-anchor="deck-pile"]`
}

export function getOpponentHandSelector(): string {
  return `[data-card-anchor="opponent-hand"]`
}

export function getHandCardSelector(cardId: string): string {
  return `[data-card-anchor="hand-${cardId}"]`
}

export function getTableCardSelector(cardId: string, role: "attack" | "defense"): string {
  return `[data-card-anchor="table-${role}-${cardId}"]`
}
