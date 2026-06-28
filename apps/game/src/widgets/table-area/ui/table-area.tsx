import type { GameViewDTO } from "@durakjs/engine"
import { CardView } from "@/entities/card"
import { cn } from "@/shared/lib"
import { TABLE_HEIGHT_CLASS, TABLE_WIDTH_CLASS } from "@/shared/config/card-motion"

type TableAreaProps = {
  table: GameViewDTO["table"]
  hiddenCardIds: Set<string>
}

export function TableArea({ table, hiddenCardIds }: TableAreaProps) {
  return (
    <div
      className={cn(
        TABLE_WIDTH_CLASS,
        TABLE_HEIGHT_CLASS,
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-emerald-950/60 bg-black/20 px-8 shadow-inner",
      )}
    >
      <div
        data-card-anchor="table-drop-target"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[5.5rem] w-[3.75rem] -translate-x-1/2 -translate-y-1/2 opacity-0"
      />
      <div className="flex h-full w-full flex-wrap content-center items-center justify-center gap-x-6 gap-y-3 overflow-hidden">
        {table.map((pair, index) => (
          <div key={index} className="relative h-[6.5rem] w-[5.75rem] shrink-0">
            <CardView
              card={pair.attack}
              anchor={`table-attack-${pair.attack.id}`}
              hidden={hiddenCardIds.has(pair.attack.id)}
              className={cn(
                "absolute top-0 origin-center -rotate-6",
                pair.defense ? "left-0" : "left-1/2 -translate-x-1/2",
              )}
            />
            {pair.defense && (
              <CardView
                card={pair.defense}
                anchor={`table-defense-${pair.defense.id}`}
                hidden={hiddenCardIds.has(pair.defense.id)}
                className="absolute left-7 top-4 origin-center rotate-6"
              />
            )}
          </div>
        ))}
      </div>
      {table.length === 0 && (
        <span className="pointer-events-none absolute text-sm font-medium text-emerald-100/70 drop-shadow-sm">
          Стол пуст
        </span>
      )}
    </div>
  )
}
