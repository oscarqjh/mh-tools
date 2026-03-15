import type { ThemeTokens } from "@/types";

export const themes: ThemeTokens[] = [
  {
    id: "dark-parchment",
    name: "Dark Parchment",
    tokens: {
      "--bg-primary": "#1a0f0a",
      "--bg-secondary": "#2c1810",
      "--bg-tertiary": "rgba(0,0,0,0.3)",
      "--border": "#5c3a1e",
      "--border-subtle": "rgba(92,58,30,0.5)",
      "--text-primary": "#d4c4a0",
      "--text-secondary": "#a0845c",
      "--text-muted": "#6b5638",
      "--accent": "#e3b341",
      "--accent-hover": "#f0c45c",
      "--accent-subtle": "rgba(196,148,58,0.15)",
      "--gold": "#e3b341",
      "--sb": "#58a6ff",
      "--warning": "#f59e0b",
      "--error": "#f85149",
    },
  },
  {
    id: "light-parchment",
    name: "Light Parchment",
    tokens: {
      "--bg-primary": "#f4e8d1",
      "--bg-secondary": "rgba(255,255,255,0.5)",
      "--bg-tertiary": "#ffffff",
      "--border": "#c4a882",
      "--border-subtle": "#e8d5b5",
      "--text-primary": "#3d2317",
      "--text-secondary": "#6b4423",
      "--text-muted": "#a0916e",
      "--accent": "#8b6914",
      "--accent-hover": "#a07d1a",
      "--accent-subtle": "rgba(139,105,20,0.1)",
      "--gold": "#8b6914",
      "--sb": "#2563eb",
      "--warning": "#d97706",
      "--error": "#dc2626",
    },
  },
];

export function getThemeById(id: string): ThemeTokens | undefined {
  return themes.find((t) => t.id === id);
}

export function applyTheme(themeId: string): void {
  const theme = getThemeById(themeId);
  if (!theme) return;
  const root = document.documentElement;
  for (const [key, value] of Object.entries(theme.tokens)) {
    root.style.setProperty(key, value);
  }
  root.setAttribute("data-theme", themeId);
}
