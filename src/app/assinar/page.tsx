import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Área VIP",
  description: "Assinatura e benefícios do JNE App VIP.",
};

export default function SubscribeRedirectPage() {
  redirect("/vip#assinar");
}
