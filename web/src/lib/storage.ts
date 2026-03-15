import type { UserSettings, AnalyserConfigs } from "@/types";

const STORAGE_KEY = "gnawniaverse";
const REFRESH_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

const DEFAULT_SETTINGS: UserSettings = {
  theme: "arcane-hunt",
  analyserConfigs: {
    favorites: [],
    lastPriceRefresh: null,
  },
};

export class StorageService {
  private read(): UserSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_SETTINGS };
      const parsed = JSON.parse(raw) as { user?: Partial<UserSettings> };
      return {
        theme: parsed.user?.theme ?? DEFAULT_SETTINGS.theme,
        analyserConfigs: {
          ...DEFAULT_SETTINGS.analyserConfigs,
          ...parsed.user?.analyserConfigs,
        },
      };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  private write(settings: UserSettings): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: settings }));
  }

  private updateConfigs(
    updater: (configs: AnalyserConfigs) => AnalyserConfigs,
  ): void {
    const settings = this.read();
    settings.analyserConfigs = updater(settings.analyserConfigs);
    this.write(settings);
  }

  // Theme
  getTheme(): string {
    return this.read().theme;
  }

  setTheme(theme: string): void {
    const settings = this.read();
    settings.theme = theme;
    this.write(settings);
  }

  // Favorites
  getFavorites(): string[] {
    return this.read().analyserConfigs.favorites;
  }

  addFavorite(name: string): void {
    this.updateConfigs((configs) => {
      if (configs.favorites.includes(name)) return configs;
      return { ...configs, favorites: [...configs.favorites, name] };
    });
  }

  removeFavorite(name: string): void {
    this.updateConfigs((configs) => ({
      ...configs,
      favorites: configs.favorites.filter((f) => f !== name),
    }));
  }

  isFavorite(name: string): boolean {
    return this.getFavorites().includes(name);
  }

  // Refresh cooldown
  canRefreshPrices(): boolean {
    return this.getRefreshCooldownRemaining() === 0;
  }

  getRefreshCooldownRemaining(): number {
    const last = this.read().analyserConfigs.lastPriceRefresh;
    if (!last) return 0;
    const elapsed = Date.now() - new Date(last).getTime();
    return Math.max(0, Math.ceil((REFRESH_COOLDOWN_MS - elapsed) / 1000));
  }

  markPriceRefresh(): void {
    this.updateConfigs((configs) => ({
      ...configs,
      lastPriceRefresh: new Date().toISOString(),
    }));
  }
}
