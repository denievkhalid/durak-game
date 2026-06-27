import { AnimatePresence, motion } from "framer-motion"
import type { PlayerViewDTO } from "@durakjs/engine"
import { cn } from "@/shared/lib"

type PlayerAvatarProps = {
  player: PlayerViewDTO
  actionLabel?: string | null | undefined
}

function getInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?"
}

function getAvatarStyles(player: PlayerViewDTO): string {
  if (player.isAttacker) {
    return "border-emerald-400/70 bg-gradient-to-br from-emerald-500 to-emerald-800 ring-2 ring-emerald-300/50"
  }

  return "border-zinc-700 bg-black"
}

export function PlayerAvatar({ player, actionLabel }: PlayerAvatarProps) {
  return (
    <div className="flex items-center gap-2 pb-1 pt-1">
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold text-white shadow-md transition-all duration-300",
          getAvatarStyles(player),
        )}
        aria-hidden
      >
        {getInitial(player.name)}
      </div>

      <div className="relative flex min-w-0 flex-col items-start">
        <AnimatePresence>
          {actionLabel && (
            <motion.span
              key={`${player.id}-action`}
              initial={{ opacity: 0, y: 4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 2, scale: 0.95 }}
              transition={{ duration: 0.18 }}
              className="absolute bottom-full left-0 z-10 mb-1 whitespace-nowrap rounded-full border border-slate-600 bg-black px-2.5 py-0.5 text-xs font-medium text-white shadow-md"
            >
              {actionLabel}
            </motion.span>
          )}
        </AnimatePresence>

        <span className="max-w-24 truncate text-sm font-medium text-slate-200">{player.name}</span>
      </div>
    </div>
  )
}
