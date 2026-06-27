export type HandArcTransform = {
  rotate: number
  zIndex: number
}

const PIVOT_Y_PERCENT = 300

export function getHandArcPivotOrigin(): string {
  return `50% ${PIVOT_Y_PERCENT}%`
}

export function getPlayerHandOverlapClass(count: number): string {
  if (count <= 4) return "-ml-6"
  if (count <= 6) return "-ml-7"
  return "-ml-8"
}

export function getPlayerHandOverlapRem(count: number): number {
  if (count <= 4) return 1.5
  if (count <= 6) return 1.75
  return 2
}

export function getHandArcTransform(index: number, total: number): HandArcTransform {
  if (total <= 1) {
    return { rotate: 0, zIndex: index }
  }

  const center = (total - 1) / 2
  const angleStep = Math.min(8, 42 / (total - 1))

  return {
    rotate: (index - center) * angleStep,
    zIndex: index,
  }
}

export function getHandArcVerticalPadding(total: number): { topRem: number; bottomRem: number } {
  if (total <= 1) {
    return { topRem: 0.5, bottomRem: 0.5 }
  }

  const maxAngle = Math.abs(getHandArcTransform(total - 1, total).rotate)
  const radians = (maxAngle * Math.PI) / 180

  return {
    topRem: 1.25 + radians * 2.4,
    bottomRem: 0.5 + radians * 0.4,
  }
}

const OPPONENT_PIVOT_Y_PERCENT = -200

export function getOpponentHandArcPivotOrigin(): string {
  return `50% ${OPPONENT_PIVOT_Y_PERCENT}%`
}

export function getOpponentHandArcTransform(index: number, total: number): HandArcTransform {
  const arc = getHandArcTransform(index, total)
  return {
    rotate: -arc.rotate,
    zIndex: arc.zIndex,
  }
}

export function getOpponentHandArcVerticalPadding(total: number): {
  topRem: number
  bottomRem: number
} {
  const padding = getHandArcVerticalPadding(total)
  return {
    topRem: padding.bottomRem,
    bottomRem: padding.topRem,
  }
}
