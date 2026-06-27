import { type FormEvent, useState } from "react"
import { Link } from "react-router-dom"

import { useLogin } from "../model/use-login"
import { Button } from "@/shared/ui"
import { AUTH_TYPE, ROUTES } from "@/shared/config/routes"
import { getApiErrorMessage } from "@/shared/lib/api-error"

export function LoginForm() {
  const login = useLogin()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    login.mutate({ email, password })
  }

  const errorMessage = login.error
    ? getApiErrorMessage(login.error, "Не удалось войти")
    : null

  return (
    <form className="flex w-full max-w-sm flex-col gap-4" onSubmit={handleSubmit}>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-slate-300">Email</span>
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none focus:border-emerald-500"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-slate-300">Пароль</span>
        <input
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none focus:border-emerald-500"
        />
      </label>

      {errorMessage && <p className="text-sm text-red-400">{errorMessage}</p>}

      <Button type="submit" disabled={login.isPending}>
        {login.isPending ? "Вход…" : "Войти"}
      </Button>

      <p className="text-center text-sm text-slate-400">
        Нет аккаунта?{" "}
        <Link className="text-emerald-400 hover:text-emerald-300" to={ROUTES.auth(AUTH_TYPE.register)}>
          Зарегистрироваться
        </Link>
      </p>
    </form>
  )
}
