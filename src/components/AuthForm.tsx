"use client";

import Link from "next/link";
import { useActionState } from "react";
import { KeyRound, LoaderCircle, LogIn, Mail, UserRound } from "lucide-react";
import {
  loginAction,
  requestPasswordResetAction,
  signupAction,
  updatePasswordAction,
} from "@/app/auth/actions";
import type { AuthActionState } from "@/types/auth";

const initialState: AuthActionState = {};

type AuthMode = "login" | "signup" | "reset" | "update-password";

export function AuthForm({ mode, next = "/membros" }: { mode: AuthMode; next?: string }) {
  const action =
    mode === "signup"
      ? signupAction
      : mode === "reset"
        ? requestPasswordResetAction
        : mode === "update-password"
          ? updatePasswordAction
          : loginAction;

  const [state, formAction, pending] = useActionState(action, initialState);
  const isLogin = mode === "login";
  const isSignup = mode === "signup";
  const isReset = mode === "reset";
  const isUpdate = mode === "update-password";

  return (
    <form className="auth-form" action={formAction}>
      {isLogin ? <input type="hidden" name="next" value={next} /> : null}

      {isSignup ? (
        <label className="auth-field">
          <span>Seu nome</span>
          <div>
            <UserRound size={18} />
            <input name="fullName" type="text" autoComplete="name" required placeholder="Como devemos chamar você?" />
          </div>
        </label>
      ) : null}

      {!isUpdate ? (
        <label className="auth-field">
          <span>E-mail</span>
          <div>
            <Mail size={18} />
            <input name="email" type="email" autoComplete="email" required placeholder="voce@exemplo.com" />
          </div>
        </label>
      ) : null}

      {!isReset ? (
        <label className="auth-field">
          <span>{isUpdate ? "Nova senha" : "Senha"}</span>
          <div>
            <KeyRound size={18} />
            <input
              name="password"
              type="password"
              autoComplete={isLogin ? "current-password" : "new-password"}
              minLength={8}
              required
              placeholder="Mínimo de 8 caracteres"
            />
          </div>
        </label>
      ) : null}

      {isSignup || isUpdate ? (
        <label className="auth-field">
          <span>Confirmar senha</span>
          <div>
            <KeyRound size={18} />
            <input
              name="passwordConfirmation"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              placeholder="Digite a senha novamente"
            />
          </div>
        </label>
      ) : null}

      {state.error ? <p className="auth-message auth-message--error">{state.error}</p> : null}
      {state.success ? <p className="auth-message auth-message--success">{state.success}</p> : null}

      <button className="button button--primary auth-submit" type="submit" disabled={pending}>
        {pending ? <LoaderCircle className="auth-spinner" size={18} /> : isLogin ? <LogIn size={18} /> : <KeyRound size={18} />}
        {pending
          ? "Aguarde..."
          : isLogin
            ? "Entrar"
            : isSignup
              ? "Criar conta"
              : isReset
                ? "Enviar instruções"
                : "Atualizar senha"}
      </button>

      {isLogin ? (
        <div className="auth-links">
          <Link href="/recuperar-senha">Esqueci minha senha</Link>
          <Link href="/cadastro">Criar uma conta</Link>
        </div>
      ) : null}

      {isSignup || isReset || isUpdate ? (
        <div className="auth-links auth-links--center">
          <Link href="/entrar">Voltar para o login</Link>
        </div>
      ) : null}
    </form>
  );
}
