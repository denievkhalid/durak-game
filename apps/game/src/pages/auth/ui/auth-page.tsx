import { Navigate, useSearchParams } from "react-router-dom"

import { LoginForm, RegisterForm } from "@/features/auth"
import { AUTH_QUERY, AUTH_TYPE, ROUTES } from "@/shared/config/routes"

function isAuthType(value: string | null): value is (typeof AUTH_TYPE)[keyof typeof AUTH_TYPE] {
  return value === AUTH_TYPE.login || value === AUTH_TYPE.register
}

export function AuthPage() {
  const [searchParams] = useSearchParams()
  const type = searchParams.get(AUTH_QUERY.type)

  if (!isAuthType(type)) {
    return <Navigate to={ROUTES.auth(AUTH_TYPE.login)} replace />
  }

  const title = type === AUTH_TYPE.login ? "Вход" : "Регистрация"

  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-6 overflow-hidden px-6">
      <div className="flex w-full max-w-sm flex-col items-center gap-2">
        <h1 className="text-3xl font-bold text-white">{title}</h1>
        <p className="text-slate-400">Подкидной дурак</p>
      </div>

      {type === AUTH_TYPE.login ? <LoginForm /> : <RegisterForm />}
    </div>
  )
}
