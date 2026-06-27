export const API_BASE_URL = import.meta.env.VITE_API_URL ?? "/api"
export const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ??
  (typeof window === "undefined" ? "http://localhost:3001" : window.location.origin)
