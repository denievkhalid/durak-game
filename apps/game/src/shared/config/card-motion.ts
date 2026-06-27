export const CARD_FLIGHT_MS = 480
export const CARD_DEAL_FLIGHT_MS = 85
export const BOT_CARD_MOUNT_MS = 40

export const TABLE_WIDTH_CLASS = "w-full max-w-[38rem]"
export const TABLE_HEIGHT_CLASS = "aspect-[3/2] min-h-[9.5rem] max-h-[14rem]"

export const cardLayoutTransition = {
  type: "spring" as const,
  stiffness: 320,
  damping: 28,
  mass: 0.85,
}

export const dealCardTransition = {
  type: "tween" as const,
  duration: CARD_DEAL_FLIGHT_MS / 1000,
  ease: [0.22, 1, 0.36, 1] as const,
}

export function getCardLayoutId(cardId: string): string {
  return `card-${cardId}`
}
