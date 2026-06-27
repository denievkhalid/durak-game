import type { ButtonHTMLAttributes } from "react"
import { cn } from "@/shared/lib"

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost"
}

const variantClass = {
  primary: "bg-emerald-600 text-white hover:bg-emerald-500",
  secondary: "bg-slate-700 text-white hover:bg-slate-600",
  ghost: "bg-transparent text-slate-200 hover:bg-slate-800",
}

export function Button({
  variant = "primary",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        variantClass[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
