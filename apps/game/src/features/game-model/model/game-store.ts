import { create } from "zustand"
import {
  createEngineContainer,
  executeCommandWorkflow,
  forfeitGameWorkflow,
  getCardIdFromCommand,
  getCardIdsFromCommand,
  getLegalMoves,
  peekBotCommand,
  startGameWorkflow,
  surrenderGameWorkflow,
  toCardDTO,
  toGameViewDTO,
  BOT_PLAYER_ID,
  GAME_COMMAND_TYPE,
  GAME_PHASE,
  HUMAN_PLAYER_ID,
  type Card,
  type CardDTO,
  type DomainEvent,
  type GameCommand,
  type GameState,
  type GameViewDTO,
} from "@durakjs/engine"
import {
  clearAllPlayerActions,
  showPlayerAction,
} from "@/features/player-action/model/player-action-store"
import {
  applyServerTurnTimer,
  pauseTurnTimerOptimistic,
  resetTurnTimerSession,
} from "@/features/turn-timer/model/turn-timer-store"

type PendingBotMove = {
  command: GameCommand
  card: CardDTO
}

type PendingDeal = {
  playerId: string
  card: CardDTO
}

type PendingBotPass = {
  command: GameCommand
}

type PendingBotTake = {
  command: GameCommand
}

type GameStore = {
  state: GameState | null
  view: GameViewDTO | null
  error: string | null
  isAnimating: boolean
  socketUpdateVersion: number
  pendingOnlineView: GameViewDTO | null
  pendingBotMove: PendingBotMove | null
  pendingBotPass: PendingBotPass | null
  pendingBotTake: PendingBotTake | null
  pendingDeals: PendingDeal[] | null
  startGame: () => void
  executeCommand: (command: GameCommand, gameId?: string) => void
  commitBotMove: () => void
  commitBotPass: () => void
  commitBotTake: () => void
  forfeitTurn: (gameId?: string) => void
  surrenderGame: (playerId: string, gameId?: string) => void
  onFlightComplete: () => void
  clearPendingDeals: () => void
  clearPendingBotPass: () => void
  clearError: () => void
  setError: (error: string) => void
  applyServerView: (view: GameViewDTO) => void
  applySocketView: (view: GameViewDTO) => void
  resetSession: () => void
}

const container = createEngineContainer("podkidnoy")
let botChainTimer: ReturnType<typeof setTimeout> | null = null

function clearBotChainTimer() {
  if (botChainTimer) {
    clearTimeout(botChainTimer)
    botChainTimer = null
  }
}

function findCardInState(state: GameState, cardId: string): Card | null {
  for (const player of state.players) {
    const card = player.hand.find((entry) => entry.id === cardId)
    if (card) return card
  }
  return null
}

function getPendingDealsFromEvents(events: DomainEvent[]): PendingDeal[] | null {
  const event = events.find((entry) => entry.type === "cards.dealt")
  if (!event || event.type !== "cards.dealt" || event.payload.deals.length === 0) {
    return null
  }
  return event.payload.deals
}

function repairStuckBotState(state: GameState): GameState | null {
  if (
    state.phase === GAME_PHASE.defend &&
    container.table.allDefended(state.table)
  ) {
    const attacker = container.turn.getAttacker(state)
    return {
      ...state,
      phase: GAME_PHASE.throwIn,
      currentPlayerId: attacker.id,
    }
  }

  return null
}

function applyBotCommand(
  getState: () => GameStore,
  setState: (partial: Partial<GameStore>) => void,
  command: GameCommand,
) {
  const { state } = getState()
  if (!state) {
    setState({ isAnimating: false, pendingBotMove: null })
    return
  }

  const result = executeCommandWorkflow(state, command, BOT_PLAYER_ID, container)
  if (!result.ok) {
    setState({ isAnimating: false, pendingBotMove: null })
    return
  }

  showPlayerAction(BOT_PLAYER_ID, command)

  setState({
    state: result.state,
    view: result.view,
    pendingBotMove: null,
    pendingDeals: getPendingDealsFromEvents(result.events),
    isAnimating: true,
  })
}

function scheduleBotChain(
  getState: () => GameStore,
  setState: (partial: Partial<GameStore>) => void,
  delayMs = 0,
) {
  clearBotChainTimer()

  botChainTimer = setTimeout(() => {
    const { state, view } = getState()
    if (!state || !view) {
      setState({ isAnimating: false, pendingBotMove: null })
      return
    }

    if (state.currentPlayerId !== BOT_PLAYER_ID || state.phase === "finished") {
      setState({ isAnimating: false, pendingBotMove: null })
      return
    }

    const command = peekBotCommand(state, container)
    if (!command) {
      const repaired = repairStuckBotState(state)
      if (repaired) {
        const legalMoves = getLegalMoves(repaired, container)
        const view = toGameViewDTO(repaired, HUMAN_PLAYER_ID, legalMoves)
        setState({ state: repaired, view })
        scheduleBotChain(getState, setState, 0)
        return
      }

      setState({ isAnimating: false, pendingBotMove: null })
      return
    }

    if (command.type === GAME_COMMAND_TYPE.pass) {
      setState({
        pendingBotPass: { command },
        pendingBotMove: null,
        isAnimating: true,
      })
      return
    }

    if (command.type === GAME_COMMAND_TYPE.take) {
      setState({
        pendingBotTake: { command },
        pendingBotMove: null,
        isAnimating: true,
      })
      return
    }

    const cardId = getCardIdFromCommand(command)
    if (cardId) {
      const card = findCardInState(state, cardId)
      if (card) {
        setState({
          pendingBotMove: { command, card: toCardDTO(card) },
          isAnimating: true,
        })
        return
      }
    }

    applyBotCommand(getState, setState, command)

    const nextState = getState().state
    if (nextState?.currentPlayerId === BOT_PLAYER_ID && nextState.phase !== "finished") {
      scheduleBotChain(getState, setState, 300)
      return
    }

    setState({ isAnimating: false })
  }, delayMs)
}

export const useGameStore = create<GameStore>((set, get) => ({
  state: null,
  view: null,
  error: null,
  isAnimating: false,
  socketUpdateVersion: 0,
  pendingOnlineView: null,
  pendingBotMove: null,
  pendingBotPass: null,
  pendingBotTake: null,
  pendingDeals: null,

  startGame: () => {
    clearBotChainTimer()
    resetTurnTimerSession()
    clearAllPlayerActions()

    const result = startGameWorkflow(
      {
        mode: "podkidnoy",
        players: [
          { id: HUMAN_PLAYER_ID, name: "Вы", isBot: false },
          { id: BOT_PLAYER_ID, name: "Бот", isBot: true },
        ],
      },
      container,
    )

    if (!result.ok) {
      set({
        error: result.error.message,
        isAnimating: false,
        pendingOnlineView: null,
        pendingBotMove: null,
        pendingBotPass: null,
        pendingBotTake: null,
        pendingDeals: null,
      })
      return
    }

    const pendingDeals = getPendingDealsFromEvents(result.events)
    const botStarts = result.state.currentPlayerId === BOT_PLAYER_ID

    set({
      state: result.state,
      view: result.view,
      error: null,
      socketUpdateVersion: 0,
      pendingOnlineView: null,
      pendingBotMove: null,
      pendingDeals,
      isAnimating: !!pendingDeals || botStarts,
    })

    if (!pendingDeals && botStarts) {
      scheduleBotChain(get, set)
    }
  },

  executeCommand: (command: GameCommand, gameId?: string) => {
    const { state, isAnimating } = get()
    if (isAnimating) return

    if (state) {
      clearBotChainTimer()

      const result = executeCommandWorkflow(
        state,
        command,
        HUMAN_PLAYER_ID,
        container,
      )

      if (!result.ok) {
        set({ error: result.error.message })
        return
      }

      const isCardMove = getCardIdsFromCommand(command).length > 0
      const pendingDeals = getPendingDealsFromEvents(result.events)
      const keepsAnimating =
        isCardMove ||
        !!pendingDeals ||
        command.type === GAME_COMMAND_TYPE.pass ||
        command.type === GAME_COMMAND_TYPE.take

      set({
        state: result.state,
        view: result.view,
        error: null,
        pendingBotMove: null,
        pendingDeals,
        isAnimating: keepsAnimating,
      })

      if (!keepsAnimating) {
        scheduleBotChain(get, set)
      }

      return
    }

    if (!gameId) {
      return
    }

    const shouldAwaitAnimation =
      getCardIdsFromCommand(command).length > 0 ||
      command.type === GAME_COMMAND_TYPE.pass ||
      command.type === GAME_COMMAND_TYPE.take

    if (shouldAwaitAnimation) {
      set({ isAnimating: true })
    }

    pauseTurnTimerOptimistic()

    void import("@/features/game-session/lib/game-commands").then(({ emitGameCommand }) => {
      void emitGameCommand(gameId, command).then((response) => {
        if (!response.ok) {
          applyServerTurnTimer()
          set({
            error: response.error ?? "Не удалось выполнить ход",
            isAnimating: false,
            pendingOnlineView: null,
          })
          return
        }

        const nextView = response.snapshot.view
        if (!nextView) {
          set({ isAnimating: false, pendingOnlineView: null })
          return
        }

        if (shouldAwaitAnimation && get().isAnimating) {
          set({ pendingOnlineView: nextView })
          return
        }

        get().applyServerView(nextView)
      })
    })
  },

  commitBotPass: () => {
    const { pendingBotPass, state } = get()
    if (!pendingBotPass || !state) return
    applyBotCommand(get, set, pendingBotPass.command)
    set({ pendingBotPass: null })
  },

  commitBotTake: () => {
    const { pendingBotTake, state } = get()
    if (!pendingBotTake || !state) return
    applyBotCommand(get, set, pendingBotTake.command)
    set({ pendingBotTake: null })
  },

  clearPendingBotPass: () => set({ pendingBotPass: null }),

  commitBotMove: () => {
    const { pendingBotMove, state } = get()
    if (!pendingBotMove || !state) return
    applyBotCommand(get, set, pendingBotMove.command)
  },

  forfeitTurn: (gameId?: string) => {
    const { state, isAnimating } = get()
    if (isAnimating) {
      return
    }

    if (state) {
      if (state.phase === "finished") {
        return
      }

      clearBotChainTimer()

      const result = forfeitGameWorkflow(state, state.currentPlayerId, container)
      if (!result.ok) {
        return
      }

      set({
        state: result.state,
        view: result.view,
        error: null,
        isAnimating: false,
        pendingOnlineView: null,
        pendingBotMove: null,
        pendingBotPass: null,
        pendingBotTake: null,
        pendingDeals: null,
      })
      return
    }

    if (!gameId) {
      return
    }

    pauseTurnTimerOptimistic()

    void import("@/features/game-session/lib/game-commands").then(({ emitGameForfeit }) => {
      void emitGameForfeit(gameId).then((response) => {
        if (!response.ok) {
          applyServerTurnTimer()
          set({ error: response.error ?? "Не удалось завершить ход" })
          return
        }

        const nextView = response.snapshot.view
        if (!nextView) {
          return
        }

        get().applyServerView(nextView)
      })
    })
  },

  surrenderGame: (playerId: string, gameId?: string) => {
    const { state, isAnimating } = get()
    if (isAnimating) {
      return
    }

    if (state) {
      if (state.phase === "finished") {
        return
      }

      clearBotChainTimer()

      const result = surrenderGameWorkflow(state, playerId, container)
      if (!result.ok) {
        return
      }

      set({
        state: result.state,
        view: result.view,
        error: null,
        isAnimating: false,
        pendingOnlineView: null,
        pendingBotMove: null,
        pendingBotPass: null,
        pendingBotTake: null,
        pendingDeals: null,
      })
      return
    }

    if (!gameId) {
      return
    }

    void import("@/features/game-session/lib/game-commands").then(({ emitGameSurrender }) => {
      void emitGameSurrender(gameId).then((response) => {
        if (!response.ok) {
          set({ error: response.error ?? "Не удалось сдаться" })
          return
        }

        const nextView = response.snapshot.view
        if (!nextView) {
          return
        }

        get().applyServerView(nextView)
      })
    })
  },

  onFlightComplete: () => {
    const { state, pendingDeals, pendingOnlineView } = get()
    if (!state) {
      if (pendingOnlineView) {
        get().applyServerView(pendingOnlineView)
        return
      }

      set({ isAnimating: false })
      return
    }

    if (pendingDeals?.length) {
      return
    }

    if (state.currentPlayerId === BOT_PLAYER_ID && state.phase !== GAME_PHASE.finished) {
      scheduleBotChain(get, set)
      return
    }

    set({ isAnimating: false, pendingBotPass: null, pendingBotTake: null })
  },

  clearPendingDeals: () => set({ pendingDeals: null }),

  clearError: () => set({ error: null }),

  setError: (error: string) => set({ error }),

  applyServerView: (view: GameViewDTO) => {
    clearBotChainTimer()
    applyServerTurnTimer()
    set({
      view,
      error: null,
      isAnimating: false,
      pendingOnlineView: null,
      pendingBotMove: null,
      pendingBotPass: null,
      pendingBotTake: null,
      pendingDeals: null,
    })
  },

  applySocketView: (view: GameViewDTO) => {
    clearBotChainTimer()
    applyServerTurnTimer()
    set((current) => ({
      view,
      error: null,
      isAnimating: false,
      socketUpdateVersion: current.socketUpdateVersion + 1,
      pendingOnlineView: null,
      pendingBotMove: null,
      pendingBotPass: null,
      pendingBotTake: null,
      pendingDeals: null,
    }))
  },

  resetSession: () => {
    clearBotChainTimer()
    clearAllPlayerActions()
    resetTurnTimerSession()
    set({
      state: null,
      view: null,
      error: null,
      isAnimating: false,
      socketUpdateVersion: 0,
      pendingOnlineView: null,
      pendingBotMove: null,
      pendingBotPass: null,
      pendingBotTake: null,
      pendingDeals: null,
    })
  },
}))
