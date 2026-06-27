import { AnimatePresence, motion } from "framer-motion"
import { useToastStore } from "./toast-store"

export function ToastViewport() {
  const toasts = useToastStore((store) => store.toasts)
  const dismiss = useToastStore((store) => store.dismiss)

  return (
    <div className="pointer-events-none fixed top-4 left-1/2 z-[60] flex w-full max-w-sm -translate-x-1/2 flex-col items-center gap-2 px-3">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, x: 24, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 16, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-auto cursor-pointer rounded-lg border border-slate-700 bg-black px-4 py-2.5 text-sm text-white shadow-lg"
            onClick={() => dismiss(toast.id)}
          >
            {toast.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
