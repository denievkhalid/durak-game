import { CardView } from "@/entities/card"
import { isDealFlightRole, isDiscardFlightRole, isTakeFlightRole } from "../lib/constants"
import { cardLayoutTransition, dealCardTransition } from "@/shared/config/card-motion"
import { motion } from "framer-motion"
import type { FlyingCardOverlayProps } from "./types"

export function FlyingCardOverlay({ flight, onComplete }: FlyingCardOverlayProps) {
  const transition =
    flight.transition ??
    (isDealFlightRole(flight.role) || isDiscardFlightRole(flight.role) || isTakeFlightRole(flight.role)
      ? dealCardTransition
      : cardLayoutTransition)

  return (
    <motion.div
      className="pointer-events-none fixed z-50"
      initial={{
        left: flight.from.x,
        top: flight.from.y,
        width: flight.from.width,
        height: flight.from.height,
      }}
      animate={{
        left: flight.to.x,
        top: flight.to.y,
        width: flight.to.width,
        height: flight.to.height,
      }}
      transition={transition}
      onAnimationComplete={onComplete}
    >
      <CardView
        card={flight.card}
        faceDown={flight.faceDown ?? false}
        className="h-full w-full [&>button]:h-full [&>button]:w-full [&>div]:h-full [&>div]:w-full"
      />
    </motion.div>
  )
}
