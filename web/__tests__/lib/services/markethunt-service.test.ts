import { describe, it, expect, vi, beforeEach } from "vitest";
import { MarketHuntService } from "@/lib/services/markethunt-service";
import * as httpClient from "@/lib/services/http-client";

vi.mock("@/lib/services/http-client");

const mockHttpGet = vi.mocked(httpClient.httpGet);

describe("MarketHuntService", () => {
  let service: MarketHuntService;

  beforeEach(() => {
    service = new MarketHuntService();
    vi.clearAllMocks();
  });

  describe("getAllItems", () => {
    it("fetches and flattens all marketplace items", async () => {
      mockHttpGet.mockResolvedValue([
        {
          item_info: {
            item_id: 1,
            name: "SUPER|brie+",
            currently_tradeable: true,
          },
          latest_market_data: {
            price: 16000,
            sb_price: 1.0,
            volume: 500,
          },
        },
        {
          item_info: {
            item_id: 2,
            name: "Rift Circuitry",
            currently_tradeable: true,
          },
          latest_market_data: {
            price: 8200,
            sb_price: 0.51,
            volume: 120,
          },
        },
      ]);

      const result = await service.getAllItems();

      expect(mockHttpGet).toHaveBeenCalledWith(
        "https://api.markethunt.win",
        "/items",
        expect.any(Object),
      );
      expect(result).toEqual([
        {
          itemId: 1,
          name: "SUPER|brie+",
          goldPrice: 16000,
          sbPrice: 1.0,
          volume: 500,
          currentlyTradeable: true,
        },
        {
          itemId: 2,
          name: "Rift Circuitry",
          goldPrice: 8200,
          sbPrice: 0.51,
          volume: 120,
          currentlyTradeable: true,
        },
      ]);
    });

    it("handles items with null latest_market_data", async () => {
      mockHttpGet.mockResolvedValue([
        {
          item_info: { item_id: 1, name: "Retired Item", currently_tradeable: false },
          latest_market_data: null,
        },
      ]);

      const result = await service.getAllItems();

      expect(result[0]).toEqual({
        itemId: 1,
        name: "Retired Item",
        goldPrice: null,
        sbPrice: null,
        volume: null,
        currentlyTradeable: false,
      });
    });
  });

  describe("getSBRate", () => {
    it("derives SB rate from SUPER|brie+ price", () => {
      const items = [
        { itemId: 1, name: "SUPER|brie+", goldPrice: 16000, sbPrice: 1.0, volume: 500, currentlyTradeable: true },
        { itemId: 2, name: "Other Item", goldPrice: 100, sbPrice: 0.01, volume: 10, currentlyTradeable: true },
      ];

      const rate = MarketHuntService.getSBRate(items);

      expect(rate).toBe(16000);
    });

    it("throws if SUPER|brie+ not found", () => {
      const items = [
        { itemId: 2, name: "Other Item", goldPrice: 100, sbPrice: null, volume: 10, currentlyTradeable: true },
      ];

      expect(() => MarketHuntService.getSBRate(items)).toThrow(
        "Could not derive SB rate",
      );
    });
  });
});
