import { create } from "zustand"
import type { GameCommand } from "@durakjs/engine"
import { getPlayerActionLabel, type PlayerActionKind } from "@/shared/lib/game-labels"

const ACTION_DURATION_MS = 2500

type PlayerActionState = {
  label: string
}

type PlayerActionStore = {
  actions: Record<string, PlayerActionState>
  show: (playerId: string, kind: PlayerActionKind) => void
  clear: (playerId: string) => void
  clearAll: () => void
}

const dismissTimers = new Map<string, ReturnType<typeof setTimeout>>()

function commandToActionKind(command: GameCommand): PlayerActionKind | null {
  switch (command.type) {
    case "take":
      return "take"
    case "pass":
      return "pass"
    default:
      return null
  }
}

export const usePlayerActionStore = create<PlayerActionStore>((set) => ({
  actions: {},

  show: (playerId, kind) => {
    const label = getPlayerActionLabel(kind)

    const existingTimer = dismissTimers.get(playerId)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    set((state) => ({
      actions: { ...state.actions, [playerId]: { label } },
    }))

    const timer = setTimeout(() => {
      dismissTimers.delete(playerId)
      usePlayerActionStore.getState().clear(playerId)
    }, ACTION_DURATION_MS)
    dismissTimers.set(playerId, timer)
  },

  clear: (playerId) => {
    const timer = dismissTimers.get(playerId)
    if (timer) {
      clearTimeout(timer)
      dismissTimers.delete(playerId)
    }

    set((state) => {
      const next = { ...state.actions }
      delete next[playerId]
      return { actions: next }
    })
  },

  clearAll: () => {
    for (const timer of dismissTimers.values()) {
      clearTimeout(timer)
    }
    dismissTimers.clear()
    set({ actions: {} })
  },
}))

export function showPlayerAction(playerId: string, command: GameCommand) {
  const kind = commandToActionKind(command)
  if (!kind) return
  usePlayerActionStore.getState().show(playerId, kind)
}

export function clearAllPlayerActions() {
  usePlayerActionStore.getState().clearAll()
}
