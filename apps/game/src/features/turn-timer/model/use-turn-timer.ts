import { GAME_PHASE, type GameViewDTO } from "@durakjs/engine"
import { TURN_TIMER_SECONDS } from "@/shared/config/game-timing"
import { useEffect, useRef, useState } from "react"

import {
  getSecondsUntilDeadline,
  useTurnTimerStore,
} from "./turn-timer-store"

type UseTurnTimerOptions = {
  view: GameViewDTO | null
  humanPlayerId?: string | null | undefined
  isAnimating: boolean
  onTimeout: () => void
}

let lastActivePlayerId: string | null = null

export { resetTurnTimerSession } from "./turn-timer-store"

export function useTurnTimer({
  view,
  humanPlayerId,
  isAnimating,
  onTimeout,
}: UseTurnTimerOptions) {
  const optimisticDeadlineAt = useTurnTimerStore((store) => store.optimisticDeadlineAt)
  const [localSecondsLeft, setLocalSecondsLeft] = useState(TURN_TIMER_SECONDS)
  const [localTurnEpoch, setLocalTurnEpoch] = useState(0)
  const [serverSecondsLeft, setServerSecondsLeft] = useState(TURN_TIMER_SECONDS)
  const onTimeoutRef = useRef(onTimeout)
  const firedRef = useRef(false)
  onTimeoutRef.current = onTimeout

  const isHumanTurn = Boolean(
    view && humanPlayerId && view.currentPlayerId === humanPlayerId,
  )
  const usesServerTimer = Boolean(view?.turnDeadlineAt)
  const serverDeadline =
    optimisticDeadlineAt !== undefined ? optimisticDeadlineAt : (view?.turnDeadlineAt ?? null)
  const totalSeconds = view?.turnDurationSeconds ?? TURN_TIMER_SECONDS
  const secondsLeft = usesServerTimer ? serverSecondsLeft : localSecondsLeft
  const canTriggerTimeout = isHumanTurn
  const isRunning = Boolean(
    view &&
      !isAnimating &&
      view.phase !== GAME_PHASE.finished &&
      (usesServerTimer ? Boolean(serverDeadline) : true),
  )

  useEffect(() => {
    if (!view || !humanPlayerId) {
      lastActivePlayerId = null
      return
    }

    if (view.currentPlayerId === humanPlayerId && lastActivePlayerId !== humanPlayerId) {
      setLocalTurnEpoch((epoch) => epoch + 1)
    }

    lastActivePlayerId = view.currentPlayerId
  }, [humanPlayerId, view?.currentPlayerId])

  useEffect(() => {
    if (usesServerTimer) {
      return
    }

    setLocalSecondsLeft(TURN_TIMER_SECONDS)
    firedRef.current = false
  }, [localTurnEpoch, usesServerTimer])

  useEffect(() => {
    if (!usesServerTimer || !isRunning) {
      return
    }

    const syncSeconds = () => {
      setServerSecondsLeft(getSecondsUntilDeadline(serverDeadline))
    }

    syncSeconds()
    firedRef.current = false

    const intervalId = window.setInterval(syncSeconds, 250)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [isRunning, serverDeadline, usesServerTimer, view?.currentPlayerId])

  useEffect(() => {
    if (usesServerTimer || !isRunning) {
      return
    }

    const intervalId = window.setInterval(() => {
      setLocalSecondsLeft((previous) => {
        if (previous <= 1) {
          return 0
        }

        return previous - 1
      })
    }, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [isRunning, localTurnEpoch, usesServerTimer])

  useEffect(() => {
    if (!isRunning || !canTriggerTimeout || secondsLeft > 0 || firedRef.current) {
      return
    }

    firedRef.current = true
    onTimeoutRef.current()
  }, [canTriggerTimeout, isRunning, secondsLeft])

  return {
    secondsLeft,
    isRunning,
    totalSeconds,
  }
}
