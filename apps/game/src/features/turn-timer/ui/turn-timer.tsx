type TurnTimerProps = {
  secondsLeft: number
  visible: boolean
}

export function TurnTimer({ secondsLeft, visible }: TurnTimerProps) {
  if (!visible) {
    return null
  }

  const isLow = secondsLeft <= 10
  const label = `0:${String(secondsLeft).padStart(2, "0")}`

  return (
    <div
      className="rounded-2xl border border-emerald-950/60 bg-black/20 px-3 py-1 text-sm font-medium tabular-nums shadow-inner backdrop-blur-sm"
      aria-live="polite"
      aria-label={`Осталось ${secondsLeft} секунд`}
    >
      <span className={isLow ? "text-red-300" : "text-white"}>{label}</span>
    </div>
  )
}
