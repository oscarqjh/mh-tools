import { describe, it, expect, beforeEach, vi } from "vitest";
import { StorageService } from "@/lib/storage";

describe("StorageService", () => {
  let storage: StorageService;
  let mockStorage: Record<string, string>;

  beforeEach(() => {
    mockStorage = {};
    const localStorageMock = {
      getItem: vi.fn((key: string) => mockStorage[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        mockStorage[key] = value;
      }),
    };
    vi.stubGlobal("localStorage", localStorageMock);
    storage = new StorageService();
  });

  describe("theme", () => {
    it("returns default theme when no data stored", () => {
      expect(storage.getTheme()).toBe("dark-parchment");
    });

    it("persists and retrieves theme", () => {
      storage.setTheme("light-parchment");
      expect(storage.getTheme()).toBe("light-parchment");
    });
  });

  describe("favorites", () => {
    it("returns empty array when no favorites stored", () => {
      expect(storage.getFavorites()).toEqual([]);
    });

    it("adds and removes favorites", () => {
      storage.addFavorite("Rare Treasure Chest");
      storage.addFavorite("Relic Hunter Treasure Chest");
      expect(storage.getFavorites()).toEqual([
        "Rare Treasure Chest",
        "Relic Hunter Treasure Chest",
      ]);

      storage.removeFavorite("Rare Treasure Chest");
      expect(storage.getFavorites()).toEqual(["Relic Hunter Treasure Chest"]);
    });

    it("does not add duplicate favorites", () => {
      storage.addFavorite("Rare Treasure Chest");
      storage.addFavorite("Rare Treasure Chest");
      expect(storage.getFavorites()).toEqual(["Rare Treasure Chest"]);
    });

    it("isFavorite returns correct boolean", () => {
      storage.addFavorite("Rare Treasure Chest");
      expect(storage.isFavorite("Rare Treasure Chest")).toBe(true);
      expect(storage.isFavorite("Other Chest")).toBe(false);
    });
  });

  describe("price refresh cooldown", () => {
    it("returns true for canRefreshPrices when no timestamp stored", () => {
      expect(storage.canRefreshPrices()).toBe(true);
    });

    it("returns false within cooldown period", () => {
      storage.markPriceRefresh();
      expect(storage.canRefreshPrices()).toBe(false);
    });

    it("returns remaining cooldown seconds", () => {
      storage.markPriceRefresh();
      const remaining = storage.getRefreshCooldownRemaining();
      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(300);
    });
  });
});
