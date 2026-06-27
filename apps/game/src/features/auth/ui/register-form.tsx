import { type FormEvent, useState } from "react"
import { Link } from "react-router-dom"

import { useRegister } from "../model/use-register"
import { Button } from "@/shared/ui"
import { AUTH_TYPE, ROUTES } from "@/shared/config/routes"
import { getApiErrorMessage } from "@/shared/lib/api-error"

export function RegisterForm() {
  const registerMutation = useRegister()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    registerMutation.mutate({ name, email, password })
  }

  const errorMessage = registerMutation.error
    ? getApiErrorMessage(registerMutation.error, "Не удалось зарегистрироваться")
    : null

  return (
    <form className="flex w-full max-w-sm flex-col gap-4" onSubmit={handleSubmit}>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-slate-300">Имя</span>
        <input
          type="text"
          autoComplete="name"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none focus:border-emerald-500"
        />
      </label>

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
          autoComplete="new-password"
          required
          minLength={6}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none focus:border-emerald-500"
        />
      </label>

      {errorMessage && <p className="text-sm text-red-400">{errorMessage}</p>}

      <Button type="submit" disabled={registerMutation.isPending}>
        {registerMutation.isPending ? "Регистрация…" : "Зарегистрироваться"}
      </Button>

      <p className="text-center text-sm text-slate-400">
        Уже есть аккаунт?{" "}
        <Link className="text-emerald-400 hover:text-emerald-300" to={ROUTES.auth(AUTH_TYPE.login)}>
          Войти
        </Link>
      </p>
    </form>
  )
}
