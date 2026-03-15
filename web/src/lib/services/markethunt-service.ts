import type { MarketItem } from "@/types";
import { httpGet } from "./http-client";

const MARKETHUNT_BASE = "https://api.markethunt.win";

/** Raw MarketHunt item response */
interface MarketHuntEntry {
  item_info: {
    item_id: number;
    name: string;
    currently_tradeable: boolean;
  };
  latest_market_data: {
    price: number | null;
    sb_price: number | null;
    volume: number | null;
  } | null;
}

export class MarketHuntService {
  /** Fetch all marketplace items with latest prices. */
  async getAllItems(signal?: AbortSignal): Promise<MarketItem[]> {
    const raw = await httpGet<MarketHuntEntry[]>(
      MARKETHUNT_BASE,
      "/items",
      { signal },
    );
    return raw.map(MarketHuntService.flattenItem);
  }

  /** Derive the SB rate from a list of market items. Pure function. */
  static getSBRate(items: MarketItem[]): number {
    const sb = items.find(
      (item) =>
        item.name === "SUPER|brie+" &&
        item.goldPrice != null &&
        item.sbPrice != null &&
        item.sbPrice > 0,
    );
    if (sb) {
      return sb.goldPrice! / sb.sbPrice!;
    }
    throw new Error(
      "Could not derive SB rate: SUPER|brie+ not found or has no price",
    );
  }

  /** Build a price lookup map keyed by item name. Pure function. */
  static buildPriceMap(
    items: MarketItem[],
  ): Map<string, { goldPrice: number | null; sbPrice: number | null }> {
    const map = new Map<
      string,
      { goldPrice: number | null; sbPrice: number | null }
    >();
    for (const item of items) {
      map.set(item.name, {
        goldPrice: item.goldPrice,
        sbPrice: item.sbPrice,
      });
    }
    return map;
  }

  /** Flatten a raw MarketHunt response entry into our MarketItem type. */
  private static flattenItem(entry: MarketHuntEntry): MarketItem {
    const info = entry.item_info;
    const market = entry.latest_market_data;
    return {
      itemId: info.item_id,
      name: info.name,
      currentlyTradeable: info.currently_tradeable,
      goldPrice: market?.price ?? null,
      sbPrice: market?.sb_price ?? null,
      volume: market?.volume ?? null,
    };
  }
}
