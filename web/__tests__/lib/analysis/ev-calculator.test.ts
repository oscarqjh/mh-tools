import { describe, it, expect } from "vitest";
import { calculateEV } from "@/lib/analysis/ev-calculator";
import type { Drop } from "@/types";

const MOCK_SB_RATE = 16000;

function makePriceMap(
  entries: Record<string, { goldPrice: number | null; sbPrice: number | null }>,
) {
  return new Map(Object.entries(entries));
}

describe("calculateEV", () => {
  it("calculates EV for standard tradeable items", () => {
    const drops: Drop[] = [
      { itemName: "Rift Circuitry", dropChance: 0.5, avgQuantity: 2, minQuantity: 1, maxQuantity: 4 },
    ];
    const prices = makePriceMap({
      "Rift Circuitry": { goldPrice: 8200, sbPrice: 0.51 },
    });

    const result = calculateEV(drops, prices, MOCK_SB_RATE);

    expect(result.items).toHaveLength(1);
    expect(result.items[0].evGold).toBe(0.5 * 2 * 8200); // 8200
    expect(result.items[0].evSB).toBeCloseTo(8200 / 16000);
    expect(result.items[0].nonTradeable).toBe(false);
    expect(result.items[0].unmapped).toBe(false);
  });

  it("handles Gold as tax-exempt with 1:1 gold value", () => {
    const drops: Drop[] = [
      { itemName: "Gold", dropChance: 1.0, avgQuantity: 5000, minQuantity: 1000, maxQuantity: 10000 },
    ];
    const prices = makePriceMap({});

    const result = calculateEV(drops, prices, MOCK_SB_RATE);

    expect(result.items[0].evGold).toBe(5000);
    expect(result.items[0].evSB).toBeCloseTo(5000 / 16000);
    expect(result.items[0].goldPrice).toBe(1);
  });

  it("handles Magic Essence as 1 SB per unit", () => {
    const drops: Drop[] = [
      { itemName: "Magic Essence", dropChance: 0.5, avgQuantity: 10, minQuantity: 1, maxQuantity: 20 },
    ];
    const prices = makePriceMap({});

    const result = calculateEV(drops, prices, MOCK_SB_RATE);

    expect(result.items[0].evSB).toBe(0.5 * 10); // 5
    expect(result.items[0].evGold).toBe(5 * 16000); // 80000
    expect(result.items[0].sbPrice).toBe(1.0);
  });

  it("treats items not in price map as non-tradeable", () => {
    const drops: Drop[] = [
      { itemName: "Untradeable Widget", dropChance: 0.3, avgQuantity: 1, minQuantity: 1, maxQuantity: 1 },
    ];
    const prices = makePriceMap({});

    const result = calculateEV(drops, prices, MOCK_SB_RATE);

    expect(result.items[0].evGold).toBe(0);
    expect(result.items[0].evSB).toBe(0);
    expect(result.items[0].nonTradeable).toBe(true);
  });

  it("treats items with null gold_price as unmapped with warning", () => {
    const drops: Drop[] = [
      { itemName: "Weird Item", dropChance: 0.5, avgQuantity: 1, minQuantity: 1, maxQuantity: 1 },
    ];
    const prices = makePriceMap({
      "Weird Item": { goldPrice: null, sbPrice: null },
    });

    const result = calculateEV(drops, prices, MOCK_SB_RATE);

    expect(result.items[0].evGold).toBe(0);
    expect(result.items[0].unmapped).toBe(true);
    expect(result.warnings).toContain(
      "No price for 'Weird Item' — skipped in EV calculation",
    );
  });

  it("computes after-tax totals with Gold exempt", () => {
    const drops: Drop[] = [
      { itemName: "Gold", dropChance: 1.0, avgQuantity: 1000, minQuantity: 500, maxQuantity: 2000 },
      { itemName: "Rift Circuitry", dropChance: 1.0, avgQuantity: 1, minQuantity: 1, maxQuantity: 1 },
    ];
    const prices = makePriceMap({
      "Rift Circuitry": { goldPrice: 10000, sbPrice: 0.625 },
    });

    const result = calculateEV(drops, prices, MOCK_SB_RATE);

    // Gold EV = 1000 (tax-exempt)
    // Rift EV = 10000
    // Total pre-tax gold = 11000
    // After tax gold = 1000 + (10000 * 0.9) = 10000
    expect(result.totalEvGold).toBe(11000);
    expect(result.totalEvGoldAfterTax).toBe(10000);

    // SB equivalents
    const goldEvSB = 1000 / 16000;
    const riftEvSB = 10000 / 16000;
    expect(result.totalEvSB).toBeCloseTo(goldEvSB + riftEvSB);
    // After tax SB = goldEvSB + (riftEvSB * 0.9)
    expect(result.totalEvSBAfterTax).toBeCloseTo(
      goldEvSB + riftEvSB * 0.9,
    );
  });

  it("includes Discord OTC prices when provided", () => {
    const drops: Drop[] = [
      { itemName: "Rift Circuitry", dropChance: 0.5, avgQuantity: 2, minQuantity: 1, maxQuantity: 4 },
      { itemName: "Rift Mist", dropChance: 0.8, avgQuantity: 3, minQuantity: 1, maxQuantity: 5 },
    ];
    const prices = makePriceMap({
      "Rift Circuitry": { goldPrice: 8200, sbPrice: 0.5125 },
      "Rift Mist": { goldPrice: 500, sbPrice: 0.03125 },
    });
    const otcPrices = new Map([
      ["Rift Circuitry", 0.6], // Discord price is higher than marketplace
    ]);

    const result = calculateEV(drops, prices, MOCK_SB_RATE, otcPrices);

    // Rift Circuitry has Discord price
    const circuitry = result.items.find((i) => i.itemName === "Rift Circuitry")!;
    expect(circuitry.discordSbPrice).toBe(0.6);
    expect(circuitry.discordEvSB).toBe(0.5 * 2 * 0.6);

    // Rift Mist has no Discord price
    const mist = result.items.find((i) => i.itemName === "Rift Mist")!;
    expect(mist.discordSbPrice).toBeNull();
    expect(mist.discordEvSB).toBe(0);

    // Discord comparison stats
    expect(result.discordItemCount).toBe(1);
    expect(result.discordCoveredEvSB).toBeCloseTo(0.5 * 2 * 0.6);
    expect(result.marketCoveredEvSB).toBeCloseTo((0.5 * 2 * 8200) / 16000);
  });

  it("returns zero discord stats when no OTC prices provided", () => {
    const drops: Drop[] = [
      { itemName: "Rift Circuitry", dropChance: 0.5, avgQuantity: 2, minQuantity: 1, maxQuantity: 4 },
    ];
    const prices = makePriceMap({
      "Rift Circuitry": { goldPrice: 8200, sbPrice: 0.51 },
    });

    const result = calculateEV(drops, prices, MOCK_SB_RATE);

    expect(result.discordItemCount).toBe(0);
    expect(result.discordCoveredEvSB).toBe(0);
    expect(result.marketCoveredEvSB).toBe(0);
    expect(result.items[0].discordSbPrice).toBeNull();
    expect(result.items[0].discordEvSB).toBe(0);
  });

  it("sorts items: tradeable desc by Gold EV, then non-tradeable", () => {
    const drops: Drop[] = [
      { itemName: "Non-trade", dropChance: 0.5, avgQuantity: 1, minQuantity: 1, maxQuantity: 1 },
      { itemName: "Cheap Item", dropChance: 1.0, avgQuantity: 1, minQuantity: 1, maxQuantity: 1 },
      { itemName: "Expensive Item", dropChance: 1.0, avgQuantity: 1, minQuantity: 1, maxQuantity: 1 },
    ];
    const prices = makePriceMap({
      "Cheap Item": { goldPrice: 100, sbPrice: 0.01 },
      "Expensive Item": { goldPrice: 10000, sbPrice: 0.63 },
    });

    const result = calculateEV(drops, prices, MOCK_SB_RATE);

    expect(result.items[0].itemName).toBe("Expensive Item");
    expect(result.items[1].itemName).toBe("Cheap Item");
    expect(result.items[2].itemName).toBe("Non-trade");
    expect(result.items[2].nonTradeable).toBe(true);
  });
});
