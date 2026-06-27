import { create } from "zustand"

const TOAST_DURATION_MS = 3500

type ToastItem = {
  id: string
  message: string
}

type ToastStore = {
  toasts: ToastItem[]
  show: (message: string) => void
  dismiss: (id: string) => void
}

const dismissTimers = new Map<string, ReturnType<typeof setTimeout>>()

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],

  show: (message) => {
    const id = crypto.randomUUID()
    set((state) => ({ toasts: [...state.toasts, { id, message }] }))

    const timer = setTimeout(() => {
      dismissTimers.delete(id)
      useToastStore.getState().dismiss(id)
    }, TOAST_DURATION_MS)
    dismissTimers.set(id, timer)
  },

  dismiss: (id) => {
    const timer = dismissTimers.get(id)
    if (timer) {
      clearTimeout(timer)
      dismissTimers.delete(id)
    }
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }))
  },
}))

export function showToast(message: string) {
  useToastStore.getState().show(message)
}
