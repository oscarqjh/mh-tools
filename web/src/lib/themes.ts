import type { ThemeTokens } from "@/types";

export const themes: ThemeTokens[] = [
  {
    id: "arcane-hunt",
    name: "Arcane Hunt",
    tokens: {
      "--bg-primary": "#0c1521",
      "--bg-secondary": "rgba(15, 25, 40, 0.85)",
      "--bg-tertiary": "rgba(255, 255, 255, 0.04)",
      "--bg-card": "rgba(20, 32, 52, 0.65)",
      "--bg-card-hover": "rgba(25, 40, 60, 0.8)",
      "--border": "rgba(255, 255, 255, 0.08)",
      "--border-subtle": "rgba(255, 255, 255, 0.04)",
      "--text-primary": "#e2e0dc",
      "--text-secondary": "#8b98a8",
      "--text-muted": "#4a5568",
      "--accent": "#f0b232",
      "--accent-hover": "#f5c452",
      "--accent-subtle": "rgba(240, 178, 50, 0.12)",
      "--gold": "#f0b232",
      "--sb": "#7c9aff",
      "--warning": "#f59e0b",
      "--error": "#f85149",
      "--glow-gold": "0 0 20px rgba(240, 178, 50, 0.15)",
      "--glow-blue": "0 0 20px rgba(124, 154, 255, 0.15)",
      "--discord": "#5865f2",
      "--profit": "#10b981",
      "--glow-discord": "0 0 16px rgba(88, 101, 242, 0.2)",
      "--glow-profit": "0 0 16px rgba(16, 185, 129, 0.2)",
    },
  },
  {
    id: "dark-parchment",
    name: "Dark Parchment",
    tokens: {
      "--bg-primary": "#1a0f0a",
      "--bg-secondary": "rgba(44, 24, 16, 0.85)",
      "--bg-tertiary": "rgba(0, 0, 0, 0.3)",
      "--bg-card": "rgba(44, 24, 16, 0.65)",
      "--bg-card-hover": "rgba(55, 30, 20, 0.8)",
      "--border": "rgba(92, 58, 30, 0.5)",
      "--border-subtle": "rgba(92, 58, 30, 0.25)",
      "--text-primary": "#d4c4a0",
      "--text-secondary": "#a0845c",
      "--text-muted": "#6b5638",
      "--accent": "#e3b341",
      "--accent-hover": "#f0c45c",
      "--accent-subtle": "rgba(196, 148, 58, 0.15)",
      "--gold": "#e3b341",
      "--sb": "#58a6ff",
      "--warning": "#f59e0b",
      "--error": "#f85149",
      "--glow-gold": "0 0 20px rgba(227, 179, 65, 0.15)",
      "--glow-blue": "0 0 20px rgba(88, 166, 255, 0.15)",
      "--discord": "#5865f2",
      "--profit": "#10b981",
      "--glow-discord": "0 0 16px rgba(88, 101, 242, 0.2)",
      "--glow-profit": "0 0 16px rgba(16, 185, 129, 0.2)",
    },
  },
  {
    id: "light-parchment",
    name: "Light Parchment",
    tokens: {
      "--bg-primary": "#f4e8d1",
      "--bg-secondary": "rgba(255, 255, 255, 0.5)",
      "--bg-tertiary": "rgba(0, 0, 0, 0.04)",
      "--bg-card": "rgba(255, 255, 255, 0.6)",
      "--bg-card-hover": "rgba(255, 255, 255, 0.8)",
      "--border": "rgba(196, 168, 130, 0.5)",
      "--border-subtle": "rgba(196, 168, 130, 0.25)",
      "--text-primary": "#3d2317",
      "--text-secondary": "#6b4423",
      "--text-muted": "#a0916e",
      "--accent": "#8b6914",
      "--accent-hover": "#a07d1a",
      "--accent-subtle": "rgba(139, 105, 20, 0.1)",
      "--gold": "#8b6914",
      "--sb": "#2563eb",
      "--warning": "#d97706",
      "--error": "#dc2626",
      "--glow-gold": "0 0 20px rgba(139, 105, 20, 0.1)",
      "--glow-blue": "0 0 20px rgba(37, 99, 235, 0.1)",
      "--discord": "#4752c4",
      "--profit": "#059669",
      "--glow-discord": "0 0 16px rgba(71, 82, 196, 0.15)",
      "--glow-profit": "0 0 16px rgba(5, 150, 105, 0.15)",
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
