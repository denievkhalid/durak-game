import { isAxiosError } from "axios"

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const message = error.response?.data?.error
    if (typeof message === "string") {
      return message
    }
  }

  if (error instanceof Error) {
    return error.message
  }

  return fallback
}
