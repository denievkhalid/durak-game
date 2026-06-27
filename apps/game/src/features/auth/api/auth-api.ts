import { httpClient } from "@/shared/api/http-client"

export type AuthUser = {
  id: string
  email: string
  name: string
}

export type AuthResponse = {
  token: string
  user: AuthUser
}

export type LoginPayload = {
  email: string
  password: string
}

export type RegisterPayload = {
  email: string
  password: string
  name: string
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const { data } = await httpClient.post<AuthResponse>("/auth/login", payload)
  return data
}

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const { data } = await httpClient.post<AuthResponse>("/auth/register", payload)
  return data
}

export async function fetchCurrentUser(): Promise<{ user: AuthUser }> {
  const { data } = await httpClient.get<{ user: AuthUser }>("/auth/me")
  return data
}
