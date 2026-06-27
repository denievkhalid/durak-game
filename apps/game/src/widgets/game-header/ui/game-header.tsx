import type { GameViewDTO, PlayerViewDTO } from "@durakjs/engine"
import { DeckPile } from "@/entities/deck"
import { DiscardPile } from "@/entities/discard-pile"
import { TurnTimer } from "@/features/turn-timer"
import { getPhaseLabel } from "@/shared/lib/game-labels"

type GameHeaderProps = {
  view: GameViewDTO
  opponent?: PlayerViewDTO | null | undefined
  isHumanTurn: boolean
  secondsLeft: number
  showTimer: boolean
}

export function GameHeader({
  view,
  opponent,
  isHumanTurn,
  secondsLeft,
  showTimer,
}: GameHeaderProps) {
  return (
    <header className="relative shrink-0 pb-1">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <h1 className="text-lg font-bold text-white sm:text-xl">Подкидной дурак</h1>
          {opponent && (
            <div className="min-w-0 text-xs text-slate-300 sm:text-sm">
              <p className="truncate font-medium">{opponent.name}</p>
              {opponent.email && <p className="truncate text-slate-400">{opponent.email}</p>}
            </div>
          )}
          <p className="truncate text-xs text-slate-400 sm:text-sm">
            {getPhaseLabel(view.phase, isHumanTurn)}
          </p>
        </div>
        <div className="flex h-card shrink-0 items-center">
          <DeckPile trump={view.trump} />
          <DiscardPile count={view.discardCount} />
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center">
        <TurnTimer secondsLeft={secondsLeft} visible={showTimer} />
      </div>
    </header>
  )
}
