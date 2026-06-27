import type { PlayerViewDTO } from "@durakjs/engine"
import { RoleBadge } from "./role-badge"

type PlayerStatusProps = {
  player: PlayerViewDTO
  self?: boolean
}

export function PlayerStatus({ player, self = false }: PlayerStatusProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-slate-300">
      <span className="font-medium">{player.name}</span>
      {player.isAttacker && (
        <RoleBadge tone="attack">{self ? "атакуете" : "атакует"}</RoleBadge>
      )}
      {player.isDefender && (
        <RoleBadge tone="defend">{self ? "отбиваетесь" : "отбивается"}</RoleBadge>
      )}
    </div>
  )
}
