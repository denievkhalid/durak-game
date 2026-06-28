import { useCallback } from "react"
import type { GameViewDTO } from "@durakjs/engine"
import { PlayerAvatar } from "@/entities/player"
import { PlayerHand } from "@/entities/player-hand"
import { FlyingCardOverlay } from "@/features/card-flight"
import { LandedCardOverlay } from "@/features/card-flight"
import { useCardFlight } from "@/features/card-flight/model/use-card-flight"
import { useGameStore } from "@/features/game-model"
import { useTurnTimer } from "@/features/turn-timer"
import { PassActionButton, SurrenderActionButton, TakeActionButton } from "@/widgets/game-action-bar"
import { GameHeader } from "@/widgets/game-header"
import { GameResult } from "@/widgets/game-result"
import { OpponentPanel } from "@/widgets/opponent-panel"
import { TableArea } from "@/widgets/table-area"

type GameBoardProps = {
  view: GameViewDTO
  gameId?: string
}

export function GameBoard({ view, gameId }: GameBoardProps) {
  const pendingBotMove = useGameStore((store) => store.pendingBotMove)
  const forfeitTurn = useGameStore((store) => store.forfeitTurn)
  const surrenderGame = useGameStore((store) => store.surrenderGame)
  const {
    activeFlight,
    landedTableFlights,
    hiddenCardIds,
    isAnimating,
    opponentVisibleHandCount,
    handleBotCardReady,
    handleCardClick,
    handlePass,
    handleTake,
    handleFlightComplete,
  } = useCardFlight(view, gameId)

  const human = view.players.find((player) => Array.isArray(player.hand))
  const opponent = view.players.find((player) => !Array.isArray(player.hand))
  const playableIds = new Set(
    view.legalMoves.map((move) => move.cardId).filter(Boolean),
  )

  const canTake = view.legalMoves.some((move) => move.command.type === "take")
  const canPass = view.legalMoves.some((move) => move.command.type === "pass")
  const isHumanTurn = human ? view.currentPlayerId === human.id : false

  const handleTurnTimeout = useCallback(() => {
    forfeitTurn(gameId)
  }, [forfeitTurn, gameId])

  const handleSurrender = useCallback(() => {
    if (!human) {
      return
    }

    surrenderGame(human.id, gameId)
  }, [gameId, human, surrenderGame])

  const { secondsLeft, isRunning } = useTurnTimer({
    view,
    humanPlayerId: human?.id,
    isAnimating,
    onTimeout: handleTurnTimeout,
  })

  return (
    <>
      {activeFlight && (
        <FlyingCardOverlay flight={activeFlight} onComplete={handleFlightComplete} />
      )}
      {landedTableFlights.map((flight) => (
        <LandedCardOverlay key={flight.card.id} flight={flight} />
      ))}

      <div className="mx-auto flex h-dvh w-full max-w-5xl flex-col overflow-hidden px-3 py-2 sm:px-4">
        <GameHeader
          view={view}
          opponent={opponent}
          isHumanTurn={isHumanTurn}
          secondsLeft={secondsLeft}
          showTimer={isRunning}
        />

        <main className="relative min-h-0 flex-1 overflow-visible">
          <section className="absolute inset-x-0 top-0 z-20 flex justify-center">
            {opponent && (
              <OpponentPanel
                player={opponent}
                handCount={opponentVisibleHandCount}
                pendingBotMove={pendingBotMove}
                onBotCardReady={handleBotCardReady}
              />
            )}
          </section>

          <section className="absolute inset-x-0 top-1/2 z-10 flex -translate-y-1/2 flex-col items-center px-1">
            <TableArea table={view.table} hiddenCardIds={hiddenCardIds} />
          </section>

          <section className="absolute inset-x-0 bottom-0 z-20 overflow-visible px-1 pb-2 pt-1">
            {human && (
              <div className="flex flex-col items-center gap-4">
                <PlayerHand
                  player={human}
                  playableIds={playableIds}
                  hiddenCardIds={hiddenCardIds}
                  onCardClick={handleCardClick}
                  disabled={isAnimating}
                />
                <PlayerAvatar player={human} />
              </div>
            )}
          </section>
        </main>
      </div>

      {view.phase !== "finished" && (
        <div className="fixed right-4 bottom-4 z-30 flex items-center gap-3">
          {isHumanTurn && canTake && <TakeActionButton onClick={handleTake} disabled={isAnimating} />}
          {isHumanTurn && canPass && <PassActionButton onClick={handlePass} disabled={isAnimating} />}
          <SurrenderActionButton onClick={handleSurrender} disabled={isAnimating} />
        </div>
      )}

      <GameResult view={view} gameId={gameId} />
    </>
  )
}
