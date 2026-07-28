export const themeIds = ["dark", "light", "red", "green", "blue"] as const;

export type ThemeId = (typeof themeIds)[number];

export const DEFAULT_THEME: ThemeId = "dark";
export const THEME_STORAGE_KEY = "jne-app-theme";

export const themes: Array<{
  id: ThemeId;
  label: string;
  color: string;
  lightDot?: boolean;
}> = [
  { id: "dark", label: "Escuro", color: "#050505" },
  { id: "light", label: "Claro", color: "#f1f5f9", lightDot: true },
  { id: "red", label: "Vermelho", color: "#7f1d1d" },
  { id: "green", label: "Verde", color: "#14532d" },
  { id: "blue", label: "Azul", color: "#1e3a5f" },
];

export function isThemeId(value: string | null | undefined): value is ThemeId {
  return themeIds.includes(value as ThemeId);
}
