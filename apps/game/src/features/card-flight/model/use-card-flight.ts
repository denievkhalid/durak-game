import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import {
  GAME_COMMAND_TYPE,
  MAX_TABLE_PAIRS,
  BOT_PLAYER_ID,
  HUMAN_PLAYER_ID,
  type GameViewDTO,
} from "@durakjs/engine"
import { useGameStore } from "@/features/game-model"
import { dealCardTransition } from "@/shared/config/card-motion"
import { getHandOverlapRem } from "@/shared/lib/game-labels"
import { getPlayerHandOverlapRem } from "@/shared/lib/hand-arc"
import {
  estimateHandCardRect,
  getHandCardSelector,
  getDeckPileSelector,
  getDiscardPileSelector,
  getOpponentHandSelector,
  getPlayerHandSelector,
  getTableCardSelector,
  getTableDropTargetSelector,
  measureElement,
  toRect,
  type Rect,
} from "@/shared/lib/dom-rect"
import type { CardFlight } from "../ui/types"
import { FLIGHT_ENQUEUE, FLIGHT_ROLE, isDealFlightRole, isDiscardFlightRole, isTableFlightRole, isTakeFlightRole, type TableFlightRole } from "../lib/constants"
import { buildDiscardFlights } from "../lib/discard-flight"
import { buildTakeFlights } from "../lib/take-flight"
import { findCardInView, getTableRoleForCard } from "../lib/game-view-helpers"
import type { PendingFlight } from "../lib/pending-flight"

const TABLE_FLIGHT_START_MAX_ATTEMPTS = 90
const DEFAULT_FLIGHT_START_MAX_ATTEMPTS = 24
const BOT_FLIGHT_START_MAX_ATTEMPTS = 24
const DEALS_START_MAX_ATTEMPTS = 12
const ANIMATION_STUCK_TIMEOUT_MS = 6000
const TABLE_ATTACK_STEP_REM = 7.25
const TABLE_DEFENSE_OFFSET_X_REM = 1.75
const TABLE_DEFENSE_OFFSET_Y_REM = 1
const TABLE_MAX_SINGLE_ROW_PAIRS = 5

function remToPx(rem: number): number {
  return rem * parseFloat(getComputedStyle(document.documentElement).fontSize)
}

export function useCardFlight(view: GameViewDTO, gameId?: string) {
  const executeCommand = useGameStore((store) => store.executeCommand)
  const isAnimating = useGameStore((store) => store.isAnimating)
  const pendingDeals = useGameStore((store) => store.pendingDeals)
  const pendingBotPass = useGameStore((store) => store.pendingBotPass)
  const pendingBotTake = useGameStore((store) => store.pendingBotTake)
  const clearPendingDeals = useGameStore((store) => store.clearPendingDeals)
  const commitBotPass = useGameStore((store) => store.commitBotPass)
  const commitBotTake = useGameStore((store) => store.commitBotTake)
  const commitBotMove = useGameStore((store) => store.commitBotMove)
  const onFlightComplete = useGameStore((store) => store.onFlightComplete)

  const [activeFlight, setActiveFlight] = useState<CardFlight | null>(null)
  const [queuedHiddenIds, setQueuedHiddenIds] = useState<string[]>([])
  const [isDealAnimating, setIsDealAnimating] = useState(false)
  const [isTakeAnimating, setIsTakeAnimating] = useState(false)
  const [revealedOpponentCards, setRevealedOpponentCards] = useState(0)
  const [takeHandBase, setTakeHandBase] = useState(0)
  const [takeTakerId, setTakeTakerId] = useState<string | null>(null)
  const [landedTakeCards, setLandedTakeCards] = useState(0)
  const [landedTableFlights, setLandedTableFlights] = useState<CardFlight[]>([])

  const pendingFlightRef = useRef<PendingFlight | null>(null)
  const flightQueueRef = useRef<PendingFlight[]>([])
  const activeFlightRef = useRef<CardFlight | null>(null)
  const botFlightSourceRef = useRef<Rect | null>(null)
  const botFlightCardIdRef = useRef<string | null>(null)

  const recoverStuckAnimation = useCallback(() => {
    pendingFlightRef.current = null
    flightQueueRef.current = []
    botFlightSourceRef.current = null
    botFlightCardIdRef.current = null
    setQueuedHiddenIds([])
    setActiveFlight(null)
    setLandedTableFlights([])
    clearPendingDeals()
    useGameStore.setState({
      pendingBotMove: null,
      pendingBotPass: null,
      pendingBotTake: null,
    })
    onFlightComplete()
  }, [clearPendingDeals, onFlightComplete])

  const hiddenCardIds = new Set<string>(queuedHiddenIds)
  if (activeFlight) hiddenCardIds.add(activeFlight.card.id)
  if (pendingFlightRef.current) hiddenCardIds.add(pendingFlightRef.current.cardId)
  if (pendingDeals) {
    for (const deal of pendingDeals) {
      hiddenCardIds.add(deal.card.id)
    }
  }
  for (const flight of landedTableFlights) {
    hiddenCardIds.add(flight.card.id)
  }

  const viewer = useMemo(
    () => view.players.find((player) => Array.isArray(player.hand)),
    [view.players],
  )
  const viewerPlayerId = viewer?.id ?? HUMAN_PLAYER_ID
  const viewerHand = useMemo(
    () => (viewer && Array.isArray(viewer.hand) ? viewer.hand : []),
    [viewer],
  )
  const opponent = view.players.find((player) => player.id !== viewerPlayerId)
  const isViewerPlayer = useCallback(
    (playerId: string | undefined): boolean => Boolean(playerId && playerId === viewerPlayerId),
    [viewerPlayerId],
  )
  const opponentHandCount =
    opponent && "count" in opponent.hand
      ? opponent.hand.count
      : Array.isArray(opponent?.hand)
        ? opponent.hand.length
        : 0
  const opponentVisibleHandCount = isDealAnimating
    ? revealedOpponentCards
    : isTakeAnimating && takeTakerId !== HUMAN_PLAYER_ID
      ? takeHandBase + landedTakeCards
      : opponentHandCount

  const startFlight = useCallback(
    (pending: PendingFlight) => {
      let to: Rect | null = pending.target ?? null
      let from = pending.from

      if (!to) {
        if (isDealFlightRole(pending.role)) {
          const deckFrom = measureElement(getDeckPileSelector())
          if (deckFrom) from = deckFrom

          if (isViewerPlayer(pending.playerId)) {
            const human = view.players.find((player) => player.id === viewerPlayerId)
            const handContainer = measureElement(getPlayerHandSelector())
            to = measureElement(getHandCardSelector(pending.cardId))
            if (!to && human && Array.isArray(human.hand) && handContainer) {
              const cardIndex = human.hand.findIndex((card) => card.id === pending.cardId)
              if (cardIndex >= 0) {
                to = estimateHandCardRect(
                  handContainer,
                  cardIndex,
                  human.hand.length,
                  getPlayerHandOverlapRem(human.hand.length),
                )
              }
            }
          } else {
            const handContainer = measureElement(getOpponentHandSelector())
            if (handContainer) {
              const targetCount = Math.max(revealedOpponentCards + 1, 1)
              to = estimateHandCardRect(
                handContainer,
                revealedOpponentCards,
                targetCount,
                getPlayerHandOverlapRem(targetCount),
              )
            }
          }
        } else if (isDiscardFlightRole(pending.role)) {
          to = measureElement(getDiscardPileSelector())
        } else if (isTakeFlightRole(pending.role)) {
          if (isViewerPlayer(pending.playerId)) {
            const human = view.players.find((player) => player.id === viewerPlayerId)
            const handContainer = measureElement(getPlayerHandSelector())
            if (pending.cardId) {
              to = measureElement(getHandCardSelector(pending.cardId))
            }
            if (
              !to &&
              human &&
              Array.isArray(human.hand) &&
              handContainer &&
              pending.handSlotIndex !== undefined
            ) {
              to = estimateHandCardRect(
                handContainer,
                pending.handSlotIndex,
                human.hand.length,
                getHandOverlapRem(human.hand.length),
              )
            }
          } else {
            const handContainer = measureElement(getOpponentHandSelector())
            if (handContainer && pending.handSlotIndex !== undefined) {
              const targetCount = pending.handSlotIndex + 1
              to = estimateHandCardRect(
                handContainer,
                pending.handSlotIndex,
                targetCount,
                getPlayerHandOverlapRem(targetCount),
              )
            }
          }
        } else if (isTableFlightRole(pending.role)) {
          to = measureElement(getTableCardSelector(pending.cardId, pending.role))
          if (!to) {
            to = measureElement(getTableDropTargetSelector())
          }
        }
      }

      if (!to) return false

      const card = pending.card ?? findCardInView(view, pending.cardId)
      if (!card) return false

      setActiveFlight({
        card,
        from,
        to,
        faceDown: pending.faceDown ?? false,
        role: pending.role,
        playerId: pending.playerId,
        transition:
          isDealFlightRole(pending.role) ||
          isDiscardFlightRole(pending.role) ||
          isTakeFlightRole(pending.role)
            ? dealCardTransition
            : undefined,
      })
      return true
    },
    [view, opponentHandCount, revealedOpponentCards, isViewerPlayer, viewerPlayerId],
  )

  useEffect(() => {
    activeFlightRef.current = activeFlight
  }, [activeFlight])

  const tryStartPendingFlight = useCallback(() => {
    if (activeFlightRef.current || !pendingFlightRef.current) {
      return
    }

    const pending = pendingFlightRef.current
    const started = startFlight(pending)
    if (started) {
      pendingFlightRef.current = null
    }
  }, [startFlight])

  const enqueueFlights = useCallback(
    (
      flights: PendingFlight[],
      options?: {
        isDeal?: boolean
        isTake?: boolean
        takeHandBase?: number
        takerId?: string
      },
    ) => {
    if (flights.length === 0) return

    if (options?.isDeal) {
      setIsDealAnimating(true)
      const botDealCount = flights.filter(
        (flight) =>
          isDealFlightRole(flight.role) &&
          flight.playerId &&
          !isViewerPlayer(flight.playerId),
      ).length
      setRevealedOpponentCards(Math.max(0, opponentHandCount - botDealCount))
    }

    if (options?.isTake) {
      setIsTakeAnimating(true)
      setTakeHandBase(options.takeHandBase ?? 0)
      setTakeTakerId(options.takerId ?? null)
      setLandedTakeCards(0)
    }

    const [first, ...rest] = flights
    pendingFlightRef.current = first ?? null
    flightQueueRef.current = rest
    setQueuedHiddenIds(flights.map((flight) => flight.cardId))

    requestAnimationFrame(() => {
      tryStartPendingFlight()
    })
  },
  [opponentHandCount, isViewerPlayer, tryStartPendingFlight],
)

  const handleFlightComplete = useCallback(() => {
    const completedFlight = activeFlight
    setActiveFlight(null)

    if (
      completedFlight &&
      isDealFlightRole(completedFlight.role) &&
      completedFlight.playerId &&
      !isViewerPlayer(completedFlight.playerId)
    ) {
      setRevealedOpponentCards((count) => count + 1)
    }

    if (completedFlight && isTakeFlightRole(completedFlight.role)) {
      setLandedTakeCards((count) => count + 1)
    }

    const next = flightQueueRef.current.shift()
    if (next) {
      pendingFlightRef.current = next
      setQueuedHiddenIds([
        next.cardId,
        ...flightQueueRef.current.map((flight) => flight.cardId),
      ])
      return
    }

    if (completedFlight?.role && isTableFlightRole(completedFlight.role)) {
      setLandedTableFlights((current) => {
        const hasCard = current.some((flight) => flight.card.id === completedFlight.card.id)
        if (hasCard) {
          return current
        }

        return [
          ...current,
          {
            ...completedFlight,
            from: completedFlight.to,
          },
        ]
      })
    }

    setQueuedHiddenIds([])
    setIsDealAnimating(false)
    setIsTakeAnimating(false)
    setTakeTakerId(null)
    setLandedTakeCards(0)

    if (useGameStore.getState().pendingDeals?.length) {
      return
    }

    onFlightComplete()
  }, [activeFlight, isViewerPlayer, onFlightComplete])

  useEffect(() => {
    if (!landedTableFlights.length) {
      return
    }

    const tableCardIds = new Set<string>()
    for (const pair of view.table) {
      tableCardIds.add(pair.attack.id)
      if (pair.defense) {
        tableCardIds.add(pair.defense.id)
      }
    }

    setLandedTableFlights((current) => {
      const filtered = current.filter((flight) => !tableCardIds.has(flight.card.id))
      return filtered.length === current.length ? current : filtered
    })
  }, [landedTableFlights.length, view.table])

  useLayoutEffect(() => {
    if (!pendingBotPass) return
    if (activeFlight || pendingFlightRef.current || flightQueueRef.current.length > 0) {
      return
    }

    const flights = buildDiscardFlights(view)
    if (flights.length > 0) {
      enqueueFlights(flights)
    }
    commitBotPass()

    if (flights.length === 0) {
      requestAnimationFrame(() => {
        recoverStuckAnimation()
      })
    }
  }, [pendingBotPass, view.table, activeFlight, commitBotPass, enqueueFlights, recoverStuckAnimation])

  useLayoutEffect(() => {
    if (!pendingBotTake) return
    if (activeFlight || pendingFlightRef.current || flightQueueRef.current.length > 0) {
      return
    }

    const flights = buildTakeFlights(view, opponentHandCount)
    if (flights.length > 0) {
      enqueueFlights(flights, {
        isTake: true,
        takeHandBase: opponentHandCount,
        takerId: BOT_PLAYER_ID,
      })
    }
    commitBotTake()

    if (flights.length === 0) {
      requestAnimationFrame(() => {
        recoverStuckAnimation()
      })
    }
  }, [pendingBotTake, view.table, opponentHandCount, activeFlight, commitBotTake, enqueueFlights, recoverStuckAnimation])

  useLayoutEffect(() => {
    if (!pendingDeals?.length) return
    if (activeFlight || pendingFlightRef.current || flightQueueRef.current.length > 0) {
      return
    }

    let cancelled = false
    let attempt = 0

    const tryStartDeals = () => {
      if (cancelled || !useGameStore.getState().pendingDeals?.length) return

      const deckFrom = measureElement(getDeckPileSelector())
      if (!deckFrom) {
        attempt += 1
        if (attempt >= DEALS_START_MAX_ATTEMPTS) {
          clearPendingDeals()
          recoverStuckAnimation()
          return
        }

        requestAnimationFrame(tryStartDeals)
        return
      }

      const deals = useGameStore.getState().pendingDeals
      if (!deals?.length) return

      const flights: PendingFlight[] = deals.map((deal) => ({
        cardId: deal.card.id,
        card: deal.card,
        playerId: deal.playerId,
        from: deckFrom,
        role: FLIGHT_ROLE.deal,
        faceDown: !isViewerPlayer(deal.playerId),
      }))

      clearPendingDeals()
      enqueueFlights(flights, FLIGHT_ENQUEUE.deal)
    }

    tryStartDeals()
    return () => {
      cancelled = true
    }
  }, [pendingDeals, activeFlight, clearPendingDeals, enqueueFlights, isViewerPlayer, recoverStuckAnimation])

  useLayoutEffect(() => {
    if (activeFlight || !pendingFlightRef.current) return

    let cancelled = false
    let attempt = 0

    const tryStart = () => {
      if (cancelled || activeFlight || !pendingFlightRef.current) return

      const pending = pendingFlightRef.current
      const started = startFlight(pending)
      if (started) {
        pendingFlightRef.current = null
        return
      }

      const maxAttempts = isTableFlightRole(pending.role)
        ? TABLE_FLIGHT_START_MAX_ATTEMPTS
        : DEFAULT_FLIGHT_START_MAX_ATTEMPTS

      attempt += 1
      if (attempt >= maxAttempts) {
        recoverStuckAnimation()
        return
      }

      requestAnimationFrame(tryStart)
    }

    tryStart()
    return () => {
      cancelled = true
    }
  }, [view.table, view.players, queuedHiddenIds, opponentVisibleHandCount, activeFlight, startFlight, recoverStuckAnimation])

  useLayoutEffect(() => {
    if (!botFlightSourceRef.current || !botFlightCardIdRef.current) return

    const source = botFlightSourceRef.current
    const cardId = botFlightCardIdRef.current
    let cancelled = false
    let attempt = 0

    const tryStartBotFlight = () => {
      if (cancelled || !botFlightSourceRef.current || botFlightCardIdRef.current !== cardId) {
        return
      }

      const currentView = useGameStore.getState().view ?? view
      const role = getTableRoleForCard(currentView, cardId)
      const card = role ? findCardInView(currentView, cardId) : null
      const to = role ? measureElement(getTableCardSelector(cardId, role)) : null

      if (role && card && to) {
        setActiveFlight({
          card,
          from: source,
          to,
          faceDown: true,
          role,
        })
        botFlightSourceRef.current = null
        botFlightCardIdRef.current = null
        return
      }

      attempt += 1
      if (attempt >= BOT_FLIGHT_START_MAX_ATTEMPTS) {
        botFlightSourceRef.current = null
        botFlightCardIdRef.current = null
        recoverStuckAnimation()
        return
      }

      requestAnimationFrame(tryStartBotFlight)
    }

    tryStartBotFlight()
    return () => {
      cancelled = true
    }
  }, [view, recoverStuckAnimation])

  const handleBotCardReady = useCallback(
    (from: Rect, cardId: string) => {
      botFlightSourceRef.current = from
      botFlightCardIdRef.current = cardId
      commitBotMove()
    },
    [commitBotMove],
  )

  useEffect(() => {
    if (!isAnimating) return

    const timeoutId = window.setTimeout(() => {
      if (useGameStore.getState().isAnimating) {
        recoverStuckAnimation()
      }
    }, ANIMATION_STUCK_TIMEOUT_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [isAnimating, recoverStuckAnimation, view.currentPlayerId, view.phase])

  const playCardMove = useCallback(
    (cardId: string, element: HTMLElement, role: TableFlightRole) => {
      const move = view.legalMoves.find((entry) => entry.cardId === cardId)
      if (!move || isAnimating) return
      const handCard = viewerHand.find((card) => card.id === cardId)
      const target = measureElement(getTableDropTargetSelector()) ?? undefined
      let resolvedTarget = target

      if (target && move.command.type === GAME_COMMAND_TYPE.attack) {
        if (view.table.length < TABLE_MAX_SINGLE_ROW_PAIRS) {
          resolvedTarget = {
            ...target,
            x: target.x + (view.table.length * remToPx(TABLE_ATTACK_STEP_REM)) / 2,
          }
        }
      }

      if (move.command.type === GAME_COMMAND_TYPE.defend) {
        const defendedPair = view.table[move.command.pairIndex]
        if (defendedPair) {
          const attackRect = measureElement(
            getTableCardSelector(defendedPair.attack.id, FLIGHT_ROLE.attack),
          )
          if (attackRect) {
            resolvedTarget = {
              x: attackRect.x + remToPx(TABLE_DEFENSE_OFFSET_X_REM),
              y: attackRect.y + remToPx(TABLE_DEFENSE_OFFSET_Y_REM),
              width: attackRect.width,
              height: attackRect.height,
            }
          }
        }
      }

      enqueueFlights([
        {
          cardId,
          card: handCard,
          from: toRect(element.getBoundingClientRect()),
          target: resolvedTarget,
          role,
        },
      ])
      executeCommand(move.command, gameId)
    },
    [view.legalMoves, view.table, isAnimating, executeCommand, enqueueFlights, gameId, viewerHand],
  )

  const handleCardClick = useCallback(
    (cardId: string, element: HTMLElement) => {
      if (isAnimating) return

      const move = view.legalMoves.find((entry) => entry.cardId === cardId)
      if (!move) return

      if (move.command.type === GAME_COMMAND_TYPE.throwIn) {
        const legalThrowInCardIds = new Set(
          view.legalMoves.flatMap((entry) =>
            entry.command.type === GAME_COMMAND_TYPE.throwIn && entry.cardId
              ? [entry.cardId]
              : [],
          ),
        )
        const human = view.players.find((player) => Array.isArray(player.hand))
        const selectedCard =
          human && Array.isArray(human.hand)
            ? human.hand.find((card) => card.id === cardId)
            : null
        const defender = view.players.find((player) => player.isDefender)
        const defenderHandSize = defender
          ? Array.isArray(defender.hand)
            ? defender.hand.length
            : defender.hand.count
          : 0
        const tableSlotsLeft = Math.max(
          0,
          Math.min(MAX_TABLE_PAIRS, defenderHandSize) - view.table.length,
        )

        const groupedCardIds =
          selectedCard && human && Array.isArray(human.hand)
            ? human.hand
                .filter(
                  (card) =>
                    card.rank === selectedCard.rank && legalThrowInCardIds.has(card.id),
                )
                .slice(0, tableSlotsLeft)
                .map((card) => card.id)
            : [cardId]
        const cardIds = groupedCardIds.length > 0 ? groupedCardIds : [cardId]
        const clickedCardRect = toRect(element.getBoundingClientRect())
        const cardsById = new Map(viewerHand.map((card) => [card.id, card]))
        const baseTarget = measureElement(getTableDropTargetSelector()) ?? undefined

        enqueueFlights(
          cardIds.map((id, index) => {
            let target = baseTarget

            if (baseTarget) {
              const targetPairIndex = view.table.length + index
              if (targetPairIndex < TABLE_MAX_SINGLE_ROW_PAIRS) {
                target = {
                  ...baseTarget,
                  x: baseTarget.x + (targetPairIndex * remToPx(TABLE_ATTACK_STEP_REM)) / 2,
                }
              }
            }

            return {
              cardId: id,
              card: cardsById.get(id),
              from:
                id === cardId
                  ? clickedCardRect
                  : (measureElement(getHandCardSelector(id)) ?? clickedCardRect),
              target,
              role: FLIGHT_ROLE.attack,
            }
          }),
        )
        executeCommand({ type: GAME_COMMAND_TYPE.throwIn, cardIds }, gameId)
        return
      }

      const role =
        move.command.type === GAME_COMMAND_TYPE.defend
          ? FLIGHT_ROLE.defense
          : FLIGHT_ROLE.attack
      playCardMove(cardId, element, role)
    },
    [
      view.legalMoves,
      view.players,
      view.table.length,
      isAnimating,
      executeCommand,
      enqueueFlights,
      playCardMove,
      gameId,
      viewerHand,
    ],
  )

  const handlePass = useCallback(() => {
    if (isAnimating) return

    const canPass = view.legalMoves.some(
      (move) => move.command.type === GAME_COMMAND_TYPE.pass,
    )
    if (!canPass) return

    const flights = buildDiscardFlights(view)
    if (flights.length > 0) {
      enqueueFlights(flights)
    }
    executeCommand({ type: GAME_COMMAND_TYPE.pass }, gameId)
  }, [isAnimating, view, enqueueFlights, executeCommand, gameId])

  const handleTake = useCallback(() => {
    if (isAnimating) return

    const canTake = view.legalMoves.some(
      (move) => move.command.type === GAME_COMMAND_TYPE.take,
    )
    if (!canTake) return

    const human = view.players.find((player) => Array.isArray(player.hand))
    const handCount =
      human && Array.isArray(human.hand) ? human.hand.length : 0
    const flights = buildTakeFlights(view, handCount, human?.id ?? HUMAN_PLAYER_ID)

    if (flights.length > 0) {
      enqueueFlights(flights, {
        isTake: true,
        takeHandBase: handCount,
        takerId: human?.id ?? HUMAN_PLAYER_ID,
      })
    }
    executeCommand({ type: GAME_COMMAND_TYPE.take }, gameId)
  }, [isAnimating, view, enqueueFlights, executeCommand, gameId])

  return {
    activeFlight,
    landedTableFlights,
    hiddenCardIds,
    isAnimating,
    isDealAnimating,
    opponentVisibleHandCount,
    handleBotCardReady,
    handleCardClick,
    handlePass,
    handleTake,
    handleFlightComplete,
  }
}
