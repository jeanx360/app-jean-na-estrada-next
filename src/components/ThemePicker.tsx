"use client";

import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import {
  DEFAULT_THEME,
  isThemeId,
  THEME_STORAGE_KEY,
  themes,
  type ThemeId,
} from "@/data/themes";

const themeColors: Record<ThemeId, string> = {
  dark: "#050505",
  light: "#f8fafc",
  red: "#0c0506",
  green: "#030d07",
  blue: "#020c1b",
};

function applyTheme(theme: ThemeId) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme === "light" ? "light" : "dark";

  const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  themeColor?.setAttribute("content", themeColors[theme]);
}

export function ThemePicker() {
  const [currentTheme, setCurrentTheme] = useState<ThemeId>(DEFAULT_THEME);

  useEffect(() => {
    const themeFromDocument = document.documentElement.dataset.theme;
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    const initialTheme = isThemeId(themeFromDocument)
      ? themeFromDocument
      : isThemeId(storedTheme)
        ? storedTheme
        : DEFAULT_THEME;

    setCurrentTheme(initialTheme);
    applyTheme(initialTheme);
  }, []);

  function selectTheme(theme: ThemeId) {
    setCurrentTheme(theme);
    applyTheme(theme);
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }

  return (
    <div className="theme-picker" role="group" aria-label="Escolher tema do aplicativo">
      {themes.map((theme) => {
        const active = currentTheme === theme.id;

        return (
          <button
            key={theme.id}
            className={`theme-picker__button ${active ? "is-active" : ""}`}
            style={{ backgroundColor: theme.color }}
            type="button"
            title={`Tema ${theme.label}`}
            aria-label={`Usar tema ${theme.label}`}
            aria-pressed={active}
            onClick={() => selectTheme(theme.id)}
          >
            {active ? (
              <Check
                size={12}
                strokeWidth={3}
                className={theme.lightDot ? "theme-picker__check--dark" : undefined}
                aria-hidden="true"
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
