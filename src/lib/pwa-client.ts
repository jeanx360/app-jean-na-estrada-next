const INSTALLED_STORAGE_KEY = "jne-app-installed";

type StandaloneNavigator = Navigator & {
  standalone?: boolean;
};

export function isRunningAsInstalledApp() {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    Boolean((navigator as StandaloneNavigator).standalone)
  );
}

export function hasInstalledAppHint() {
  if (typeof window === "undefined") return false;

  try {
    return window.localStorage.getItem(INSTALLED_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function isPwaInstalled() {
  return isRunningAsInstalledApp() || hasInstalledAppHint();
}

export function markPwaInstalled() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(INSTALLED_STORAGE_KEY, "true");
  } catch {
    // A detecção por display-mode continua funcionando quando o armazenamento é bloqueado.
  }
}

export function clearPwaInstalledHint() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(INSTALLED_STORAGE_KEY);
  } catch {
    // Sem ação: o navegador pode bloquear o armazenamento.
  }
}
