import axios from "axios"

import { API_BASE_URL } from "@/shared/config/api"
import { getAccessToken } from "@/shared/lib/auth-token"

export const httpClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
})

httpClient.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})
