"use client";

import { ArrowLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

type SmartBackButtonProps = {
  fallbackHref?: string;
  label?: string;
  className?: string;
};

const PREVIOUS_PATH_KEY = "jne-previous-path";

export function SmartBackButton({
  fallbackHref = "/",
  label = "Voltar",
  className = "text-link",
}: SmartBackButtonProps) {
  const pathname = usePathname();
  const router = useRouter();

  function goBack() {
    let previousPath = "";

    try {
      previousPath = window.sessionStorage.getItem(PREVIOUS_PATH_KEY) ?? "";
    } catch {
      previousPath = "";
    }

    if (previousPath && previousPath !== pathname && window.history.length > 1) {
      router.back();
      return;
    }

    router.push(fallbackHref);
  }

  return (
    <button
      className={`smart-back-button ${className}`.trim()}
      type="button"
      onClick={goBack}
      aria-label={label}
    >
      <ArrowLeft size={17} />
      <span>{label}</span>
    </button>
  );
}
