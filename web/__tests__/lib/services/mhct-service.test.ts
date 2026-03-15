import { describe, it, expect, vi, beforeEach } from "vitest";
import { MhctService } from "@/lib/services/mhct-service";
import * as httpClient from "@/lib/services/http-client";

vi.mock("@/lib/services/http-client");

const mockHttpGet = vi.mocked(httpClient.httpGet);

describe("MhctService", () => {
  let service: MhctService;

  beforeEach(() => {
    service = new MhctService();
    vi.clearAllMocks();
  });

  describe("listConvertibles", () => {
    it("fetches all convertibles and maps response", async () => {
      mockHttpGet.mockResolvedValue([
        { id: 100, value: "Rare Treasure Chest" },
        { id: 200, value: "Relic Hunter Treasure Chest" },
      ]);

      const result = await service.listConvertibles();

      expect(mockHttpGet).toHaveBeenCalledWith(
        "https://www.mhct.win",
        "/searchByItem.php",
        { params: { item_id: "all", item_type: "convertible" } },
      );
      expect(result).toEqual([
        { id: 100, name: "Rare Treasure Chest" },
        { id: 200, name: "Relic Hunter Treasure Chest" },
      ]);
    });
  });

  describe("getDrops", () => {
    it("fetches drops and derives drop_chance and avg_quantity", async () => {
      mockHttpGet.mockResolvedValue([
        {
          item: "Gold",
          single_opens: 1000,
          times_with_any: 800,
          total_quantity_when_any: 4000,
          min_item_quantity: 1,
          max_item_quantity: 10,
        },
        {
          item: "SUPER|brie+",
          single_opens: 1000,
          times_with_any: 500,
          total_quantity_when_any: 1500,
          min_item_quantity: 1,
          max_item_quantity: 5,
        },
      ]);

      const result = await service.getDrops(100);

      expect(mockHttpGet).toHaveBeenCalledWith(
        "https://www.mhct.win",
        "/searchByItem.php",
        { params: { item_id: "100", item_type: "convertible" } },
      );
      expect(result).toEqual([
        {
          itemName: "Gold",
          dropChance: 0.8,
          avgQuantity: 5,
          minQuantity: 1,
          maxQuantity: 10,
        },
        {
          itemName: "SUPER|brie+",
          dropChance: 0.5,
          avgQuantity: 3,
          minQuantity: 1,
          maxQuantity: 5,
        },
      ]);
    });

    it("skips drops with zero single_opens or times_with_any", async () => {
      mockHttpGet.mockResolvedValue([
        {
          item: "Gold",
          single_opens: 1000,
          times_with_any: 800,
          total_quantity_when_any: 4000,
          min_item_quantity: 1,
          max_item_quantity: 10,
        },
        {
          item: "Bad Item",
          single_opens: 0,
          times_with_any: 0,
          total_quantity_when_any: 0,
        },
      ]);

      const result = await service.getDrops(100);

      expect(result).toHaveLength(1);
      expect(result[0].itemName).toBe("Gold");
    });
  });

  describe("searchConvertibles", () => {
    it("filters convertible list by case-insensitive substring", () => {
      const convertibles = [
        { id: 100, name: "Rare Treasure Chest" },
        { id: 200, name: "Relic Hunter Treasure Chest" },
        { id: 300, name: "Arduous Treasure Chest" },
      ];

      const result = MhctService.searchConvertibles(convertibles, "relic");

      expect(result).toEqual([
        { id: 200, name: "Relic Hunter Treasure Chest" },
      ]);
    });

    it("returns all convertibles for empty query", () => {
      const convertibles = [
        { id: 100, name: "Rare Treasure Chest" },
        { id: 200, name: "Relic Hunter Treasure Chest" },
      ];

      const result = MhctService.searchConvertibles(convertibles, "");

      expect(result).toEqual(convertibles);
    });
  });
});
