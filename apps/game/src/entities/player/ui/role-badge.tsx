import { cn } from "@/shared/lib"

type RoleBadgeProps = {
  children: string
  tone: "attack" | "defend"
}

export function RoleBadge({ children, tone }: RoleBadgeProps) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs",
        tone === "attack" && "bg-orange-900/70 text-orange-100",
        tone === "defend" && "bg-blue-900/70 text-blue-100",
      )}
    >
      {children}
    </span>
  )
}
