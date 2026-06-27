import { useEffect, useState } from "react"
import Modal from "react-modal"
import { Link, useNavigate } from "react-router-dom"
import { useMutation } from "@tanstack/react-query"
import type { GameViewDTO } from "@durakjs/engine"
import { requestRematch, type RematchResponse } from "@/features/create-game/api/game-api"
import { getGameSocket } from "@/features/game-session/lib/game-socket"
import type {
  GameOpponentLeftPayload,
  GameRematchPayload,
} from "@/features/game-session/lib/game-socket.types"
import { ROUTES } from "@/shared/config/routes"
import { getApiErrorMessage } from "@/shared/lib/api-error"
import { cn } from "@/shared/lib"
import { Button } from "@/shared/ui"

type GameResultProps = {
  view: GameViewDTO
  gameId?: string | undefined
}

export function GameResult({ view, gameId }: GameResultProps) {
  const navigate = useNavigate()
  const [rematch, setRematch] = useState<GameRematchPayload | null>(null)
  const [opponentLeft, setOpponentLeft] = useState(false)
  const human = view.players.find((player) => Array.isArray(player.hand))
  const isWinner = Boolean(human && view.winnerId === human.id)
  const isOpen = view.phase === "finished"
  const rematchMutation = useMutation({
    mutationFn: () => {
      if (!gameId) {
        throw new Error("Не удалось определить игру")
      }

      return requestRematch(gameId)
    },
    onSuccess: (response: RematchResponse) => {
      if (response.status === "started") {
        navigate(ROUTES.game(response.gameId))
        return
      }

      setRematch(response)
    },
  })
  const errorMessage = rematchMutation.error
    ? getApiErrorMessage(rematchMutation.error, "Не удалось запросить реванш")
    : null
  const isRequester =
    rematch?.status === "pending" && human ? rematch.requesterId === human.id : false
  const hasOpponentRequest =
    rematch?.status === "pending" && human ? rematch.opponentId === human.id : false

  useEffect(() => {
    Modal.setAppElement("#root")
  }, [])

  useEffect(() => {
    if (!isOpen) {
      setRematch(null)
      setOpponentLeft(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || !gameId) {
      return
    }

    const socket = getGameSocket()
    const handleRematch = (payload: GameRematchPayload) => {
      setOpponentLeft(false)

      if (payload.status === "started") {
        navigate(ROUTES.game(payload.gameId))
        return
      }

      if (payload.status === "expired") {
        setRematch((current) => {
          if (current?.status === "pending" && current.gameId === payload.gameId) {
            navigate(ROUTES.lobby)
          }

          return current
        })
        return
      }

      setRematch(payload)
    }
    const handleOpponentLeft = (payload: GameOpponentLeftPayload) => {
      if (payload.userId === human?.id) {
        return
      }

      setOpponentLeft(true)
    }

    socket.on("game:rematch", handleRematch)
    socket.on("game:opponent-left", handleOpponentLeft)

    return () => {
      socket.off("game:rematch", handleRematch)
      socket.off("game:opponent-left", handleOpponentLeft)
    }
  }, [gameId, human?.id, isOpen, navigate])

  useEffect(() => {
    if (opponentLeft || rematch?.status !== "pending") {
      return
    }

    const delayMs = Math.max(0, new Date(rematch.expiresAt).getTime() - Date.now())
    const timeoutId = window.setTimeout(() => {
      navigate(ROUTES.lobby)
    }, delayMs)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [navigate, opponentLeft, rematch])

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={() => {}}
      shouldCloseOnOverlayClick={false}
      shouldCloseOnEsc={false}
      contentLabel="Результат игры"
      overlayClassName="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      className={cn(
        "w-full max-w-sm rounded-2xl border px-6 py-5 text-center outline-none",
        isWinner
          ? "border-emerald-800/60 bg-emerald-950 text-emerald-100"
          : "border-red-800/60 bg-red-950 text-red-100",
      )}
    >
      <p className="text-xl font-bold">{isWinner ? "Вы победили!" : "Вы дурак!"}</p>
      {isRequester && (
        <p className="mt-3 text-sm opacity-90">
          {opponentLeft ? "Соперник вышел из комнаты" : "Ждем согласия соперника 30 секунд..."}
        </p>
      )}
      {!isRequester && opponentLeft && (
        <p className="mt-3 text-sm opacity-90">Соперник вышел из комнаты</p>
      )}
      {hasOpponentRequest && (
        <p className="mt-3 text-sm opacity-90">Соперник хочет сыграть еще раз</p>
      )}
      {errorMessage && <p className="mt-3 text-sm opacity-90">{errorMessage}</p>}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button
          onClick={() => rematchMutation.mutate()}
          disabled={!gameId || rematchMutation.isPending || isRequester || opponentLeft}
          className="min-w-32"
        >
          {rematchMutation.isPending
            ? "Отправка..."
            : hasOpponentRequest
              ? "Принять реванш"
              : "Сыграть еще раз"}
        </Button>
        <Link
          className="inline-flex min-w-32 items-center justify-center rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-600"
          to={ROUTES.home}
        >
          На главную
        </Link>
      </div>
    </Modal>
  )
}
