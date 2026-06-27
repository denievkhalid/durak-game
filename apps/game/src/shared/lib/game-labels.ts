import type { GameViewDTO } from "@durakjs/engine"

export type PlayerActionKind = "take" | "pass"

export function getPlayerActionLabel(kind: PlayerActionKind): string {
  switch (kind) {
    case "take":
      return "Беру"
    case "pass":
      return "Бито"
  }
}

export function getTakeMessage(playerName: string): string {
  if (playerName === "Вы") {
    return "Вы взяли карты"
  }
  return `${playerName} взял карты`
}

export function getPassMessage(playerName: string): string {
  if (playerName === "Вы") {
    return "Бито"
  }
  return `${playerName}: бито`
}

export function getCardWord(count: number): string {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod100 >= 11 && mod100 <= 14) return "карт"
  if (mod10 === 1) return "карта"
  if (mod10 >= 2 && mod10 <= 4) return "карты"
  return "карт"
}

export function getHandOverlapClass(count: number): string {
  if (count <= 4) return "-ml-3"
  if (count <= 6) return "-ml-4"
  return "-ml-5"
}

export function getHandOverlapRem(count: number): number {
  if (count <= 4) return 0.75
  if (count <= 6) return 1
  return 1.25
}

export function getPhaseLabel(
  phase: GameViewDTO["phase"],
  isHumanTurn: boolean,
): string {
  if (phase === "finished") return "Игра окончена"
  if (!isHumanTurn) return "Ход соперника..."
  if (phase === "attack") return "Ваш ход — атакуйте"
  if (phase === "defend") return "Ваш ход — отбивайтесь или берите"
  if (phase === "throw_in") return "Подкиньте карту или нажмите «Бито»"
  return ""
}
