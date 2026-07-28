"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { AuthActionState } from "@/types/auth";

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function safeNext(value: string, fallback = "/membros") {
  return value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

async function getOrigin() {
  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  const host = forwardedHost ?? requestHeaders.get("host") ?? "localhost:3000";
  const forwardedProto = requestHeaders.get("x-forwarded-proto");
  const protocol = forwardedProto ?? (host.includes("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}

export async function loginAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = readText(formData, "email");
  const password = readText(formData, "password");
  const next = safeNext(readText(formData, "next"));

  if (!email || !password) {
    return { error: "Informe seu e-mail e sua senha." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Não foi possível entrar. Confira o e-mail, a senha e a confirmação da conta." };
  }

  revalidatePath("/", "layout");
  redirect(next);
}

export async function signupAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const fullName = readText(formData, "fullName");
  const email = readText(formData, "email");
  const password = readText(formData, "password");
  const passwordConfirmation = readText(formData, "passwordConfirmation");

  if (!fullName || !email || !password) {
    return { error: "Preencha nome, e-mail e senha." };
  }

  if (password.length < 8) {
    return { error: "A senha precisa ter pelo menos 8 caracteres." };
  }

  if (password !== passwordConfirmation) {
    return { error: "As senhas informadas não são iguais." };
  }

  const origin = await getOrigin();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${origin}/auth/confirm?next=/membros`,
    },
  });

  if (error) {
    return { error: "Não foi possível criar a conta. Verifique os dados ou tente outro e-mail." };
  }

  if (!data.session) {
    return {
      success: "Conta criada. Abra o e-mail de confirmação para liberar o acesso.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/membros");
}

export async function requestPasswordResetAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = readText(formData, "email");

  if (!email) {
    return { error: "Informe o e-mail cadastrado." };
  }

  const origin = await getOrigin();
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=/atualizar-senha`,
  });

  if (error) {
    return { error: "Não foi possível solicitar a redefinição agora." };
  }

  return {
    success: "Enviamos as instruções para o e-mail informado, caso ele esteja cadastrado.",
  };
}

export async function updatePasswordAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const password = readText(formData, "password");
  const passwordConfirmation = readText(formData, "passwordConfirmation");

  if (password.length < 8) {
    return { error: "A nova senha precisa ter pelo menos 8 caracteres." };
  }

  if (password !== passwordConfirmation) {
    return { error: "As senhas informadas não são iguais." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: "Não foi possível atualizar a senha. Solicite um novo link." };
  }

  return { success: "Senha atualizada. Você já pode acessar sua conta." };
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/entrar");
}
