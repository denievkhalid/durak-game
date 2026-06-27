import { useCallback } from "react"
import { useGameStore } from "@/features/game-model"

export function useGameActions() {
  const executeCommand = useGameStore((store) => store.executeCommand)
  const startGame = useGameStore((store) => store.startGame)
  const clearError = useGameStore((store) => store.clearError)

  const attack = useCallback(
    (cardId: string) => executeCommand({ type: "attack", cardId }),
    [executeCommand],
  )

  const defend = useCallback(
    (cardId: string, pairIndex: number) =>
      executeCommand({ type: "defend", cardId, pairIndex }),
    [executeCommand],
  )

  const throwIn = useCallback(
    (cardIds: string[]) => executeCommand({ type: "throw_in", cardIds }),
    [executeCommand],
  )

  const take = useCallback(() => executeCommand({ type: "take" }), [executeCommand])

  const pass = useCallback(() => executeCommand({ type: "pass" }), [executeCommand])

  const playCard = useCallback(
    (cardId: string) => {
      const view = useGameStore.getState().view
      if (!view) return

      const move = view.legalMoves.find((entry) => entry.cardId === cardId)
      if (!move) return

      executeCommand(move.command)
    },
    [executeCommand],
  )

  return {
    startGame,
    attack,
    defend,
    throwIn,
    take,
    pass,
    playCard,
    executeCommand,
    clearError,
  }
}
