import { create } from "zustand"

type TurnTimerStore = {
  optimisticDeadlineAt: string | null | undefined
  pauseOptimistic: () => void
  applyServerDeadline: () => void
  reset: () => void
}

export const useTurnTimerStore = create<TurnTimerStore>((set) => ({
  optimisticDeadlineAt: undefined,

  pauseOptimistic: () => {
    set({ optimisticDeadlineAt: null })
  },

  applyServerDeadline: () => {
    set({ optimisticDeadlineAt: undefined })
  },

  reset: () => {
    set({ optimisticDeadlineAt: undefined })
  },
}))

export function pauseTurnTimerOptimistic(): void {
  useTurnTimerStore.getState().pauseOptimistic()
}

export function applyServerTurnTimer(): void {
  useTurnTimerStore.setState({ optimisticDeadlineAt: undefined })
}

export function resetTurnTimerSession(): void {
  useTurnTimerStore.getState().reset()
}

export function getSecondsUntilDeadline(deadlineIso: string | null): number {
  if (!deadlineIso) {
    return 0
  }

  return Math.max(0, Math.ceil((new Date(deadlineIso).getTime() - Date.now()) / 1000))
}
