import type { AnalysisResult, Drop, ItemEV } from "@/types";

const MARKETPLACE_TAX = 0.1;
const GOLD_ITEM_NAME = "Gold";
const MAGIC_ESSENCE_ITEM_NAME = "Magic Essence";

type PriceMap = Map<string, { goldPrice: number | null; sbPrice: number | null }>;

/**
 * Calculate expected value for a list of drops against market prices.
 * Optionally includes Discord OTC prices for comparison.
 */
export function calculateEV(
  drops: Drop[],
  prices: PriceMap,
  sbRate: number,
  otcPrices?: Map<string, number>,
): Omit<AnalysisResult, "convertibleName" | "leechCostSB"> {
  const items: ItemEV[] = [];
  const warnings: string[] = [];
  let totalEvGold = 0;
  let totalEvSB = 0;
  let goldItemEvGold = 0;

  // Discord comparison accumulators
  let discordCoveredEvSB = 0;
  let marketCoveredEvSB = 0;
  let discordItemCount = 0;

  for (const drop of drops) {
    const item = calculateItemEV(drop, prices, sbRate, warnings, otcPrices);
    items.push(item);
    totalEvGold += item.evGold;
    totalEvSB += item.evSB;
    if (drop.itemName === GOLD_ITEM_NAME) {
      goldItemEvGold += item.evGold;
    }

    // Track Discord vs marketplace for items with OTC data
    if (item.discordSbPrice != null && !item.nonTradeable && !item.unmapped) {
      discordItemCount++;
      discordCoveredEvSB += item.discordEvSB;
      marketCoveredEvSB += item.evSB;
    }
  }

  // Sort: tradeable items desc by Gold EV, then non-tradeable/unmapped at bottom
  items.sort((a, b) => {
    const aActive = !a.nonTradeable && !a.unmapped;
    const bActive = !b.nonTradeable && !b.unmapped;
    if (aActive !== bActive) return aActive ? -1 : 1;
    return b.evGold - a.evGold;
  });

  const goldExemptEvSB = sbRate > 0 ? goldItemEvGold / sbRate : 0;

  return {
    items,
    totalEvGold,
    totalEvSB,
    totalEvGoldAfterTax:
      goldItemEvGold + (totalEvGold - goldItemEvGold) * (1 - MARKETPLACE_TAX),
    totalEvSBAfterTax:
      goldExemptEvSB + (totalEvSB - goldExemptEvSB) * (1 - MARKETPLACE_TAX),
    sbRate,
    warnings,
    discordCoveredEvSB,
    marketCoveredEvSB,
    discordItemCount,
  };
}

function calculateItemEV(
  drop: Drop,
  prices: PriceMap,
  sbRate: number,
  warnings: string[],
  otcPrices?: Map<string, number>,
): ItemEV {
  const base = {
    itemName: drop.itemName,
    dropChance: drop.dropChance,
    avgQuantity: drop.avgQuantity,
    minQuantity: drop.minQuantity,
    maxQuantity: drop.maxQuantity,
  };

  const discordSbPrice = otcPrices?.get(drop.itemName) ?? null;
  const discordEvSB =
    discordSbPrice != null
      ? drop.dropChance * drop.avgQuantity * discordSbPrice
      : 0;

  // Gold: 1 Gold = 1 Gold, tax-exempt
  if (drop.itemName === GOLD_ITEM_NAME) {
    const evGold = drop.dropChance * drop.avgQuantity;
    return {
      ...base,
      goldPrice: 1,
      sbPrice: sbRate > 0 ? 1.0 / sbRate : null,
      evGold,
      evSB: sbRate > 0 ? evGold / sbRate : 0,
      unmapped: false,
      nonTradeable: false,
      discordSbPrice: null,
      discordEvSB: 0,
    };
  }

  // Magic Essence: 1 unit = 1 SB
  if (drop.itemName === MAGIC_ESSENCE_ITEM_NAME) {
    const evSB = drop.dropChance * drop.avgQuantity;
    const evGold = evSB * sbRate;
    return {
      ...base,
      goldPrice: sbRate > 0 ? Math.round(sbRate) : null,
      sbPrice: 1.0,
      evGold,
      evSB,
      unmapped: false,
      nonTradeable: false,
      discordSbPrice: null,
      discordEvSB: 0,
    };
  }

  // Not in price map → non-tradeable
  const price = prices.get(drop.itemName);
  if (!price) {
    return {
      ...base,
      goldPrice: null,
      sbPrice: null,
      evGold: 0,
      evSB: 0,
      unmapped: false,
      nonTradeable: true,
      discordSbPrice,
      discordEvSB,
    };
  }

  // In price map but no price → unmapped
  if (price.goldPrice == null || price.goldPrice === 0) {
    warnings.push(
      `No price for '${drop.itemName}' — skipped in EV calculation`,
    );
    return {
      ...base,
      goldPrice: null,
      sbPrice: null,
      evGold: 0,
      evSB: 0,
      unmapped: true,
      nonTradeable: false,
      discordSbPrice,
      discordEvSB,
    };
  }

  // Standard tradeable item
  const evGold = drop.dropChance * drop.avgQuantity * price.goldPrice;
  return {
    ...base,
    goldPrice: price.goldPrice,
    sbPrice: price.sbPrice,
    evGold,
    evSB: sbRate > 0 ? evGold / sbRate : 0,
    unmapped: false,
    nonTradeable: false,
    discordSbPrice,
    discordEvSB,
  };
}
