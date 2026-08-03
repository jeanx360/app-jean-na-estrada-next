"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Car, KeyRound, LoaderCircle, LogIn, Mail, Phone, UserRound } from "lucide-react";
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
  const [professionalDriver, setProfessionalDriver] = useState(false);
  const isLogin = mode === "login";
  const isSignup = mode === "signup";
  const isReset = mode === "reset";
  const isUpdate = mode === "update-password";
  const loginHref = `/entrar?next=${encodeURIComponent(next)}`;
  const signupHref = `/cadastro?next=${encodeURIComponent(next)}`;

  return (
    <form className="auth-form" action={formAction}>
      {isLogin || isSignup ? <input type="hidden" name="next" value={next} /> : null}
      {isSignup ? <input type="hidden" name="professionalDriver" value={professionalDriver ? "yes" : "no"} /> : null}

      {isSignup ? (
        <label className="auth-field">
          <span>Seu nome</span>
          <div>
            <UserRound size={18} />
            <input name="fullName" type="text" autoComplete="name" maxLength={80} required placeholder="Como devemos chamar você?" />
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

      {isSignup ? (
        <label className="auth-field">
          <span>WhatsApp com DDD</span>
          <div>
            <Phone size={18} />
            <input name="phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={20} required placeholder="(51) 99999-9999" />
          </div>
          <small>Usaremos somente para sua conta e solicitações de viagem.</small>
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

      {isUpdate ? (
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

      {isSignup ? (
        <fieldset className="auth-driver-choice">
          <legend>Você é motorista profissional?</legend>
          <p>Essa escolha só organiza seu primeiro acesso. Pode ser alterada depois.</p>
          <div>
            <button type="button" className={!professionalDriver ? "is-selected" : ""} onClick={() => setProfessionalDriver(false)}>
              <UserRound size={20} /><span><strong>Não</strong><small>Quero usar como passageiro ou membro</small></span>
            </button>
            <button type="button" className={professionalDriver ? "is-selected" : ""} onClick={() => setProfessionalDriver(true)}>
              <Car size={20} /><span><strong>Sim</strong><small>Quero criar meu perfil profissional</small></span>
            </button>
          </div>
        </fieldset>
      ) : null}

      {isSignup && professionalDriver ? (
        <div className="auth-driver-fields">
          <p><Car size={18} /> Dados essenciais do motorista</p>
          <div className="auth-driver-fields__grid">
            <label className="auth-field">
              <span>Modelo do veículo</span>
              <div><Car size={18} /><input name="vehicleModel" type="text" maxLength={100} required placeholder="Ex.: BYD Dolphin Plus" /></div>
            </label>
            <label className="auth-field">
              <span>Placa</span>
              <div><Car size={18} /><input name="vehiclePlate" type="text" maxLength={10} required autoCapitalize="characters" placeholder="ABC1D23" /></div>
            </label>
          </div>
          <small>O cartão profissional será criado como rascunho. A placa não será exibida ao passageiro.</small>
        </div>
      ) : null}

      {isSignup ? (
        <label className="auth-legal-confirmation">
          <input name="legalAcknowledgement" type="checkbox" required />
          <span>
            Li e concordo com os <Link href="/termos" target="_blank">Termos de Uso</Link> e a <Link href="/privacidade" target="_blank">Política de Privacidade</Link>. O aceite oficial será registrado no primeiro acesso.
          </span>
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
          <Link href={signupHref}>Criar uma conta</Link>
        </div>
      ) : null}

      {isSignup || isReset || isUpdate ? (
        <div className="auth-links auth-links--center">
          <Link href={isSignup ? loginHref : "/entrar"}>Voltar para o login</Link>
        </div>
      ) : null}
    </form>
  );
}
