import { RouterProvider } from "react-router-dom"

import { ToastViewport } from "@/shared/ui"
import { QueryProvider } from "./providers/query-provider"
import { router } from "./router"
import "@/app/styles/index.css"

export function App() {
  return (
    <QueryProvider>
      <RouterProvider router={router} />
      <ToastViewport />
    </QueryProvider>
  )
}
